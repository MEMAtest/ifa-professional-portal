-- ================================================================
-- OPENSIGN SIGNATURE SYSTEM INTEGRATION MIGRATION
-- ================================================================

-- Update signature_requests table for OpenSign integration
ALTER TABLE signature_requests
ADD COLUMN IF NOT EXISTS opensign_document_id TEXT,
ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS auto_reminder BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS remind_once_in_every INTEGER,
ADD COLUMN IF NOT EXISTS merge_certificate BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS certificate_url TEXT,
ADD COLUMN IF NOT EXISTS download_url TEXT,
ADD COLUMN IF NOT EXISTS opensign_metadata JSONB;

-- Update the status enum to include OpenSign statuses
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'signature_status_new') THEN
        CREATE TYPE signature_status_new AS ENUM (
            'draft',
            'sent',
            'viewed',
            'signed',
            'completed',
            'expired',
            'declined'
        );

        ALTER TABLE signature_requests
        ALTER COLUMN status TYPE signature_status_new
        USING status::text::signature_status_new;

        DROP TYPE IF EXISTS signature_status;
        ALTER TYPE signature_status_new RENAME TO signature_status;
    END IF;
END $$;

-- Add index for OpenSign document ID lookups
CREATE INDEX IF NOT EXISTS idx_signature_requests_opensign_document_id
ON signature_requests(opensign_document_id);

-- Add index for status and expiry tracking
CREATE INDEX IF NOT EXISTS idx_signature_requests_status_expires
ON signature_requests(status, expires_at);

-- Update generated_documents table to link with signature_requests
ALTER TABLE generated_documents
ADD COLUMN IF NOT EXISTS signature_request_id UUID REFERENCES signature_requests(id);

-- Create function to sync signature status between tables
CREATE OR REPLACE FUNCTION sync_signature_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Update generated_documents when signature_requests status changes
    IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
        UPDATE generated_documents
        SET
            status = CASE
                WHEN NEW.status IN ('signed', 'completed') THEN 'signed'
                WHEN NEW.status = 'sent' THEN 'sent_for_signature'
                ELSE status
            END,
            signed_at = CASE
                WHEN NEW.status IN ('signed', 'completed') AND OLD.status NOT IN ('signed', 'completed')
                THEN NOW()
                ELSE signed_at
            END,
            sent_at = CASE
                WHEN NEW.status = 'sent' AND OLD.status = 'draft'
                THEN NOW()
                ELSE sent_at
            END
        WHERE signature_request_id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for status synchronization
DROP TRIGGER IF EXISTS trigger_sync_signature_status ON signature_requests;
CREATE TRIGGER trigger_sync_signature_status
    AFTER UPDATE ON signature_requests
    FOR EACH ROW
    EXECUTE FUNCTION sync_signature_status();

-- Add RLS policies for signature_requests
ALTER TABLE signature_requests ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to read their own signature requests
CREATE POLICY "Users can view their own signature requests" ON signature_requests
    FOR SELECT USING (
        auth.uid() IN (
            SELECT user_id FROM generated_documents gd
            WHERE gd.signature_request_id = signature_requests.id
        )
    );

-- Policy for authenticated users to update their own signature requests
CREATE POLICY "Users can update their own signature requests" ON signature_requests
    FOR UPDATE USING (
        auth.uid() IN (
            SELECT user_id FROM generated_documents gd
            WHERE gd.signature_request_id = signature_requests.id
        )
    );

-- Policy for authenticated users to insert signature requests
CREATE POLICY "Users can create signature requests" ON signature_requests
    FOR INSERT WITH CHECK (true);

-- Update existing signature_requests to link with generated_documents
UPDATE signature_requests sr
SET document_id = gd.id
FROM generated_documents gd
WHERE sr.document_id::text = gd.id::text
AND sr.document_id IS NOT NULL
AND sr.document_id != '';

-- Add webhook_events table for OpenSign webhook tracking
CREATE TABLE IF NOT EXISTS signature_webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    signature_request_id UUID REFERENCES signature_requests(id),
    opensign_document_id TEXT,
    event_type TEXT NOT NULL,
    event_data JSONB,
    processed BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- Index for webhook event processing
CREATE INDEX IF NOT EXISTS idx_webhook_events_unprocessed
ON signature_webhook_events(processed, created_at)
WHERE processed = false;

-- Index for OpenSign document ID lookups
CREATE INDEX IF NOT EXISTS idx_webhook_events_opensign_document_id
ON signature_webhook_events(opensign_document_id);

-- RLS for webhook_events
ALTER TABLE signature_webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage webhook events" ON signature_webhook_events
    FOR ALL USING (auth.role() = 'service_role');

-- Function to process webhook events
CREATE OR REPLACE FUNCTION process_signature_webhook(
    p_opensign_document_id TEXT,
    p_event_type TEXT,
    p_event_data JSONB
)
RETURNS JSONB AS $$
DECLARE
    v_signature_request_id UUID;
    v_webhook_event_id UUID;
    v_new_status signature_status;
    v_result JSONB;
BEGIN
    -- Insert webhook event
    INSERT INTO signature_webhook_events (
        opensign_document_id,
        event_type,
        event_data
    ) VALUES (
        p_opensign_document_id,
        p_event_type,
        p_event_data
    ) RETURNING id INTO v_webhook_event_id;

    -- Find corresponding signature request
    SELECT id INTO v_signature_request_id
    FROM signature_requests
    WHERE opensign_document_id = p_opensign_document_id;

    IF v_signature_request_id IS NULL THEN
        v_result := jsonb_build_object(
            'success', false,
            'error', 'Signature request not found',
            'webhook_event_id', v_webhook_event_id
        );
    ELSE
        -- Update signature request ID in webhook event
        UPDATE signature_webhook_events
        SET signature_request_id = v_signature_request_id
        WHERE id = v_webhook_event_id;

        -- Determine new status based on event type
        v_new_status := CASE
            WHEN p_event_type = 'document.sent' THEN 'sent'::signature_status
            WHEN p_event_type = 'document.viewed' THEN 'viewed'::signature_status
            WHEN p_event_type = 'document.signed' THEN 'signed'::signature_status
            WHEN p_event_type = 'document.completed' THEN 'completed'::signature_status
            WHEN p_event_type = 'document.expired' THEN 'expired'::signature_status
            WHEN p_event_type = 'document.declined' THEN 'declined'::signature_status
            ELSE NULL
        END;

        -- Update signature request if status mapping exists
        IF v_new_status IS NOT NULL THEN
            UPDATE signature_requests
            SET
                status = v_new_status,
                opensign_metadata = COALESCE(opensign_metadata, '{}'::jsonb) || p_event_data,
                download_url = CASE
                    WHEN p_event_data ? 'download_url'
                    THEN p_event_data->>'download_url'
                    ELSE download_url
                END,
                certificate_url = CASE
                    WHEN p_event_data ? 'certificate_url'
                    THEN p_event_data->>'certificate_url'
                    ELSE certificate_url
                END
            WHERE id = v_signature_request_id;
        END IF;

        -- Mark webhook event as processed
        UPDATE signature_webhook_events
        SET
            processed = true,
            processed_at = NOW()
        WHERE id = v_webhook_event_id;

        v_result := jsonb_build_object(
            'success', true,
            'signature_request_id', v_signature_request_id,
            'webhook_event_id', v_webhook_event_id,
            'new_status', v_new_status
        );
    END IF;

    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION process_signature_webhook(TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION process_signature_webhook(TEXT, TEXT, JSONB) TO service_role;

COMMENT ON TABLE signature_requests IS 'Signature requests integrated with OpenSign';
COMMENT ON TABLE signature_webhook_events IS 'OpenSign webhook events for signature status tracking';
COMMENT ON FUNCTION process_signature_webhook IS 'Process OpenSign webhook events and update signature status';
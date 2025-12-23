-- =====================================================
-- Migration: Notifications firm FK + insert policy fix
-- Date: 2025-12-19
-- Purpose: Correct firm_id foreign key to firms(id) and tighten INSERT policy.
-- =====================================================

BEGIN;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'notifications'
  ) THEN
    -- Fix firm_id FK to reference firms(id).
    ALTER TABLE public.notifications
      DROP CONSTRAINT IF EXISTS notifications_firm_id_fkey;

    ALTER TABLE public.notifications
      ADD CONSTRAINT notifications_firm_id_fkey
      FOREIGN KEY (firm_id) REFERENCES public.firms(id) ON DELETE CASCADE;

    -- Tighten INSERT policy: allow users to insert only for themselves.
    DROP POLICY IF EXISTS "Service can insert notifications" ON public.notifications;
    DROP POLICY IF EXISTS "Users can insert own notifications" ON public.notifications;
    CREATE POLICY "Users can insert own notifications"
      ON public.notifications FOR INSERT
      WITH CHECK (auth.uid() = user_id);

    -- Ensure realtime is enabled for notifications.
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables
      WHERE pubname = 'supabase_realtime'
        AND tablename = 'notifications'
    ) THEN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
  END IF;
END $$;

COMMIT;


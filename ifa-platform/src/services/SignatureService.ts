// ================================================================
// CUSTOM SIGNATURE SERVICE
// Replaces OpenSign with internal signing flow
// ================================================================

import { createHash } from 'crypto'
import { log } from '@/lib/logging/structured'
import { getSupabaseServiceClient } from '@/lib/supabase/serviceClient'
import { PDFStampingService } from './PDFStampingService'

export interface SigningTokenResult {
  success: boolean
  token?: string
  expiresAt?: string
  signingUrl?: string
  error?: string
}

export interface TokenValidationResult {
  valid: boolean
  signatureRequest?: SignatureRequestData
  error?: string
  errorCode?: string
}

export interface SignatureRequestData {
  id: string
  documentId: string | null
  clientId: string | null
  firmId: string
  recipientName: string
  recipientEmail: string
  recipientRole: string
  status: string
  documentName: string
  advisorName: string
  expiresAt: string | null
  originalDocumentPath: string | null
  originalDocumentHash: string | null
}

export interface ProcessSignatureOptions {
  signatureDataUrl: string
  ipAddress: string
  userAgent: string
  consentTimestamp: string
}

export interface ProcessSignatureResult {
  success: boolean
  signedDocumentPath?: string
  signedDocumentHash?: string
  error?: string
}

export interface AuditEventType {
  type: 'created' | 'sent' | 'accessed' | 'viewed' | 'consent_given' | 'signed' | 'completed' | 'expired' | 'cancelled' | 'resent'
}

export class SignatureService {
  private pdfStampingService: PDFStampingService

  constructor() {
    this.pdfStampingService = new PDFStampingService()
  }

  /**
   * Generate a signing token for a signature request
   */
  async generateSigningToken(
    requestId: string,
    expiryHours: number = 720 // 30 days default
  ): Promise<SigningTokenResult> {
    try {
      const supabase = getSupabaseServiceClient()

      // Get the existing signature request
      const { data: request, error: fetchError } = await supabase
        .from('signature_requests')
        .select('id, signing_token, firm_id')
        .eq('id', requestId)
        .single()

      if (fetchError || !request) {
        return {
          success: false,
          error: 'Signature request not found'
        }
      }

      // Calculate expiry date
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + expiryHours)

      // Update the signature request with the token and expiry
      const { data: updated, error: updateError } = await supabase
        .from('signature_requests')
        .update({
          signing_token_expires_at: expiresAt.toISOString(),
          signing_token_used: false,
          signing_method: 'internal'
        })
        .eq('id', requestId)
        .select('signing_token')
        .single()

      if (updateError || !updated) {
        log.error('Failed to update signing token', { error: updateError })
        return {
          success: false,
          error: 'Failed to generate signing token'
        }
      }

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.plannetic.com'
      const signingUrl = `${appUrl}/sign/${updated.signing_token}`

      return {
        success: true,
        token: updated.signing_token ?? undefined,
        expiresAt: expiresAt.toISOString(),
        signingUrl
      }
    } catch (error) {
      log.error('Error generating signing token', error instanceof Error ? error : undefined)
      return {
        success: false,
        error: 'Failed to generate signing token'
      }
    }
  }

  /**
   * Validate a signing token and return the signature request details
   */
  async validateSigningToken(token: string): Promise<TokenValidationResult> {
    try {
      const supabase = getSupabaseServiceClient()

      // Use the database function to validate the token
      const { data: validation, error: validationError } = await supabase
        .rpc('validate_signing_token', { p_token: token })
        .single()

      if (validationError) {
        log.error('Token validation error', { error: validationError })
        return {
          valid: false,
          error: 'Failed to validate token',
          errorCode: 'VALIDATION_ERROR'
        }
      }

      if (!validation.valid) {
        return {
          valid: false,
          error: validation.error_message,
          errorCode: validation.error_code
        }
      }

      // Get signature request details (without relational joins to avoid FK issues)
      const { data: request, error: fetchError } = await supabase
        .from('signature_requests')
        .select('*')
        .eq('id', validation.signature_request_id)
        .single()

      if (fetchError || !request) {
        return {
          valid: false,
          error: 'Signature request not found',
          errorCode: 'NOT_FOUND'
        }
      }

      const metadata = request.opensign_metadata as Record<string, any> | null

      // Fetch document info separately if document_id exists
      let document: any = null
      if (request.document_id) {
        const { data: doc } = await supabase
          .from('documents')
          .select('id, name, file_name, file_path, storage_path')
          .eq('id', request.document_id)
          .maybeSingle()
        document = doc
      }

      // Fetch advisor info separately if created_by exists
      let advisor: any = null
      if (request.created_by) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('id, full_name')
          .eq('id', request.created_by)
          .maybeSingle()
        advisor = profile
      }

      return {
        valid: true,
        signatureRequest: {
          id: request.id,
          documentId: request.document_id,
          clientId: request.client_id,
          firmId: request.firm_id || '',
          recipientName: request.recipient_name || '',
          recipientEmail: request.recipient_email || '',
          recipientRole: request.recipient_role || 'Client',
          status: request.status || 'pending',
          documentName: document?.name || document?.file_name || metadata?.document_name || 'Document',
          advisorName: advisor?.full_name || 'Your Advisor',
          expiresAt: request.signing_token_expires_at || request.expires_at,
          originalDocumentPath: document?.file_path || document?.storage_path || null,
          originalDocumentHash: request.original_document_hash
        }
      }
    } catch (error) {
      log.error('Error validating signing token', error instanceof Error ? error : undefined)
      return {
        valid: false,
        error: 'Failed to validate token',
        errorCode: 'INTERNAL_ERROR'
      }
    }
  }

  /**
   * Process a signature submission
   */
  async processSignature(
    requestId: string,
    options: ProcessSignatureOptions
  ): Promise<ProcessSignatureResult> {
    const supabase = getSupabaseServiceClient()

    try {
      // Get the signature request (separate queries - no FK joins)
      const { data: request, error: fetchError } = await supabase
        .from('signature_requests')
        .select('*')
        .eq('id', requestId)
        .single()

      if (fetchError || !request) {
        return {
          success: false,
          error: 'Signature request not found'
        }
      }

      // Fetch document separately
      let document: { id: string; name: string; file_name: string; file_path: string | null; storage_path: string | null; firm_id: string } | null = null
      if (request.document_id) {
        const { data: doc } = await supabase
          .from('documents')
          .select('id, name, file_name, file_path, storage_path, firm_id')
          .eq('id', request.document_id)
          .maybeSingle()
        document = doc
      }

      if (!document?.file_path && !document?.storage_path) {
        return {
          success: false,
          error: 'Document not found'
        }
      }

      // Download the original PDF
      const documentPath = (document.file_path || document.storage_path)!
      let pdfBuffer: Buffer | null = null

      if (documentPath.startsWith('http')) {
        // Download from URL
        const response = await fetch(documentPath)
        if (!response.ok) {
          return { success: false, error: 'Failed to download document' }
        }
        pdfBuffer = Buffer.from(await response.arrayBuffer())
      } else {
        // Download from Supabase storage
        const { data, error } = await supabase.storage
          .from('documents')
          .download(documentPath)

        if (error || !data) {
          return { success: false, error: 'Failed to download document' }
        }
        pdfBuffer = Buffer.from(await data.arrayBuffer())
      }

      if (!pdfBuffer || pdfBuffer.length === 0) {
        return { success: false, error: 'Document is empty' }
      }

      // Verify original document hash if stored
      if (request.original_document_hash) {
        const currentHash = this.hashDocument(pdfBuffer)
        if (currentHash !== request.original_document_hash) {
          log.warn('Document hash mismatch', {
            requestId,
            expected: request.original_document_hash,
            actual: currentHash
          })
          // Continue anyway but log for audit
        }
      }

      // Convert signature data URL to buffer
      const signatureBuffer = this.dataUrlToBuffer(options.signatureDataUrl)
      if (!signatureBuffer) {
        return { success: false, error: 'Invalid signature data' }
      }

      // Stamp signature onto PDF
      const stampedPdf = await this.pdfStampingService.stampSignature(pdfBuffer, signatureBuffer, {
        signerName: request.recipient_name,
        signerEmail: request.recipient_email,
        signedAt: new Date().toISOString()
      })

      if (!stampedPdf) {
        return { success: false, error: 'Failed to stamp signature on document' }
      }

      // Add audit certificate
      const finalPdf = await this.pdfStampingService.addAuditCertificate(stampedPdf, {
        documentName: document.name || document.file_name || 'Document',
        signerName: request.recipient_name,
        signerEmail: request.recipient_email,
        signedAt: new Date().toISOString(),
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
        consentTimestamp: options.consentTimestamp,
        originalHash: request.original_document_hash || this.hashDocument(pdfBuffer),
        signedHash: '' // Will be computed after
      })

      // Compute hash of signed document
      const signedHash = this.hashDocument(finalPdf)

      // Generate signed document path
      const timestamp = Date.now()
      const safeFileName = (document.file_name || document.name || 'document')
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/\.pdf$/i, '')
      const signedFileName = `${safeFileName}_signed_${timestamp}.pdf`
      const signedPath = `firms/${request.firm_id}/signatures/${signedFileName}`

      // Upload signed document
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(signedPath, finalPdf, {
          contentType: 'application/pdf',
          upsert: true
        })

      if (uploadError) {
        log.error('Failed to upload signed document', { error: uploadError })
        return { success: false, error: 'Failed to save signed document' }
      }

      // Save signature image
      const signatureImagePath = `firms/${request.firm_id}/signatures/sig_${requestId}_${timestamp}.png`
      await supabase.storage
        .from('documents')
        .upload(signatureImagePath, signatureBuffer, {
          contentType: 'image/png',
          upsert: true
        })

      // Update signature request record
      const { error: updateError } = await supabase
        .from('signature_requests')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          signed_document_path: signedPath,
          signed_document_hash: signedHash,
          signature_image_path: signatureImagePath,
          signature_ip_address: options.ipAddress,
          signature_user_agent: options.userAgent,
          signer_consent_given: true,
          signer_consent_timestamp: options.consentTimestamp,
          signing_token_used: true
        })
        .eq('id', requestId)

      if (updateError) {
        log.error('Failed to update signature request', { error: updateError })
        // Document is already uploaded, so we return success anyway
      }

      // Log audit event
      await this.logAuditEvent(requestId, 'signed', {
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
        signedDocumentPath: signedPath,
        signedDocumentHash: signedHash
      })

      await this.logAuditEvent(requestId, 'completed', {
        ipAddress: options.ipAddress,
        userAgent: options.userAgent
      })

      return {
        success: true,
        signedDocumentPath: signedPath,
        signedDocumentHash: signedHash
      }
    } catch (error) {
      log.error('Error processing signature', error instanceof Error ? error : undefined)
      return {
        success: false,
        error: 'Failed to process signature'
      }
    }
  }

  /**
   * Hash a document buffer using SHA-256
   */
  hashDocument(pdfBuffer: Buffer): string {
    return createHash('sha256').update(pdfBuffer).digest('hex')
  }

  /**
   * Log an audit event
   */
  async logAuditEvent(
    requestId: string,
    eventType: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      const supabase = getSupabaseServiceClient()

      await supabase.rpc('log_signature_event', {
        p_signature_request_id: requestId,
        p_event_type: eventType,
        p_ip_address: metadata.ipAddress || null,
        p_user_agent: metadata.userAgent || null,
        p_metadata: metadata
      })
    } catch (error) {
      log.error('Failed to log audit event', { requestId, eventType, error })
    }
  }

  /**
   * Convert data URL to buffer
   */
  private dataUrlToBuffer(dataUrl: string): Buffer | null {
    try {
      const matches = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
      if (!matches) {
        return null
      }
      return Buffer.from(matches[2], 'base64')
    } catch {
      return null
    }
  }

  /**
   * Get signing URL for a request
   */
  getSigningUrl(token: string): string {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.plannetic.com'
    return `${appUrl}/sign/${token}`
  }

  /**
   * Mark token as accessed (for audit)
   */
  async markTokenAccessed(requestId: string, ipAddress: string, userAgent: string): Promise<void> {
    const supabase = getSupabaseServiceClient()

    // Update viewed_at if not already set
    await supabase
      .from('signature_requests')
      .update({ viewed_at: new Date().toISOString() })
      .eq('id', requestId)
      .is('viewed_at', null)

    // Log access event
    await this.logAuditEvent(requestId, 'accessed', { ipAddress, userAgent })
  }

  /**
   * Mark document as viewed
   */
  async markDocumentViewed(requestId: string, ipAddress: string, userAgent: string): Promise<void> {
    const supabase = getSupabaseServiceClient()

    // Update status to viewed if still sent
    await supabase
      .from('signature_requests')
      .update({ status: 'viewed' })
      .eq('id', requestId)
      .eq('status', 'sent')

    // Log view event
    await this.logAuditEvent(requestId, 'viewed', { ipAddress, userAgent })
  }
}

// Export singleton instance
export const signatureService = new SignatureService()

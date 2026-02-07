// ================================================================
// PDF STAMPING SERVICE
// Handles signature overlay and audit certificate generation
// ================================================================

import { PDFDocument, rgb, StandardFonts, PDFPage, PDFImage } from 'pdf-lib'
import { log } from '@/lib/logging/structured'

export interface StampOptions {
  signerName: string
  signerEmail: string
  signedAt: string
  signaturePosition?: {
    page?: number // 0-indexed, -1 for last page
    x?: number // percentage from left (0-100)
    y?: number // percentage from bottom (0-100)
    width?: number // percentage of page width
    height?: number // percentage of page height
  }
}

export interface AuditCertificateInfo {
  documentName: string
  signerName: string
  signerEmail: string
  signedAt: string
  ipAddress: string
  userAgent: string
  consentTimestamp: string
  originalHash: string
  signedHash: string
}

export class PDFStampingService {
  /**
   * Stamp a signature image onto a PDF
   */
  async stampSignature(
    pdfBuffer: Buffer,
    signatureImage: Buffer,
    options: StampOptions
  ): Promise<Buffer> {
    try {
      const pdfDoc = await PDFDocument.load(pdfBuffer)
      const pages = pdfDoc.getPages()

      if (pages.length === 0) {
        throw new Error('PDF has no pages')
      }

      // Determine which page to stamp
      const position = options.signaturePosition || {}
      let pageIndex = position.page ?? -1
      if (pageIndex < 0) {
        pageIndex = pages.length + pageIndex // -1 means last page
      }
      if (pageIndex < 0 || pageIndex >= pages.length) {
        pageIndex = pages.length - 1
      }

      const page = pages[pageIndex]
      const { width: pageWidth, height: pageHeight } = page.getSize()

      // Embed the signature image
      let embeddedImage: PDFImage
      try {
        // Try PNG first
        embeddedImage = await pdfDoc.embedPng(signatureImage)
      } catch {
        try {
          // Try JPEG as fallback
          embeddedImage = await pdfDoc.embedJpg(signatureImage)
        } catch (embedError) {
          log.error('Failed to embed signature image', { error: embedError })
          throw new Error('Invalid signature image format')
        }
      }

      // Calculate signature dimensions and position
      // Defaults: on the "Client Signature" line of the last page
      // PDF y-axis: 0 = bottom, 100 = top
      const sigWidth = (position.width || 30) / 100 * pageWidth
      const sigHeight = (position.height || 8) / 100 * pageHeight
      const sigX = (position.x || 8) / 100 * pageWidth
      const sigY = (position.y || 52) / 100 * pageHeight

      // Draw signature image only (clean, no extra text or borders)
      page.drawImage(embeddedImage, {
        x: sigX,
        y: sigY,
        width: sigWidth,
        height: sigHeight
      })

      return Buffer.from(await pdfDoc.save())
    } catch (error) {
      log.error('Error stamping signature', error instanceof Error ? error : undefined)
      throw error
    }
  }

  /**
   * Add audit certificate page to PDF
   */
  async addAuditCertificate(
    pdfBuffer: Buffer,
    info: AuditCertificateInfo
  ): Promise<Buffer> {
    try {
      const pdfDoc = await PDFDocument.load(pdfBuffer)

      // Add a new page for the audit certificate
      const page = pdfDoc.addPage([595.28, 841.89]) // A4 size
      const { width, height } = page.getSize()

      const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica)

      let y = height - 60

      // Header
      page.drawText('ELECTRONIC SIGNATURE CERTIFICATE', {
        x: 50,
        y,
        size: 18,
        font: fontBold,
        color: rgb(0.1, 0.1, 0.3)
      })

      y -= 15
      page.drawLine({
        start: { x: 50, y },
        end: { x: width - 50, y },
        thickness: 2,
        color: rgb(0.1, 0.5, 0.5)
      })

      y -= 35

      // Description
      const description = 'This document certifies that the attached document was electronically signed using Plannetic\'s secure e-signature platform. The signature is legally binding under the Electronic Communications Act 2000 and the eIDAS Regulation.'

      const descLines = this.wrapText(description, font, 10, width - 100)
      for (const line of descLines) {
        page.drawText(line, {
          x: 50,
          y,
          size: 10,
          font,
          color: rgb(0.3, 0.3, 0.3)
        })
        y -= 14
      }

      y -= 20

      // Document Details Section
      page.drawText('DOCUMENT DETAILS', {
        x: 50,
        y,
        size: 12,
        font: fontBold,
        color: rgb(0.1, 0.1, 0.3)
      })

      y -= 5
      page.drawLine({
        start: { x: 50, y },
        end: { x: 200, y },
        thickness: 1,
        color: rgb(0.7, 0.7, 0.7)
      })

      y -= 20
      const docDetails = [
        ['Document Name:', info.documentName],
        ['Certificate Generated:', new Date().toLocaleString('en-GB', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          timeZoneName: 'short'
        })]
      ]

      for (const [label, value] of docDetails) {
        page.drawText(label, {
          x: 50,
          y,
          size: 10,
          font: fontBold,
          color: rgb(0.2, 0.2, 0.2)
        })
        page.drawText(value, {
          x: 180,
          y,
          size: 10,
          font,
          color: rgb(0.3, 0.3, 0.3)
        })
        y -= 18
      }

      y -= 25

      // Signer Details Section
      page.drawText('SIGNER DETAILS', {
        x: 50,
        y,
        size: 12,
        font: fontBold,
        color: rgb(0.1, 0.1, 0.3)
      })

      y -= 5
      page.drawLine({
        start: { x: 50, y },
        end: { x: 170, y },
        thickness: 1,
        color: rgb(0.7, 0.7, 0.7)
      })

      y -= 20
      const signerDetails = [
        ['Name:', info.signerName],
        ['Email:', info.signerEmail],
        ['Signed At:', new Date(info.signedAt).toLocaleString('en-GB', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          timeZoneName: 'short'
        })],
        ['Consent Given:', new Date(info.consentTimestamp).toLocaleString('en-GB', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          timeZoneName: 'short'
        })],
        ['IP Address:', info.ipAddress || 'Not recorded']
      ]

      for (const [label, value] of signerDetails) {
        page.drawText(label, {
          x: 50,
          y,
          size: 10,
          font: fontBold,
          color: rgb(0.2, 0.2, 0.2)
        })
        page.drawText(value, {
          x: 180,
          y,
          size: 10,
          font,
          color: rgb(0.3, 0.3, 0.3)
        })
        y -= 18
      }

      // User agent (may be long, so wrap it)
      page.drawText('Browser:', {
        x: 50,
        y,
        size: 10,
        font: fontBold,
        color: rgb(0.2, 0.2, 0.2)
      })
      y -= 14

      const userAgentShort = (info.userAgent || 'Not recorded').substring(0, 100)
      page.drawText(userAgentShort, {
        x: 50,
        y,
        size: 8,
        font,
        color: rgb(0.4, 0.4, 0.4)
      })

      y -= 35

      // Document Integrity Section
      page.drawText('DOCUMENT INTEGRITY', {
        x: 50,
        y,
        size: 12,
        font: fontBold,
        color: rgb(0.1, 0.1, 0.3)
      })

      y -= 5
      page.drawLine({
        start: { x: 50, y },
        end: { x: 200, y },
        thickness: 1,
        color: rgb(0.7, 0.7, 0.7)
      })

      y -= 20

      page.drawText('Original Document Hash (SHA-256):', {
        x: 50,
        y,
        size: 10,
        font: fontBold,
        color: rgb(0.2, 0.2, 0.2)
      })
      y -= 14
      page.drawText(info.originalHash || 'Not available', {
        x: 50,
        y,
        size: 8,
        font,
        color: rgb(0.4, 0.4, 0.4)
      })

      y -= 25
      page.drawText('Signed Document Hash (SHA-256):', {
        x: 50,
        y,
        size: 10,
        font: fontBold,
        color: rgb(0.2, 0.2, 0.2)
      })
      y -= 14

      // Compute final hash after this certificate is added
      page.drawText('(Hash computed at time of signing)', {
        x: 50,
        y,
        size: 8,
        font,
        color: rgb(0.4, 0.4, 0.4)
      })

      y -= 40

      // Legal Notice
      page.drawRectangle({
        x: 45,
        y: y - 80,
        width: width - 90,
        height: 90,
        color: rgb(0.96, 0.96, 0.98),
        borderColor: rgb(0.85, 0.85, 0.9),
        borderWidth: 1
      })

      y -= 15
      page.drawText('LEGAL VALIDITY', {
        x: 55,
        y,
        size: 10,
        font: fontBold,
        color: rgb(0.1, 0.1, 0.3)
      })

      y -= 16
      const legalText = 'This electronic signature is legally binding under UK law (Electronic Communications Act 2000) and EU law (eIDAS Regulation). The signer has explicitly consented to signing this document electronically. All signing activities have been recorded for audit purposes.'
      const legalLines = this.wrapText(legalText, font, 9, width - 120)
      for (const line of legalLines) {
        page.drawText(line, {
          x: 55,
          y,
          size: 9,
          font,
          color: rgb(0.3, 0.3, 0.3)
        })
        y -= 12
      }

      // Footer
      page.drawText('Powered by Plannetic | www.plannetic.com', {
        x: 50,
        y: 40,
        size: 8,
        font,
        color: rgb(0.5, 0.5, 0.5)
      })

      page.drawText(`Certificate ID: ${this.generateCertificateId()}`, {
        x: width - 200,
        y: 40,
        size: 8,
        font,
        color: rgb(0.5, 0.5, 0.5)
      })

      return Buffer.from(await pdfDoc.save())
    } catch (error) {
      log.error('Error adding audit certificate', error instanceof Error ? error : undefined)
      throw error
    }
  }

  /**
   * Wrap text to fit within a maximum width
   */
  private wrapText(text: string, font: any, fontSize: number, maxWidth: number): string[] {
    const words = text.split(' ')
    const lines: string[] = []
    let currentLine = ''

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word
      const testWidth = font.widthOfTextAtSize(testLine, fontSize)

      if (testWidth > maxWidth && currentLine) {
        lines.push(currentLine)
        currentLine = word
      } else {
        currentLine = testLine
      }
    }

    if (currentLine) {
      lines.push(currentLine)
    }

    return lines
  }

  /**
   * Generate a unique certificate ID
   */
  private generateCertificateId(): string {
    const timestamp = Date.now().toString(36)
    const random = Math.random().toString(36).substring(2, 8)
    return `CERT-${timestamp}-${random}`.toUpperCase()
  }
}

// Export singleton instance
export const pdfStampingService = new PDFStampingService()

// src/lib/documents/emailParser.ts
// Shared EML + MSG parsing utilities

import MsgReader from '@kenjiuno/msgreader'

export interface ParsedEmail {
  from: string
  to: string
  date: string
  subject: string
  bodyText: string
  bodyHtml?: string
}

/**
 * Parse an EML (RFC 822) email buffer into structured data.
 */
export function parseEml(buffer: Buffer): ParsedEmail {
  const raw = buffer.toString('utf-8')

  // Split headers from body (first blank line)
  const headerEndIdx = raw.indexOf('\r\n\r\n')
  const altIdx = raw.indexOf('\n\n')
  const splitIdx = headerEndIdx !== -1 ? headerEndIdx : altIdx
  const headerBlock = splitIdx !== -1 ? raw.substring(0, splitIdx) : raw
  const bodyBlock = splitIdx !== -1 ? raw.substring(splitIdx).trim() : ''

  // Parse headers
  const headers: Record<string, string> = {}
  const headerLines = headerBlock.replace(/\r\n/g, '\n').split('\n')
  let currentKey = ''
  for (const line of headerLines) {
    if (/^\s/.test(line) && currentKey) {
      headers[currentKey] += ' ' + line.trim()
    } else {
      const colonIdx = line.indexOf(':')
      if (colonIdx > 0) {
        currentKey = line.substring(0, colonIdx).trim().toLowerCase()
        headers[currentKey] = line.substring(colonIdx + 1).trim()
      }
    }
  }

  // Extract body text — handle multipart by taking the first text/plain part
  let bodyText = bodyBlock
  let bodyHtml: string | undefined
  const contentType = headers['content-type'] || ''
  const boundaryMatch = contentType.match(/boundary="?([^";\s]+)"?/)

  if (boundaryMatch) {
    const boundary = boundaryMatch[1]
    const parts = bodyBlock.split(`--${boundary}`)
    for (const part of parts) {
      if (part.includes('text/plain')) {
        const partBodyStart = part.indexOf('\n\n')
        if (partBodyStart !== -1) {
          bodyText = part.substring(partBodyStart + 2).trim()
          break
        }
      }
      if (part.includes('text/html')) {
        const partBodyStart = part.indexOf('\n\n')
        if (partBodyStart !== -1) {
          let htmlContent = part.substring(partBodyStart + 2).trim()
          // Strip the closing boundary marker if present
          const closingBoundary = `--${boundary}--`
          if (htmlContent.includes(closingBoundary)) {
            htmlContent = htmlContent.substring(0, htmlContent.indexOf(closingBoundary)).trim()
          }
          bodyHtml = htmlContent
          // Use HTML as bodyText fallback if no plain text found
          if (bodyText === bodyBlock) {
            bodyText = htmlContent
          }
          break
        }
      }
    }
  }

  // Clean up any trailing boundary markers
  if (boundaryMatch) {
    const closingBoundary = `--${boundaryMatch[1]}--`
    if (bodyText.includes(closingBoundary)) {
      bodyText = bodyText.substring(0, bodyText.indexOf(closingBoundary)).trim()
    }
  }

  return {
    from: headers['from'] || 'Unknown',
    to: headers['to'] || 'Unknown',
    date: headers['date'] || '',
    subject: headers['subject'] || '(No Subject)',
    bodyText,
    bodyHtml,
  }
}

/**
 * Parse an Outlook MSG binary buffer into structured data.
 */
export function parseMsg(buffer: Buffer): ParsedEmail {
  const arrayBuffer = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer
  const reader = new MsgReader(arrayBuffer)
  const msgData = reader.getFileData()

  // Resolve sender email: prefer SMTP address over Exchange DN
  const senderEmail = msgData.senderSmtpAddress
    || msgData.senderEmail
    || msgData.creatorSMTPAddress
    || ''
  const senderName = msgData.senderName || ''
  const from = senderName && senderEmail
    ? `${senderName} <${senderEmail}>`
    : senderName || senderEmail || 'Unknown'

  // Resolve recipients
  const recipients = msgData.recipients || []
  const to = recipients
    .map((r) => {
      const rEmail = r.smtpAddress || r.email || ''
      const rName = r.name || ''
      return rName && rEmail ? `${rName} <${rEmail}>` : rName || rEmail
    })
    .filter(Boolean)
    .join(', ') || 'Unknown'

  // Resolve date
  const date = msgData.clientSubmitTime
    || msgData.messageDeliveryTime
    || msgData.creationTime
    || ''

  const subject = msgData.subject || '(No Subject)'
  const bodyText = msgData.body || ''

  // Try to get HTML body
  let bodyHtml: string | undefined
  if (msgData.bodyHtml) {
    bodyHtml = msgData.bodyHtml
  } else if (msgData.html) {
    bodyHtml = Buffer.from(msgData.html).toString('utf-8')
  }

  return {
    from,
    to,
    date,
    subject,
    bodyText,
    bodyHtml,
  }
}

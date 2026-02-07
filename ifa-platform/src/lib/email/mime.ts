/** Wrap a base64 string at 76 characters per line (RFC 2045) */
function wrapBase64(base64: string): string {
  return base64.match(/.{1,76}/g)?.join('\r\n') || base64
}

export function buildRawMimeMessage(options: {
  from: string
  to: string[]
  cc?: string[]
  subject: string
  html: string
  attachments?: { filename: string; content: string }[]
}): string {
  const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).slice(2)}`
  const lines: string[] = []

  lines.push(`From: ${options.from}`)
  lines.push(`To: ${options.to.join(', ')}`)
  if (options.cc && options.cc.length > 0) {
    lines.push(`Cc: ${options.cc.join(', ')}`)
  }
  lines.push(`Subject: =?UTF-8?B?${Buffer.from(options.subject).toString('base64')}?=`)
  lines.push('MIME-Version: 1.0')
  lines.push(`Content-Type: multipart/mixed; boundary="${boundary}"`)
  lines.push('')

  lines.push(`--${boundary}`)
  lines.push('Content-Type: text/html; charset=UTF-8')
  lines.push('Content-Transfer-Encoding: base64')
  lines.push('')
  lines.push(wrapBase64(Buffer.from(options.html).toString('base64')))
  lines.push('')

  if (options.attachments) {
    for (const att of options.attachments) {
      const mimeType = att.filename.endsWith('.pdf') ? 'application/pdf'
        : att.filename.endsWith('.png') ? 'image/png'
        : att.filename.endsWith('.jpg') || att.filename.endsWith('.jpeg') ? 'image/jpeg'
        : 'application/octet-stream'

      lines.push(`--${boundary}`)
      lines.push(`Content-Type: ${mimeType}; name="${att.filename}"`)
      lines.push('Content-Transfer-Encoding: base64')
      lines.push(`Content-Disposition: attachment; filename="${att.filename}"`)
      lines.push('')
      lines.push(wrapBase64(att.content))
      lines.push('')
    }
  }

  lines.push(`--${boundary}--`)
  return lines.join('\r\n')
}

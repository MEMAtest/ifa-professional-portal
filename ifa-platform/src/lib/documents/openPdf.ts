export type OpenPdfOptions = {
  filename?: string
  targetWindow?: Window | null
}

export function createReportWindow(title = 'Generating report'): Window | null {
  if (typeof window === 'undefined') return null
  const reportWindow = window.open('', '_blank')
  if (!reportWindow) return null

  try {
    reportWindow.document.title = title
    reportWindow.document.body.innerHTML = '<p style="font-family: Arial, sans-serif; padding: 24px;">Generating report, please wait...</p>'
  } catch {
    // Ignore failures to write into the window (e.g., blocked by browser policies).
  }

  return reportWindow
}

export function openReportUrl(url: string, options: OpenPdfOptions = {}): boolean {
  const target = options.targetWindow
  if (target) {
    target.location.href = url
    target.focus()
    return true
  }

  if (typeof window === 'undefined') return false

  const opened = window.open(url, '_blank', 'noopener,noreferrer')
  if (opened) return true

  window.location.assign(url)
  return false
}

export function openPdfFromBase64(base64: string, options: OpenPdfOptions = {}): boolean {
  const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
  const blob = new Blob([bytes], { type: 'application/pdf' })
  return openPdfBlob(blob, options)
}

export function openPdfBlob(blob: Blob, options: OpenPdfOptions = {}): boolean {
  const url = URL.createObjectURL(blob)
  const opened = openReportUrl(url, options)

  setTimeout(() => {
    URL.revokeObjectURL(url)
  }, 60_000)

  if (!opened && options.filename && typeof document !== 'undefined') {
    const link = document.createElement('a')
    link.href = url
    link.download = options.filename
    link.click()
  }

  return opened
}

export type OpenPdfOptions = {
  filename?: string
  targetWindow?: Window | null
  allowSameTabFallback?: boolean
}

export function createReportWindow(title = 'Generating report'): Window | null {
  if (typeof window === 'undefined') return null
  const allowAutoWindow = (window as any).__ALLOW_REPORT_WINDOW === true
  if (!allowAutoWindow) return null
  const reportWindow = window.open('', '_blank')
  if (!reportWindow) return null

  try {
    const safeTitle = title.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    reportWindow.document.open()
    reportWindow.document.write(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${safeTitle}</title>
    <style>
      :root {
        color-scheme: light;
      }
      body {
        margin: 0;
        font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
        background: radial-gradient(circle at top, #eef2ff, #f8fafc 60%);
        color: #0f172a;
      }
      .wrap {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
      }
      .card {
        width: min(520px, 100%);
        background: #ffffff;
        border: 1px solid #e2e8f0;
        border-radius: 16px;
        padding: 28px;
        box-shadow: 0 20px 40px rgba(15, 23, 42, 0.08);
      }
      .row {
        display: flex;
        gap: 16px;
        align-items: center;
      }
      .spinner {
        width: 40px;
        height: 40px;
        border-radius: 999px;
        border: 3px solid #c7d2fe;
        border-top-color: #2563eb;
        animation: spin 0.9s linear infinite;
        flex-shrink: 0;
      }
      .eyebrow {
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-size: 11px;
        color: #64748b;
        margin-bottom: 6px;
      }
      h1 {
        font-size: 20px;
        margin: 0 0 6px;
      }
      p {
        margin: 0;
        color: #475569;
        font-size: 14px;
        line-height: 1.5;
      }
      .bar {
        margin-top: 18px;
        height: 8px;
        border-radius: 999px;
        background: #e2e8f0;
        overflow: hidden;
      }
      .bar-fill {
        height: 100%;
        width: 45%;
        background: linear-gradient(90deg, #3b82f6, #6366f1);
        animation: pulse 1.4s ease-in-out infinite;
      }
      .meta {
        margin-top: 12px;
        font-size: 12px;
        color: #64748b;
      }
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      @keyframes pulse {
        0% { opacity: 0.5; transform: translateX(-20%); }
        50% { opacity: 1; transform: translateX(10%); }
        100% { opacity: 0.6; transform: translateX(30%); }
      }
    </style>
  </head>
  <body>
    <div class="wrap">
      <div class="card">
        <div class="row">
          <div class="spinner" aria-hidden="true"></div>
          <div>
            <div class="eyebrow">Report in progress</div>
            <h1>${safeTitle}</h1>
            <p>We are assembling your suitability PDF. This can take a minute while calculations and AI sections render.</p>
          </div>
        </div>
        <div class="bar"><div class="bar-fill"></div></div>
        <div class="meta">You can keep this tab open while we finish.</div>
      </div>
    </div>
  </body>
</html>`)
    reportWindow.document.close()
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
  if (options.allowSameTabFallback === false) return false

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

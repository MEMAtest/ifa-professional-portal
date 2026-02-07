import chromium from '@sparticuz/chromium'
import puppeteer from 'puppeteer-core'
import { accessSync, constants as fsConstants } from 'fs'

export type RenderHtmlToPdfOptions = {
  title?: string
  format?: 'A4' | 'Letter'
  landscape?: boolean
  printBackground?: boolean
  // For signing documents we want deterministic output and to avoid any script execution.
  // Leave enabled by default to avoid breaking existing templates that might rely on JS.
  javaScriptEnabled?: boolean
  margin?: {
    top?: string
    right?: string
    bottom?: string
    left?: string
  }
  timeoutMs?: number
}

function wrapHtmlDocument(html: string, title: string): string {
  const trimmed = String(html || '').trim()
  if (!trimmed) {
    return `<!doctype html><html><head><meta charset="utf-8" /><title>${title}</title></head><body></body></html>`
  }

  // If the template already contains a full HTML document, keep it.
  if (/<html[\s>]/i.test(trimmed)) return trimmed

  // Otherwise, wrap in a minimal print-friendly HTML shell.
  const baseHref = (() => {
    const candidate = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL
    if (!candidate) return ''
    try {
      const url = new URL(candidate)
      // Ensure relative URLs (e.g. "/logo.png") resolve consistently.
      return url.toString().endsWith('/') ? url.toString() : `${url.toString()}/`
    } catch {
      return ''
    }
  })()

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    ${baseHref ? `<base href="${baseHref}">` : ''}
    <style>
      /* Ensure colors and backgrounds render in PDF output. */
      html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      body { margin: 0; padding: 0; }
      @page { size: A4; margin: 0; }
    </style>
  </head>
  <body>${trimmed}</body>
</html>`
}

export async function renderHtmlToPdfBuffer(
  html: string,
  options?: RenderHtmlToPdfOptions
): Promise<Buffer> {
  const title = (options?.title || 'Document').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const documentHtml = wrapHtmlDocument(html, title)

  const timeoutMs = options?.timeoutMs ?? 45_000

  const findLocalChromeExecutablePath = (): string | null => {
    const exists = (p: string) => {
      try {
        accessSync(p, fsConstants.X_OK)
        return true
      } catch {
        return false
      }
    }

    const candidates: string[] = []
    if (process.platform === 'darwin') {
      candidates.push(
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
        '/Applications/Chromium.app/Contents/MacOS/Chromium',
        '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'
      )
    } else if (process.platform === 'win32') {
      const programFiles = process.env['PROGRAMFILES'] || 'C:\\\\Program Files'
      const programFilesX86 = process.env['PROGRAMFILES(X86)'] || 'C:\\\\Program Files (x86)'
      candidates.push(
        `${programFiles}\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe`,
        `${programFilesX86}\\\\Google\\\\Chrome\\\\Application\\\\chrome.exe`,
        `${programFiles}\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe`,
        `${programFilesX86}\\\\Microsoft\\\\Edge\\\\Application\\\\msedge.exe`
      )
    }

    for (const p of candidates) {
      if (exists(p)) return p
    }

    return null
  }

  const isLinux = process.platform === 'linux'

  // Prefer explicit override, otherwise:
  // - Linux (serverless/prod): use @sparticuz/chromium binary
  // - Non-Linux (local dev): use a locally installed Chrome
  const configuredExecutablePath = process.env.PUPPETEER_EXECUTABLE_PATH || process.env.CHROME_PATH
  const executablePath = configuredExecutablePath
    ? configuredExecutablePath
    : (isLinux ? await chromium.executablePath() : (findLocalChromeExecutablePath() || ''))

  if (!executablePath) {
    throw new Error('Chrome executable not found. Set PUPPETEER_EXECUTABLE_PATH (or CHROME_PATH).')
  }

  // The @sparticuz/chromium type definitions are intentionally minimal; treat the runtime
  // config surface as `any` to avoid coupling to its internal types.
  const chromiumConfig = chromium as any

  const browser = await puppeteer.launch({
    args: isLinux ? (chromiumConfig.args || []) : [],
    defaultViewport: chromiumConfig.defaultViewport || { width: 1280, height: 720 },
    executablePath,
    headless: (isLinux ? (chromiumConfig.headless ?? true) : true) as any,
  })

  try {
    const page = await browser.newPage()
    page.setDefaultTimeout(timeoutMs)
    await page.setJavaScriptEnabled(options?.javaScriptEnabled ?? true)

    // Block unexpected external requests (SSRF protection + determinism). Allow only:
    // - embedded `data:` assets
    // - same-host assets for the configured app URL
    // - same-host assets for the configured Supabase URL (e.g. firm logo in storage)
    const allowedHosts = new Set<string>()
    const addHost = (value?: string) => {
      if (!value) return
      try {
        allowedHosts.add(new URL(value).hostname)
      } catch {
        // ignore
      }
    }
    addHost(process.env.NEXT_PUBLIC_APP_URL)
    addHost(process.env.NEXTAUTH_URL)
    addHost(process.env.NEXT_PUBLIC_SUPABASE_URL)

    const isLoopbackHost = (hostname: string) => hostname === 'localhost' || hostname === '127.0.0.1'

    await page.setRequestInterception(true)
    page.on('request', (req) => {
      const url = req.url()
      if (url.startsWith('data:') || url.startsWith('blob:') || url === 'about:blank') {
        return req.continue()
      }

      try {
        const parsed = new URL(url)
        if (parsed.protocol === 'https:' && allowedHosts.has(parsed.hostname)) {
          return req.continue()
        }

        // Allow local http assets only for loopback hosts (dev environments).
        if (!isLinux && parsed.protocol === 'http:' && allowedHosts.has(parsed.hostname) && isLoopbackHost(parsed.hostname)) {
          return req.continue()
        }
      } catch {
        // Fall through to abort.
      }

      return req.abort()
    })

    await page.setContent(documentHtml, { waitUntil: 'load' })

    const pdf = await page.pdf({
      format: options?.format ?? 'A4',
      landscape: options?.landscape ?? false,
      printBackground: options?.printBackground ?? true,
      preferCSSPageSize: true,
      margin: options?.margin ?? {
        top: '40px',
        right: '40px',
        bottom: '50px',
        left: '40px',
      },
    })

    return Buffer.from(pdf)
  } finally {
    try {
      await browser.close()
    } catch {
      // ignore
    }
  }
}

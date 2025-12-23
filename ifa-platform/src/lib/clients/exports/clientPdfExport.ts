export type ClientPdfKind = 'profile' | 'print_pack'
export type ClientPdfPreset = 'profile' | 'print_pack' | 'both'

function endpointFor(kind: ClientPdfKind): string {
  return kind === 'profile'
    ? '/api/documents/generate-client-profile'
    : '/api/documents/generate-client-dossier'
}

function filenameFor(kind: ClientPdfKind, token: string): string {
  return kind === 'profile' ? `client-profile-${token}.pdf` : `client-print-pack-${token}.pdf`
}

async function readApiError(response: Response): Promise<string> {
  const contentType = response.headers.get('content-type') || ''
  if (contentType.includes('application/json')) {
    const json = await response.json().catch(() => null)
    const msg = (json as any)?.error
    if (msg) return String(msg)
  }

  const text = await response.text().catch(() => '')
  return text || 'Request failed'
}

export async function fetchClientPdfBlob(args: { clientId: string; kind: ClientPdfKind }): Promise<Blob> {
  const response = await fetch(endpointFor(args.kind), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ clientId: args.clientId })
  })

  if (!response.ok) {
    throw new Error(await readApiError(response))
  }

  return await response.blob()
}

export function openOrDownloadPdf(args: { blob: Blob; filename: string; openInNewTab: boolean }): void {
  const url = window.URL.createObjectURL(args.blob)

  if (args.openInNewTab) {
    window.open(url, '_blank')
  } else {
    const a = document.createElement('a')
    a.href = url
    a.download = args.filename
    a.click()
  }

  window.setTimeout(() => window.URL.revokeObjectURL(url), 15000)
}

export async function exportClientPdfs(args: {
  clientId: string
  clientToken: string
  preset: ClientPdfPreset
  openInNewTab: boolean
}): Promise<void> {
  const runOne = async (kind: ClientPdfKind) => {
    const blob = await fetchClientPdfBlob({ clientId: args.clientId, kind })
    openOrDownloadPdf({
      blob,
      filename: filenameFor(kind, args.clientToken),
      openInNewTab: args.openInNewTab
    })
  }

  if (args.preset === 'both') {
    await runOne('profile')
    await runOne('print_pack')
    return
  }

  await runOne(args.preset === 'profile' ? 'profile' : 'print_pack')
}


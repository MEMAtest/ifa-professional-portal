import { isUUID } from '@/lib/utils'
import type { SuitabilityFormData } from '@/types/suitability'

export type LocalDraftEnvelope = {
  data: SuitabilityFormData
  savedAt: string
  clientId: string
  assessmentId: string | null
  version: string
}

export function getLocalDraftKey(effectiveClientId: string) {
  return `suitability_draft_${effectiveClientId}`
}

export function saveLocalDraft(effectiveClientId: string, envelope: LocalDraftEnvelope) {
  const localKey = getLocalDraftKey(effectiveClientId)
  try {
    localStorage.setItem(localKey, JSON.stringify(envelope))
    return true
  } catch {
    return false
  }
}

export function loadLocalDraft(effectiveClientId: string): LocalDraftEnvelope | null {
  const localKey = getLocalDraftKey(effectiveClientId)
  const localData = localStorage.getItem(localKey)
  if (!localData) return null
  try {
    return JSON.parse(localData) as LocalDraftEnvelope
  } catch {
    return null
  }
}

export function removeLocalDraft(effectiveClientId: string) {
  const localKey = getLocalDraftKey(effectiveClientId)
  try {
    localStorage.removeItem(localKey)
  } catch {
    // ignore
  }
}

export function hoursSince(iso: string): number | null {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return (Date.now() - d.getTime()) / (1000 * 60 * 60)
}

export function isClientPersistable(clientId: string, isProspect: boolean) {
  return !isProspect && isUUID(clientId)
}

export function isCorruptedNextDevBuild(errorText: string) {
  return errorText.includes('Cannot find module') && errorText.includes('.next/server')
}

export type DraftGetResponse = {
  success?: boolean
  formData?: SuitabilityFormData | null
  assessmentId?: string
  versionNumber?: number
  completionPercentage?: number
  updatedAt?: string
  status?: string
  atrData?: any
  cflData?: any
}

export async function fetchDraftFromApi(args: { clientId: string; assessmentId?: string }) {
  const params = new URLSearchParams({ clientId: args.clientId })
  if (args.assessmentId) params.append('assessmentId', args.assessmentId)

  const response = await fetch(`/api/assessments/suitability/draft?${params}`)
  const text = response.ok ? null : await response.text().catch(() => '')
  const json = response.ok ? ((await response.json().catch(() => null)) as DraftGetResponse | null) : null

  return { response, text, json }
}

export async function postDraftToApi(args: {
  clientId: string
  assessmentId?: string
  formData: SuitabilityFormData
  completionPercentage: number
  timeoutMs?: number
}) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), args.timeoutMs ?? 10000)

  try {
    const response = await fetch('/api/assessments/suitability/draft', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientId: args.clientId,
        assessmentId: args.assessmentId,
        formData: args.formData,
        completionPercentage: args.completionPercentage
      }),
      signal: controller.signal
    })
    const text = response.ok ? null : await response.text().catch(() => '')
    const json = response.ok ? await response.json().catch(() => null) : null
    return { response, text, json }
  } finally {
    clearTimeout(timeoutId)
  }
}


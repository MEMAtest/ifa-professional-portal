'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { Modal } from '@/components/suitability/SuitabilityFormModals'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/hooks/use-toast'

type DocumentSource = {
  id: string
  name: string
  status?: string | null
  classification: string
  confidence: number
}

type CandidateWithSources = {
  value: string | number
  sources: string[]
}

type Proposal = {
  section: 'personal_details' | 'contact_info' | 'financial_profile'
  key: string
  path: string
  label: string
  currentValue: string | number | null
  suggestedValue: string | number | null
  candidates: CandidateWithSources[]
}

type PreviewResponse = {
  success: boolean
  preview?: boolean
  updatedFields?: {
    personal_details: string[]
    contact_info: string[]
    financial_profile: string[]
  }
  totalUpdated?: number
  proposals?: Proposal[]
  documentSources?: DocumentSource[]
  documentCounts?: { total: number; analyzed: number }
  message?: string
  error?: string
}

interface DocumentIntelligenceModalProps {
  clientId: string
  isOpen: boolean
  onClose: () => void
  onApplied?: (result: { totalUpdated: number; updatedFields?: PreviewResponse['updatedFields'] }) => void
}

const SECTION_LABELS: Record<Proposal['section'], string> = {
  personal_details: 'Personal Details',
  contact_info: 'Contact Details',
  financial_profile: 'Financial Profile',
}

export function DocumentIntelligenceModal({ clientId, isOpen, onClose, onApplied }: DocumentIntelligenceModalProps) {
  const [loading, setLoading] = useState(false)
  const [applying, setApplying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<PreviewResponse | null>(null)
  const [selections, setSelections] = useState<Record<string, number | 'skip'>>({})
  const { toast } = useToast()

  useEffect(() => {
    if (!isOpen || !clientId) return
    let active = true
    setLoading(true)
    setError(null)
    setPreview(null)
    setSelections({})

    ;(async () => {
      try {
        const res = await fetch(`/api/clients/${clientId}/populate-profile`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ preview: true }),
        })
        const data = (await res.json().catch(() => ({ success: false, error: 'Invalid response' }))) as PreviewResponse
        if (!active) return
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to load document suggestions')
        }
        setPreview(data)
        const nextSelections: Record<string, number | 'skip'> = {}
        const proposals = data.proposals || []
        proposals.forEach((proposal) => {
          nextSelections[proposal.path] = proposal.candidates.length > 0 ? 0 : 'skip'
        })
        setSelections(nextSelections)
      } catch (err) {
        if (!active) return
        setError(err instanceof Error ? err.message : 'Failed to load document suggestions')
      } finally {
        if (active) setLoading(false)
      }
    })()

    return () => {
      active = false
    }
  }, [clientId, isOpen])

  const groupedProposals = useMemo(() => {
    const proposals = preview?.proposals || []
    const grouped: Record<string, Proposal[]> = {}
    proposals.forEach((proposal) => {
      grouped[proposal.section] = grouped[proposal.section] || []
      grouped[proposal.section].push(proposal)
    })
    return grouped
  }, [preview])

  const formatValue = (value: string | number) => {
    if (typeof value === 'number') {
      return new Intl.NumberFormat('en-GB').format(value)
    }
    return value
  }

  const formatSourceLabel = (sources: string[]) => {
    if (!sources || sources.length === 0) return ''
    // Shorten filenames: remove folder prefix and extension
    const short = sources
      .filter((s): s is string => typeof s === 'string' && s.length > 0)
      .map((s) => {
        const name = s.includes('/') ? s.split('/').pop() || s : s
        return name.replace(/\.[^.]+$/, '')
      })
    if (short.length === 0) return ''
    if (short.length <= 2) return short.join(', ')
    return `${short[0]}, ${short[1]} +${short.length - 2} more`
  }

  const handleApply = async () => {
    if (!preview?.proposals || preview.proposals.length === 0) {
      toast({ title: 'Nothing to apply', description: 'No document suggestions are available to apply.' })
      return
    }

    const updates: Record<string, any> = {
      personal_details: {},
      contact_info: {},
      financial_profile: {},
    }

    preview.proposals.forEach((proposal) => {
      const selection = selections[proposal.path]
      if (selection === 'skip' || selection === undefined) return
      if (selection >= proposal.candidates.length) return
      const candidate = proposal.candidates[selection]
      if (!candidate) return
      const value = candidate.value
      if (value === null || value === undefined) return
      if (proposal.path.startsWith('contact_info.address.')) {
        updates.contact_info.address = updates.contact_info.address || {}
        const key = proposal.path.split('.').pop()
        if (key) {
          updates.contact_info.address[key] = value
        }
        return
      }
      updates[proposal.section][proposal.key] = value
    })

    const hasUpdates =
      Object.keys(updates.personal_details).length > 0 ||
      Object.keys(updates.contact_info).length > 0 ||
      Object.keys(updates.financial_profile).length > 0 ||
      Object.keys(updates.contact_info.address || {}).length > 0

    if (!hasUpdates) {
      toast({ title: 'Nothing selected', description: 'Choose at least one value to apply.' })
      return
    }

    setApplying(true)
    try {
      const res = await fetch(`/api/clients/${clientId}/populate-profile`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apply: true, updates }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to apply document suggestions')
      }
      toast({
        title: 'Profile updated',
        description: data.totalUpdated
          ? `${data.totalUpdated} field${data.totalUpdated === 1 ? '' : 's'} updated from documents.`
          : 'No fields were updated.',
      })
      onApplied?.({ totalUpdated: data.totalUpdated || 0, updatedFields: data.updatedFields })
      onClose()
    } catch (err) {
      toast({
        title: 'Update failed',
        description: err instanceof Error ? err.message : 'Failed to apply document suggestions.',
        variant: 'destructive',
      })
    } finally {
      setApplying(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Document Intelligence" maxWidth="max-w-3xl">
      {loading && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading document suggestions...
        </div>
      )}

      {!loading && error && <p className="text-sm text-red-600">{error}</p>}

      {!loading && !error && preview && (
        <div className="space-y-6">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            <p className="font-semibold">Documents summary</p>
            <p className="mt-1 text-amber-800">
              {preview.documentCounts?.total || 0} documents · {preview.documentCounts?.analyzed || 0} analysed
            </p>
            {preview.message && <p className="mt-1 text-amber-700">{preview.message}</p>}
          </div>

          {preview.documentSources && preview.documentSources.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-700">
              <p className="font-medium text-gray-800">Analysed documents</p>
              <ul className="mt-1 space-y-1">
                {preview.documentSources.map((doc) => (
                  <li key={doc.id}>
                    {doc.name} · {doc.classification}
                    {doc.confidence > 0 ? ` (${Math.round(doc.confidence * 100)}%)` : ''}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {preview.proposals && preview.proposals.length > 0 ? (
            <div className="space-y-6">
              {Object.entries(groupedProposals).map(([section, proposals]) => (
                <div key={section} className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-900">{SECTION_LABELS[section as Proposal['section']]}</h4>
                  <div className="space-y-3">
                    {proposals.map((proposal) => {
                      const selectedIdx = selections[proposal.path]
                      const selectedCandidate =
                        selectedIdx !== 'skip' && selectedIdx !== undefined
                          ? proposal.candidates[selectedIdx]
                          : null
                      return (
                        <div key={proposal.path} className="rounded-lg border border-gray-200 bg-white p-3">
                          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-medium text-gray-900">{proposal.label}</p>
                              <p className="text-xs text-gray-500">
                                Current: {proposal.currentValue ? formatValue(proposal.currentValue) : 'Empty'}
                              </p>
                              {selectedCandidate && selectedCandidate.sources && selectedCandidate.sources.length > 0 && (
                                <p className="mt-1 text-xs text-blue-600" title={selectedCandidate.sources.join('\n')}>
                                  Source: {formatSourceLabel(selectedCandidate.sources)}
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <label className="text-xs text-gray-500">Pick value</label>
                              <select
                                className="border border-gray-200 rounded-md px-2 py-1 text-sm max-w-[220px]"
                                value={selections[proposal.path] === 'skip' ? 'skip' : String(selections[proposal.path] ?? 0)}
                                onChange={(e) => {
                                  const value = e.target.value
                                  setSelections((prev) => ({
                                    ...prev,
                                    [proposal.path]: value === 'skip' ? 'skip' : Number(value),
                                  }))
                                }}
                              >
                                <option value="skip">Skip</option>
                                {proposal.candidates.map((candidate, index) => (
                                  <option key={`${proposal.path}-${index}`} value={String(index)}>
                                    {formatValue(candidate.value)}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
              No document suggestions are available yet. Run analysis or upload more documents to generate suggestions.
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={applying}>
              Close
            </Button>
            <Button onClick={handleApply} disabled={applying || !preview?.proposals?.length}>
              {applying ? 'Applying...' : 'Apply Selected'}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}

export default DocumentIntelligenceModal

'use client'

import { Loader2, Sparkles, FileText, Tag, User, Building, Hash, MapPin, Calendar, DollarSign } from 'lucide-react'
import { CLASSIFICATION_LABELS } from './clientDocumentsConstants'
import { formatCurrency } from './clientDocumentsUtils'
import type { UploadedDocument } from './clientDocumentsTypes'

export function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'processing':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
          <Loader2 className="h-3 w-3 animate-spin" />
          Analysing...
        </span>
      )
    case 'analyzed':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
          <Sparkles className="h-3 w-3" />
          Analysed
        </span>
      )
    case 'extracted':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
          <FileText className="h-3 w-3" />
          Text Only
        </span>
      )
    case 'failed':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
          Failed
        </span>
      )
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">
          Pending
        </span>
      )
  }
}

function EntityChip({ icon: Icon, label, value }: { icon: typeof User; label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded text-xs text-gray-700" title={label}>
      <Icon className="h-3 w-3 text-gray-500 flex-shrink-0" />
      <span className="truncate max-w-[200px]">{value}</span>
    </span>
  )
}

export function ExpandedAnalysis({ doc }: { doc: UploadedDocument }) {
  const analysis = doc.metadata?.ai_analysis
  if (!analysis) {
    if (doc.metadata?.ai_error) {
      return (
        <div className="px-6 py-3 bg-red-50 text-sm text-red-600">
          Analysis failed: {doc.metadata.ai_error}
        </div>
      )
    }
    if (doc.metadata?.extraction_error) {
      return (
        <div className="px-6 py-3 bg-red-50 text-sm text-red-600">
          Extraction failed: {doc.metadata.extraction_error}
        </div>
      )
    }
    return (
      <div className="px-6 py-3 bg-gray-50 text-sm text-gray-500">
        No analysis available yet.
      </div>
    )
  }

  const { entities } = analysis
  const hasEntities =
    (entities.clientNames?.length ?? 0) > 0 ||
    (entities.dates?.length ?? 0) > 0 ||
    (entities.providerNames?.length ?? 0) > 0 ||
    (entities.policyNumbers?.length ?? 0) > 0 ||
    (entities.financialAmounts?.length ?? 0) > 0 ||
    (entities.addresses?.length ?? 0) > 0 ||
    (entities.referenceNumbers?.length ?? 0) > 0

  return (
    <div className="px-6 py-4 bg-gray-50 space-y-3">
      <div>
        <p className="text-sm text-gray-700">{analysis.summary}</p>
      </div>

      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
          <Tag className="h-3 w-3" />
          {CLASSIFICATION_LABELS[analysis.classification] || analysis.classification}
        </span>
        <span className="text-xs text-gray-400">
          {Math.round(analysis.confidence * 100)}% confidence
        </span>
      </div>

      {hasEntities && (
        <div className="flex flex-wrap gap-1.5">
          {entities.clientNames?.map((name, i) => (
            <EntityChip key={`name-${i}`} icon={User} label="Client Name" value={name} />
          ))}
          {entities.providerNames?.map((name, i) => (
            <EntityChip key={`provider-${i}`} icon={Building} label="Provider" value={name} />
          ))}
          {entities.policyNumbers?.map((num, i) => (
            <EntityChip key={`policy-${i}`} icon={Hash} label="Policy Number" value={num} />
          ))}
          {entities.addresses?.map((addr, i) => (
            <EntityChip key={`addr-${i}`} icon={MapPin} label="Address" value={addr} />
          ))}
          {entities.dates?.map((date, i) => (
            <EntityChip key={`date-${i}`} icon={Calendar} label="Date" value={date} />
          ))}
          {entities.financialAmounts?.map((amt, i) => (
            <EntityChip
              key={`amount-${i}`}
              icon={DollarSign}
              label={amt.context}
              value={`${formatCurrency(amt.amount, amt.currency)} — ${amt.context}`}
            />
          ))}
          {entities.referenceNumbers?.map((ref, i) => (
            <EntityChip key={`ref-${i}`} icon={Hash} label="Reference" value={ref} />
          ))}
        </div>
      )}
    </div>
  )
}

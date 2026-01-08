import { FileText } from 'lucide-react'
import {
  PRODUCT_NAME_SUGGESTIONS,
  PROVIDER_SUGGESTIONS,
  RECOMMENDATION_PORTFOLIOS
} from '@/lib/constants/recommendationOptions'

export const recommendationSection = {
  id: 'recommendation',
  title: 'Recommendation',
  icon: FileText,
  status: 'incomplete',
  fields: [
    {
      id: 'recommended_portfolio',
      label: 'Recommended Portfolio',
      type: 'select',
      required: true,
      options: RECOMMENDATION_PORTFOLIOS
    },
    {
      id: 'allocation_equities',
      label: 'Equities Allocation (%)',
      type: 'number',
      required: true,
      placeholder: '60',
      min: 0,
      max: 100
    },
    {
      id: 'allocation_bonds',
      label: 'Bonds Allocation (%)',
      type: 'number',
      required: true,
      placeholder: '30',
      min: 0,
      max: 100
    },
    {
      id: 'allocation_cash',
      label: 'Cash Allocation (%)',
      type: 'number',
      required: true,
      placeholder: '5',
      min: 0,
      max: 100
    },
    {
      id: 'allocation_alternatives',
      label: 'Alternatives Allocation (%)',
      type: 'number',
      required: true,
      placeholder: '5',
      min: 0,
      max: 100
    },
    {
      id: 'product_1_name',
      label: 'Product 1 - Name',
      type: 'select',
      required: true,
      placeholder: 'e.g. Stocks & Shares ISA',
      options: PRODUCT_NAME_SUGGESTIONS,
      allowCustom: true,
      customOptionLabel: 'Add a new product...'
    },
    {
      id: 'product_1_provider',
      label: 'Product 1 - Provider',
      type: 'select',
      required: true,
      placeholder: 'e.g. Vanguard / AJ Bell',
      options: PROVIDER_SUGGESTIONS,
      allowCustom: true,
      customOptionLabel: 'Add a new provider...'
    },
    {
      id: 'product_1_amount',
      label: 'Product 1 - Amount (£)',
      type: 'number',
      required: true,
      placeholder: '25000',
      min: 0
    },
    {
      id: 'product_1_reason',
      label: 'Product 1 - Reason',
      type: 'textarea',
      required: true,
      placeholder: 'Why this product is suitable',
      rows: 3
    },
    {
      id: 'product_2_name',
      label: 'Product 2 - Name (optional)',
      type: 'select',
      placeholder: 'e.g. SIPP',
      options: PRODUCT_NAME_SUGGESTIONS,
      allowCustom: true,
      customOptionLabel: 'Add a new product...'
    },
    {
      id: 'product_2_provider',
      label: 'Product 2 - Provider (optional)',
      type: 'select',
      options: PROVIDER_SUGGESTIONS,
      allowCustom: true,
      customOptionLabel: 'Add a new provider...'
    },
    {
      id: 'product_2_amount',
      label: 'Product 2 - Amount (£) (optional)',
      type: 'number',
      placeholder: '0',
      min: 0
    },
    {
      id: 'product_2_reason',
      label: 'Product 2 - Reason (optional)',
      type: 'textarea',
      placeholder: 'Why this product is suitable',
      rows: 3
    },
    {
      id: 'product_3_name',
      label: 'Product 3 - Name (optional)',
      type: 'select',
      options: PRODUCT_NAME_SUGGESTIONS,
      allowCustom: true,
      customOptionLabel: 'Add a new product...'
    },
    {
      id: 'product_3_provider',
      label: 'Product 3 - Provider (optional)',
      type: 'select',
      options: PROVIDER_SUGGESTIONS,
      allowCustom: true,
      customOptionLabel: 'Add a new provider...'
    },
    {
      id: 'product_3_amount',
      label: 'Product 3 - Amount (£) (optional)',
      type: 'number',
      placeholder: '0',
      min: 0
    },
    {
      id: 'product_3_reason',
      label: 'Product 3 - Reason (optional)',
      type: 'textarea',
      placeholder: 'Why this product is suitable',
      rows: 3
    },
    {
      id: 'recommendation_rationale',
      label: 'Recommendation Rationale',
      type: 'textarea',
      required: true,
      placeholder: 'Explain why this recommendation is suitable',
      rows: 5
    },
    {
      id: 'next_review_date',
      label: 'Next Review Date',
      type: 'date',
      required: true,
      helpText: 'Auto-set from today based on Ongoing Service review frequency (you can override).',
      smartDefault: (formData: any) => {
        const frequency = (formData as any)?.ongoing_service?.review_frequency
        const months =
          frequency === 'Quarterly' ? 3 : frequency === 'Semi-Annual' ? 6 : frequency === 'Annual' ? 12 : null
        if (!months) return ''
        const d = new Date()
        d.setMonth(d.getMonth() + months)
        return d.toISOString().slice(0, 10)
      }
    },
    {
      id: 'advisor_declaration',
      label: 'Advisor Declaration',
      type: 'checkbox',
      required: true,
      options: ['I confirm this recommendation is suitable for the client']
    }
  ]
}

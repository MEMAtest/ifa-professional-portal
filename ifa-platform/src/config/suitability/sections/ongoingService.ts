import { RefreshCw } from 'lucide-react'

export const ongoingServiceSection = {
  id: 'ongoing_service',
  title: 'Ongoing Service',
  icon: RefreshCw,
  status: 'incomplete',
  fields: [
    {
      id: 'review_frequency',
      label: 'Review Frequency',
      type: 'select',
      required: true,
      options: ['Annual', 'Semi-Annual', 'Quarterly', 'Ad-hoc']
    },
    {
      id: 'services_included',
      label: 'Services Included',
      type: 'checkbox',
      options: [
        'Annual review meeting',
        'Portfolio monitoring',
        'Rebalancing recommendations',
        'Cashflow / retirement review',
        'Tax planning review',
        'Ad-hoc advice'
      ]
    },
    {
      id: 'contact_methods',
      label: 'Contact Methods',
      type: 'checkbox',
      options: ['Email', 'Phone', 'Video call', 'In-person meeting']
    },
    {
      id: 'response_times',
      label: 'Response Times / Service Standards',
      type: 'textarea',
      placeholder: 'e.g. We aim to respond within 2 working days',
      rows: 3
    }
  ]
}


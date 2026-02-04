import sanitizeHtml from 'sanitize-html'
import type { DocumentTemplate, RealClient } from './unifiedDocumentWorkflowTypes'
import { DEFAULT_TEMPLATE_CONTENT } from './unifiedDocumentWorkflowConstants'

export const sanitizeDocumentHtml = (html: string) =>
  sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'style']),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      img: ['src', 'alt', 'width', 'height', 'style'],
      '*': ['style', 'class', 'id']
    }
  })

export const formatCurrency = (amount: number): string => {
  if (!amount || isNaN(amount)) return '0'
  return new Intl.NumberFormat('en-GB', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

export const getClientDisplayName = (client: RealClient): string => {
  if (!client.personal_details) return 'Unknown Client'
  const title = client.personal_details.title ? `${client.personal_details.title} ` : ''
  const firstName = client.personal_details.firstName || ''
  const lastName = client.personal_details.lastName || ''
  return `${title}${firstName} ${lastName}`.trim() || 'Unknown Client'
}

export const getFallbackTemplates = (): DocumentTemplate[] => [
  {
    id: '485f9812-6dab-4b72-9462-ef65573f6225',
    name: 'Client Service Agreement',
    description: 'Standard client service agreement template',
    template_content: DEFAULT_TEMPLATE_CONTENT,
    requires_signature: true,
    template_variables: {}
  },
  {
    id: '1f9ab2d6-0eb9-48c7-a82c-07bd63d0dfce',
    name: 'Suitability Report',
    description: 'Investment suitability assessment report',
    template_content: DEFAULT_TEMPLATE_CONTENT,
    requires_signature: true,
    template_variables: {}
  },
  {
    id: 'd796a0ac-8266-41f0-b626-b46f9c73aa9c',
    name: 'Annual Review Report',
    description: 'Annual portfolio review report',
    template_content: DEFAULT_TEMPLATE_CONTENT,
    requires_signature: false,
    template_variables: {}
  }
]

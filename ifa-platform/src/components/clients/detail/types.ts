export interface ClientIntegrationStatus {
  hasAssessment: boolean
  hasScenario: boolean
  hasDocuments: boolean
  hasMonteCarlo: boolean
}

export interface ClientPendingAction {
  title: string
  description: string
  priority: 'high' | 'medium' | 'low'
  actionUrl?: string
}

export interface ClientQuickAction {
  icon: React.ElementType
  label: string
  description: string
  action: () => void
  variant?: 'default' | 'outline' | 'secondary'
  disabled?: boolean
}


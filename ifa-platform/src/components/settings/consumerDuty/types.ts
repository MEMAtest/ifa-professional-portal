// Consumer Duty framework types for firm-level settings

export interface ProductsServicesSettings {
  targetMarketApproach: string
  targetMarketApproachOther: string
  productCategories: string[]
  productCategoriesOther: string
  harmMitigationStrategy: string
  harmMitigationStrategyOther: string
  distributionStrategy: string
  distributionStrategyOther: string
}

export interface PriceValueSettings {
  assessmentMethod: string
  assessmentMethodOther: string
  reviewFrequency: string
  reviewFrequencyOther: string
  transparencyApproach: string
  transparencyApproachOther: string
  benchmarkingApproach: string
  benchmarkingApproachOther: string
}

export interface ConsumerUnderstandingSettings {
  communicationStyle: string[]
  communicationStyleOther: string
  productExplanationMethod: string
  productExplanationMethodOther: string
  vulnerableClientApproach: string
  vulnerableClientApproachOther: string
  testingApproach: string
  testingApproachOther: string
}

export interface ConsumerSupportSettings {
  serviceQualityStandards: string
  serviceQualityStandardsOther: string
  complaintHandlingProcess: string
  complaintHandlingProcessOther: string
  vulnerableClientSupport: string
  vulnerableClientSupportOther: string
  accessChannels: string[]
  accessChannelsOther: string
}

export interface ConsumerDutyFramework {
  products: ProductsServicesSettings
  pricing: PriceValueSettings
  communication: ConsumerUnderstandingSettings
  support: ConsumerSupportSettings
  additionalNotes: string
  lastReviewDate: string | null
  nextReviewDate: string | null
}

export interface ConsumerDutyVersion {
  id: string
  version: number
  saved_at: string
  summary: string
  framework: ConsumerDutyFramework
  saved_by?: string | null
}

export type ConsumerDutySaveStatus = {
  state: 'idle' | 'saving' | 'success' | 'error'
  message?: string
}

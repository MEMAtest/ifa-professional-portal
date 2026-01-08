import React, { useMemo } from 'react'
import { motion } from 'framer-motion'

import { FinancialDashboard } from './FinancialDashboard'
import { PersonalInformationSection } from './sections/PersonalInformationSection'
import { SuitabilitySection } from './SuitabilitySection'
import { ContactDetailsSection } from './ContactDetailsSection'
import {
  PRODUCT_NAME_SUGGESTIONS,
  PROVIDER_SUGGESTIONS,
  SERVICE_RECOMMENDATION_SUGGESTIONS
} from '@/lib/constants/recommendationOptions'

import type { SectionDefinition } from './SuitabilityFormProgress'
import type { AISuggestion, ConditionalFieldGroup, PulledPlatformData, SuitabilityFormData, ValidationError } from '@/types/suitability'

type ProductHolding = {
  product_name?: string | null
  product_provider?: string | null
  service_id?: string | null
}

type SectionStatus = 'complete' | 'partial' | 'incomplete' | 'error'

type Props = {
  section: SectionDefinition
  formData: SuitabilityFormData
  pulledData: PulledPlatformData
  clientId: string
  assessmentId?: string
  mode: 'create' | 'edit' | 'view'
  isProspect: boolean
  allowAI: boolean
  collaborators: string[]
  saveState: any
  servicesSelected: string[]
  productHoldings: ProductHolding[]

  expandedSections: Set<string>
  showFinancialDashboard: boolean

  combinedValidationErrors: ValidationError[]
  aiSuggestions: Record<string, AISuggestion>
  isLoadingAI: Record<string, boolean>

  getConditionalFields?: (sectionId: string) => ConditionalFieldGroup[]
  onToggleExpanded: (sectionId: string) => void
  onFieldUpdate: (sectionId: string, fieldId: string, value: any, options?: any) => void
  onSectionUpdate: (sectionId: string, updates: Record<string, any>) => void
  onGetAISuggestion: (sectionId: string) => void
}

const buildSuggestionList = (primary: string[], fallback: string[]) => {
  const seen = new Set<string>()
  const result: string[] = []

  const add = (value: string) => {
    const trimmed = value?.trim()
    if (!trimmed) return
    const key = trimmed.toLowerCase()
    if (seen.has(key)) return
    seen.add(key)
    result.push(trimmed)
  }

  primary.forEach(add)
  fallback.forEach(add)

  return result
}

export function SuitabilitySectionRenderer(props: Props) {
  const section = props.section
  const sectionData = props.formData[section.id as keyof SuitabilityFormData] || {}
  const sectionErrors = props.combinedValidationErrors.filter(e => e.sectionId === section.id)
  const sectionAI = props.aiSuggestions[section.id]
  const isLoadingSection = props.isLoadingAI[section.id]
  const isExpanded = props.expandedSections.has(section.id)

  const conditionalFieldGroups = props.getConditionalFields ? props.getConditionalFields(section.id) : []
  const recommendationSuggestions = useMemo(() => {
    if (section.id !== 'recommendation') return null

    const selectedServices = Array.isArray(props.servicesSelected) ? props.servicesSelected : []
    const products: string[] = []
    const providers: string[] = []

    const holdings = Array.isArray(props.productHoldings) ? props.productHoldings : []
    const relevantHoldings =
      selectedServices.length > 0
        ? holdings.filter((holding) => holding.service_id && selectedServices.includes(holding.service_id))
        : holdings

    relevantHoldings.forEach((holding) => {
      if (holding.product_name) products.push(holding.product_name)
      if (holding.product_provider) providers.push(holding.product_provider)
    })

    selectedServices.forEach((serviceId) => {
      const suggestions = SERVICE_RECOMMENDATION_SUGGESTIONS[serviceId]
      if (suggestions?.products) products.push(...suggestions.products)
      if (suggestions?.providers) providers.push(...suggestions.providers)
    })

    return {
      products: buildSuggestionList(products, PRODUCT_NAME_SUGGESTIONS),
      providers: buildSuggestionList(providers, PROVIDER_SUGGESTIONS)
    }
  }, [props.productHoldings, props.servicesSelected, section.id])

  const resolvedFields = useMemo(() => {
    if (!section.fields) return []
    if (section.id !== 'recommendation' || !recommendationSuggestions) return section.fields

    return section.fields.map((field) => {
      if (/^product_\d+_name$/.test(field.id)) {
        return { ...field, options: recommendationSuggestions.products }
      }
      if (/^product_\d+_provider$/.test(field.id)) {
        return { ...field, options: recommendationSuggestions.providers }
      }
      return field
    })
  }, [recommendationSuggestions, section.fields, section.id])

  const getTypedStatus = (status?: string): SectionStatus => {
    if (sectionErrors.some(e => e.severity === 'critical')) return 'error'
    if (sectionErrors.length > 0) return 'error'
    if (status === 'complete') return 'complete'
    if (status === 'partial') return 'partial'
    return 'incomplete'
  }

  if (section.id === 'personal_information' && section.hasCustomComponent) {
    return (
      <div id={section.id}>
        <PersonalInformationSection
          data={sectionData}
          onChange={props.onFieldUpdate}
          onBatchUpdate={props.onSectionUpdate}
          errors={sectionErrors}
          formData={props.formData}
          pulledData={props.pulledData}
          isReadOnly={props.mode === 'view'}
          isProspect={props.isProspect}
          showAI={props.allowAI}
          collaborators={props.collaborators}
          saveState={props.saveState}
        />
      </div>
    )
  }

  if (section.id === 'contact_details') {
    return (
      <div id={section.id}>
        <ContactDetailsSection
          sectionData={sectionData}
          updateField={(fieldId, value) => props.onFieldUpdate('contact_details', fieldId, value)}
          validationErrors={sectionErrors}
          isReadOnly={props.mode === 'view'}
          pulledData={props.pulledData}
        />
      </div>
    )
  }

  if (section.id === 'financial_situation' && props.showFinancialDashboard) {
    return (
      <div id={section.id} className="space-y-6">
        <SuitabilitySection
          section={{
            id: section.id,
            title: section.title,
            icon: section.icon,
            status: getTypedStatus(section.status),
            fields: resolvedFields,
            conditionalFields: conditionalFieldGroups,
            aiEnabled: true,
            chartEnabled: true,
            pulledDataFields: []
          }}
          formData={props.formData}
          pulledData={props.pulledData}
          sectionData={sectionData}
          isExpanded={isExpanded}
          onToggle={() => props.onToggleExpanded(section.id)}
          updateField={(fieldId, value, options) => props.onFieldUpdate(section.id, fieldId, value, options)}
          validationErrors={sectionErrors}
          aiSuggestion={sectionAI}
          isLoadingAI={isLoadingSection}
          onGetAISuggestion={() => props.onGetAISuggestion(section.id)}
          isProspect={props.isProspect}
          conditionalFields={conditionalFieldGroups}
          clientId={props.clientId}
          assessmentId={props.assessmentId}
        />

        {isExpanded && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
            <FinancialDashboard
              formData={props.formData}
              pulledData={props.pulledData}
              onUpdateField={(fieldId, value) => props.onFieldUpdate('financial_situation', fieldId, value)}
            />
          </motion.div>
        )}
      </div>
    )
  }

  return (
    <div id={section.id}>
      <SuitabilitySection
        section={{
          id: section.id,
          title: section.title,
          icon: section.icon,
          status: getTypedStatus(section.status),
          fields: resolvedFields,
          conditionalFields: conditionalFieldGroups,
          aiEnabled: true,
          chartEnabled: false,
          pulledDataFields: []
        }}
        formData={props.formData}
        pulledData={props.pulledData}
        sectionData={sectionData}
        isExpanded={isExpanded}
        onToggle={() => props.onToggleExpanded(section.id)}
        updateField={(fieldId, value, options) => props.onFieldUpdate(section.id, fieldId, value, options)}
        validationErrors={sectionErrors}
        aiSuggestion={sectionAI}
        isLoadingAI={isLoadingSection}
        onGetAISuggestion={() => props.onGetAISuggestion(section.id)}
        isProspect={props.isProspect}
        conditionalFields={conditionalFieldGroups}
        clientId={props.clientId}
        assessmentId={props.assessmentId}
      />
    </div>
  )
}

import React from 'react'
import { motion } from 'framer-motion'

import { FinancialDashboard } from './FinancialDashboard'
import { PersonalInformationSection } from './sections/PersonalInformationSection'
import { SuitabilitySection } from './SuitabilitySection'
import { ContactDetailsSection } from './ContactDetailsSection'

import type { SectionDefinition } from './SuitabilityFormProgress'
import type { AISuggestion, ConditionalFieldGroup, PulledPlatformData, SuitabilityFormData, ValidationError } from '@/types/suitability'

type SectionStatus = 'complete' | 'partial' | 'incomplete' | 'error'

type Props = {
  section: SectionDefinition
  formData: SuitabilityFormData
  pulledData: PulledPlatformData
  mode: 'create' | 'edit' | 'view'
  isProspect: boolean
  allowAI: boolean
  collaborators: string[]
  saveState: any

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

export function SuitabilitySectionRenderer(props: Props) {
  const section = props.section
  const sectionData = props.formData[section.id as keyof SuitabilityFormData] || {}
  const sectionErrors = props.combinedValidationErrors.filter(e => e.sectionId === section.id)
  const sectionAI = props.aiSuggestions[section.id]
  const isLoadingSection = props.isLoadingAI[section.id]
  const isExpanded = props.expandedSections.has(section.id)

  const conditionalFieldGroups = props.getConditionalFields ? props.getConditionalFields(section.id) : []

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
            fields: section.fields || [],
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
          fields: section.fields || [],
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
      />
    </div>
  )
}


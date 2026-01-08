import React, { useState, useCallback, useMemo, useEffect, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn, safeWriteToClipboard } from '@/lib/utils'

import type { ExtendedSuitabilityField } from './types'
import { hasValue } from './utils'
import { calculateSectionCompletion, getSectionStatus, mergeSectionFields } from './sectionFieldUtils'

import { Card, CardContent } from '@/components/ui/Card'
import { SuitabilitySectionHeader } from './components/SuitabilitySectionHeader'
import { DefaultSectionContent } from './components/DefaultSectionContent'
import { FinancialSectionContent } from './components/FinancialSectionContent'
import { RecommendationAllocationChart } from './components/RecommendationAllocationChart'
import { OptionsConsideredScoreChart } from './components/OptionsConsideredScoreChart'

// Types
import type {
  SuitabilitySection as SuitabilitySectionType,
  SuitabilityFormData,
  PulledPlatformData,
  ValidationError,
  AISuggestion,
  ConditionalFieldGroup
} from '@/types/suitability'

// =====================================================
// EXTENDED FIELD TYPE DEFINITIONS
// =====================================================

interface ExtendedSuitabilitySection extends SuitabilitySectionType {
  description?: string
  helpUrl?: string
  videoGuideUrl?: string
}

// =====================================================
// SECTION PROPS INTERFACE
// =====================================================

interface SuitabilitySectionProps {
  section: ExtendedSuitabilitySection
  formData: SuitabilityFormData
  pulledData: PulledPlatformData
  sectionData: Record<string, any>
  isExpanded: boolean
  onToggle: () => void
  updateField: (fieldId: string, value: any, options?: any) => void
  validationErrors: ValidationError[]
  aiSuggestion?: AISuggestion
  isLoadingAI?: boolean
  onGetAISuggestion?: () => void
  isReadOnly?: boolean
  isProspect?: boolean
  collaborators?: string[]
  clientId?: string
  assessmentId?: string
  saveState?: {
    isSaving: boolean
    lastSaved: Date | null
    lastError: string | null
  }
  onApplyAISuggestion?: (fieldId: string, value: any) => void
  showSmartComponents?: boolean
  className?: string
  conditionalFields?: ConditionalFieldGroup[] // ✅ NEW: Accept conditional fields
}

// =====================================================
// MAIN SECTION COMPONENT - ENHANCED WITH CONDITIONAL FIELDS
// =====================================================

export const SuitabilitySection = memo<SuitabilitySectionProps>(({
  section,
  formData,
  pulledData,
  sectionData,
  isExpanded,
  onToggle,
  updateField,
  validationErrors,
  aiSuggestion,
  isLoadingAI,
  onGetAISuggestion,
  isReadOnly,
  isProspect,
  collaborators,
  clientId,
  assessmentId,
  saveState,
  onApplyAISuggestion,
  showSmartComponents = true,
  className,
  conditionalFields = [] // ✅ NEW: Accept conditional fields
}) => {
  const [localExpanded, setLocalExpanded] = useState(isExpanded)
  // Some sections contain grouped/optional inputs where hiding fields creates confusion
  // (e.g., Product 2/3 and Option 3). Default these to fully expanded.
  const [showAllFields, setShowAllFields] = useState(() => {
    return section.id === 'recommendation' || section.id === 'options_considered'
  })
  const [copiedField, setCopiedField] = useState<string | null>(null)
  
  // Keep localExpanded in sync with isExpanded prop
  useEffect(() => {
    setLocalExpanded(isExpanded)
  }, [isExpanded])
  
  // ✅ ENHANCED: Merge base fields with conditional fields
  const allFields = useMemo(() => {
    return mergeSectionFields({
      sectionFields: [...(section.fields || [])] as ExtendedSuitabilityField[],
      sectionConditionalFields: section.conditionalFields,
      conditionalFields,
      formData,
      pulledData
    })
  }, [section, formData, pulledData, conditionalFields])
  
  // Calculate section completion with all fields
  const sectionCompletion = useMemo(() => {
    return calculateSectionCompletion(allFields, sectionData)
  }, [allFields, sectionData])
  
  // Get section icon
  const SectionIcon = section.icon
  
  const sectionStatus = useMemo(() => {
    return getSectionStatus(validationErrors, sectionCompletion)
  }, [validationErrors, sectionCompletion])
  
  // Handle field update with validation
  const handleFieldUpdate = useCallback((fieldId: string, value: any) => {
    updateField(fieldId, value, {
      source: 'user',
      skipValidation: false
    })
  }, [updateField])
  
  // Handle copy field value
  const handleCopyField = useCallback((fieldId: string, value: any) => {
    void safeWriteToClipboard(String(value ?? '')).then((ok) => {
      if (!ok) return
      setCopiedField(fieldId)
      setTimeout(() => setCopiedField(null), 2000)
    })
  }, [])
  
  // Determine which fields to show based on pagination
  const visibleFields = useMemo(() => {
    if (showAllFields || allFields.length <= 5) return allFields

    // Always show:
    // - the first 5 fields (quick-start)
    // - any required fields
    // - any fields with current values
    // - any fields with validation errors
    const visibleIds = new Set(allFields.slice(0, 5).map((f) => f.id))

    for (const field of allFields) {
      if (field.required) visibleIds.add(field.id)
      if (hasValue(sectionData?.[field.id])) visibleIds.add(field.id)
      if (validationErrors.some((e) => e.fieldId === field.id)) visibleIds.add(field.id)
    }

    return allFields.filter((f) => visibleIds.has(f.id))
  }, [allFields, sectionData, showAllFields, validationErrors])

  const hiddenFieldsCount = useMemo(() => {
    return Math.max(0, allFields.length - visibleFields.length)
  }, [allFields.length, visibleFields.length])

  const optionScores = useMemo(() => {
    if (section.id !== 'options_considered') return []

    const toScore = (value: unknown): number | null => {
      if (value === null || value === undefined) return null
      if (typeof value === 'string' && value.trim() === '') return null
      const parsed = typeof value === 'number' ? value : Number(value)
      return Number.isFinite(parsed) ? parsed : null
    }

    return [
      { label: sectionData?.option_1_name || 'Option 1', score: toScore(sectionData?.option_1_score) },
      { label: sectionData?.option_2_name || 'Option 2', score: toScore(sectionData?.option_2_score) },
      { label: sectionData?.option_3_name || 'Option 3', score: toScore(sectionData?.option_3_score) }
    ]
  }, [section.id, sectionData])
  
  // Special rendering for financial_situation with dashboard
  if (section.id === 'financial_situation' && showSmartComponents) {
    return (
      <Card className={cn("mb-6 transition-all duration-200", className)}>
        <SuitabilitySectionHeader
          variant="financial"
          title={section.title}
          description={section.description}
          SectionIcon={SectionIcon}
          sectionStatus={sectionStatus}
          sectionCompletion={sectionCompletion}
          validationErrors={validationErrors}
          baseFieldsCount={section.fields.length}
          allFieldsCount={allFields.length}
          isLoadingAI={isLoadingAI}
          showAIButton={Boolean(section.aiEnabled && !isProspect && onGetAISuggestion)}
          onGetAISuggestion={onGetAISuggestion}
          localExpanded={localExpanded}
          onToggle={onToggle}
        />
        
        <AnimatePresence>
          {localExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
            >
              <FinancialSectionContent
                formData={formData}
                pulledData={pulledData}
                visibleFields={visibleFields}
                sectionData={sectionData}
                validationErrors={validationErrors}
                aiSuggestion={aiSuggestion}
                isReadOnly={isReadOnly}
                isLoadingAI={isLoadingAI}
                showSmartComponents={showSmartComponents}
                showAllFields={showAllFields}
                hiddenFieldsCount={hiddenFieldsCount}
                onToggleShowAllFields={() => setShowAllFields(!showAllFields)}
                onFieldUpdate={handleFieldUpdate}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    )
  }
  
  // Default section rendering
  return (
    <Card className={cn(
      "mb-6 transition-all duration-200 hover:shadow-lg",
      className
    )}>
      <SuitabilitySectionHeader
        variant="default"
        title={section.title}
        description={section.description}
        SectionIcon={SectionIcon}
        sectionStatus={sectionStatus}
        sectionCompletion={sectionCompletion}
        validationErrors={validationErrors}
        baseFieldsCount={section.fields.length}
        allFieldsCount={allFields.length}
        collaborators={collaborators}
        isSaving={saveState?.isSaving}
        isReadOnly={isReadOnly}
        isLoadingAI={isLoadingAI}
        showAIButton={Boolean(section.aiEnabled && !isProspect && onGetAISuggestion)}
        onGetAISuggestion={onGetAISuggestion}
        localExpanded={localExpanded}
        onToggle={onToggle}
      />
      
      <AnimatePresence>
        {localExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
          >
            {section.id === 'recommendation' && (
              <CardContent className="border-b">
                <RecommendationAllocationChart
                  allocation={{
                    equities: Number(sectionData?.allocation_equities) || 0,
                    bonds: Number(sectionData?.allocation_bonds) || 0,
                    cash: Number(sectionData?.allocation_cash) || 0,
                    alternatives: Number(sectionData?.allocation_alternatives) || 0
                  }}
                  portfolioLabel={sectionData?.recommended_portfolio}
                />
              </CardContent>
            )}
            {section.id === 'options_considered' && (
              <CardContent className="border-b">
                <OptionsConsideredScoreChart options={optionScores} />
              </CardContent>
            )}
            <DefaultSectionContent
              baseFields={[...(section.fields || [])] as ExtendedSuitabilityField[]}
              allFields={allFields}
              visibleFields={visibleFields}
              sectionData={sectionData}
              sectionId={section.id}
              formData={formData}
              pulledData={pulledData}
              validationErrors={validationErrors}
              aiSuggestion={aiSuggestion}
              isReadOnly={isReadOnly}
              isLoadingAI={isLoadingAI}
              showAllFields={showAllFields}
              onToggleShowAllFields={() => setShowAllFields(!showAllFields)}
              onFieldUpdate={handleFieldUpdate}
              copiedField={copiedField}
              onCopyField={handleCopyField}
              onApplyAISuggestion={onApplyAISuggestion}
              saveState={saveState}
              helpUrl={section.helpUrl}
              clientId={clientId}
              assessmentId={assessmentId}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
})

SuitabilitySection.displayName = 'SuitabilitySection'

export default SuitabilitySection

// =====================================================
// FILE: /config/suitability/sections.ts
// COMPLETE CONFIGURATION WITH AUTO-GENERATION PROPERTIES
// =====================================================

import { contactDetailsSection } from './sections/contactDetails'
import { costsChargesSection } from './sections/costsCharges'
import { disadvantagesRisksSection } from './sections/disadvantagesRisks'
import { existingArrangementsSection } from './sections/existingArrangements'
import { financialSituationSection } from './sections/financialSituation'
import { knowledgeExperienceSection } from './sections/knowledgeExperience'
import { objectivesSection } from './sections/objectives'
import { ongoingServiceSection } from './sections/ongoingService'
import { optionsConsideredSection } from './sections/optionsConsidered'
import { personalInformationSection } from './sections/personalInformation'
import { recommendationSection } from './sections/recommendation'
import { regulatoryComplianceSection } from './sections/regulatoryCompliance'
import { riskAssessmentSection } from './sections/riskAssessment'
import { suitabilityDeclarationSection } from './sections/suitabilityDeclaration'
import { vulnerabilityAssessmentSection } from './sections/vulnerabilityAssessment'

export const suitabilitySections = [
  personalInformationSection,
  contactDetailsSection,
  objectivesSection,
  financialSituationSection,
  riskAssessmentSection,
  knowledgeExperienceSection,
  existingArrangementsSection,
  vulnerabilityAssessmentSection,
  regulatoryComplianceSection,
  costsChargesSection,
  recommendationSection,
  optionsConsideredSection,
  disadvantagesRisksSection,
  ongoingServiceSection,
  suitabilityDeclarationSection
]


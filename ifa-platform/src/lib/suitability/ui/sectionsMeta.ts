import type { LucideIcon } from 'lucide-react'
import {
  AlertTriangle,
  Briefcase,
  Calculator,
  CheckCircle,
  ClipboardList,
  FileCheck,
  FileText,
  GraduationCap,
  Heart,
  Phone,
  PoundSterling,
  RefreshCw,
  Shield,
  Target,
  User
} from 'lucide-react'

import { suitabilitySections } from '@/config/suitability/sections'
import { REQUIRED_SUITABILITY_SECTION_IDS } from '@/lib/suitability/requirements'
import type { SuitabilityField } from '@/types/suitability'
import type { SectionDefinition } from '@/components/suitability/SuitabilityFormProgress'

type SectionStatus = 'complete' | 'partial' | 'incomplete' | 'error'
type FieldType =
  | 'text'
  | 'number'
  | 'select'
  | 'textarea'
  | 'radio'
  | 'checkbox'
  | 'date'
  | 'email'
  | 'tel'
  | 'address'

const castFieldType = (type: string): FieldType => {
  const validTypes: FieldType[] = [
    'text',
    'number',
    'select',
    'textarea',
    'radio',
    'checkbox',
    'date',
    'email',
    'tel',
    'address'
  ]
  return validTypes.includes(type as FieldType) ? (type as FieldType) : 'text'
}

const getStatusFromString = (status?: string): SectionStatus => {
  switch (status) {
    case 'complete':
      return 'complete'
    case 'partial':
      return 'partial'
    case 'error':
      return 'error'
    default:
      return 'incomplete'
  }
}

export const REQUIRED_SECTION_SET = new Set<string>(
  REQUIRED_SUITABILITY_SECTION_IDS as unknown as string[]
)

export const SECTIONS: SectionDefinition[] = suitabilitySections.map((section, index) => {
  const iconMap: Record<string, LucideIcon> = {
    personal_information: User,
    contact_details: Phone,
    financial_situation: PoundSterling,
    objectives: Target,
    risk_assessment: Shield,
    knowledge_experience: GraduationCap,
    existing_arrangements: Briefcase,
    vulnerability_assessment: Heart,
    regulatory_compliance: FileCheck,
    costs_charges: Calculator,
    recommendation: FileText,
    options_considered: ClipboardList,
    disadvantages_risks: AlertTriangle,
    ongoing_service: RefreshCw,
    suitability_declaration: CheckCircle
  }

  const descriptionMap: Record<string, string> = {
    personal_information: 'Basic client details and circumstances',
    contact_details: 'Contact information and preferences',
    financial_situation: 'Current financial position and cash flow',
    objectives: 'Goals and investment timeline',
    risk_assessment: 'Risk tolerance and capacity for loss',
    knowledge_experience: 'Investment knowledge and history',
    existing_arrangements: 'Current investments and pensions',
    vulnerability_assessment: 'Health and support requirements',
    regulatory_compliance: 'Regulatory requirements and declarations',
    costs_charges: 'Fee structure and charges',
    recommendation: 'Investment recommendation and rationale',
    options_considered: 'Alternative solutions and selection rationale',
    disadvantages_risks: 'Key disadvantages, risks and mitigations',
    ongoing_service: 'Review frequency and ongoing service terms',
    suitability_declaration: 'Final declarations and sign-off'
  }

  const typedFields: SuitabilityField[] | undefined = section.fields
    ? section.fields.map((field: any) => ({
        ...field,
        id: field.id,
        label: field.label,
        type: castFieldType(field.type),
        required: field.required || false,
        options: field.options || undefined,
        placeholder: field.placeholder || undefined,
        validation: field.validation || undefined,
        autoGenerate: field.autoGenerate || false,
        calculate: field.calculate || undefined,
        dependsOn: field.dependsOn || undefined,
        smartDefault: field.smartDefault || undefined,
        helpText: field.helpText || undefined,
        pullFrom: field.pullFrom || undefined,
        aiSuggested: field.aiSuggested || false,
        validateWith: field.validateWith || undefined,
        asyncValidation: field.asyncValidation || false,
        realTimeSync: field.realTimeSync || false,
        trackChanges: field.trackChanges || false
      }))
    : undefined

  return {
    id: section.id,
    title: section.title,
    description: descriptionMap[section.id] || 'Section details',
    icon: iconMap[section.id] || FileText,
    required: REQUIRED_SECTION_SET.has(section.id),
    order: index + 1,
    hasCustomComponent:
      section.id === 'personal_information' ||
      section.id === 'financial_situation' ||
      section.id === 'contact_details',
    fields: typedFields,
    status: getStatusFromString((section as any).status),
    fieldCount: section.fields?.length || 0
  }
})


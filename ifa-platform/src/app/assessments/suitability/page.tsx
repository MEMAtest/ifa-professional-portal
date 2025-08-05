'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Progress } from '@/components/ui/Progress'
import { Alert, AlertDescription } from '@/components/ui/Alert'
import { useToast } from '@/components/ui/use-toast'
import DocumentGenerationButton from '@/components/documents/DocumentGenerationButton'

// PHASE 1: Import navigation components
import { NavigationGuard } from '@/components/ui/NavigationGuard'
import { useClientContext } from '@/hooks/useClientContext'

// INTEGRATION: Import the integration hook and services
import { useClientIntegration } from '@/lib/hooks/useClientIntegration'
import { integratedClientService } from '@/services/integratedClientService'
import { realDocumentService } from '@/services/realIntegratedServices'
import { documentTemplateService } from '@/services/documentTemplateService'
// PHASE 2: Import AI service and enhanced types
import { aiAssistantService } from '@/services/aiAssistantService'
// PROGRESS TRACKING: Import AssessmentService for tracking
import { AssessmentService } from '@/services/AssessmentService'
import { 
  SuitabilityData,
  SuitabilityDataEnhanced, 
  PulledPlatformData, 
  AISuggestion,
  ChartData,
  ValidationError as EnhancedValidationError,
  ValidationWarning,
  CrossSectionValidation
} from '@/types/assessment'
import { 
  ChevronDown, 
  ChevronUp, 
  Save, 
  FileText, 
  AlertCircle,
  CheckCircle,
  User,
  Target,
  Shield,
  PoundSterling,
  BookOpen,
  Briefcase,
  Calculator,
  TrendingUp,
  FileCheck,
  Settings,
  RefreshCw,
  Sparkles,
  Download,
  Upload,
  Users,
  Building,
  Heart,
  Home,
  Calendar,
  Send,
  Loader2,
  ArrowLeft,
  Brain,
  BarChart,
  AlertTriangle,
  Zap,
  Database,
  Activity
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createBrowserClient } from '@supabase/ssr'
// PHASE 3: Import Chart Components
import { SectionCharts } from '@/components/charts'

// ================================================================
// ENHANCED TYPES & INTERFACES (KEEPING ALL YOUR ORIGINAL ONES)
// ================================================================

interface SuitabilitySectionEnhanced {
  id: string
  title: string
  icon: React.ComponentType<{ className?: string }>
  status: 'complete' | 'partial' | 'incomplete'
  fields: SuitabilityFieldEnhanced[]
  conditionalFields?: ConditionalFieldGroupEnhanced[]
  aiEnabled?: boolean
  chartEnabled?: boolean
  pulledDataFields?: string[] // Fields that can be pulled from platform
}

interface SuitabilityFieldEnhanced {
  id: string
  label: string
  type: 'text' | 'number' | 'select' | 'textarea' | 'radio' | 'checkbox' | 'date' | 'email' | 'tel'
  required?: boolean
  options?: string[]
  placeholder?: string
  validation?: string
  autoGenerate?: boolean
  calculate?: string
  dependsOn?: FieldDependency
  smartDefault?: (formData: SuitabilityDataEnhanced, pulledData: PulledPlatformData) => any
  helpText?: string
  pullFrom?: string // Platform data source
  aiSuggested?: boolean
  validateWith?: (value: any, formData: SuitabilityDataEnhanced, pulledData: PulledPlatformData) => string | null
}

interface ConditionalFieldGroupEnhanced {
  condition: (formData: SuitabilityDataEnhanced, pulledData: PulledPlatformData) => boolean
  fields: SuitabilityFieldEnhanced[]
  aiReason?: string // AI explanation for why these fields are shown
}

interface FieldDependency {
  field: string
  value: any
  operator?: 'equals' | 'includes' | 'greaterThan' | 'lessThan'
}

interface ValidationError {
  sectionId: string
  fieldId: string
  message: string
  severity?: 'error' | 'warning'
}

// PROGRESS TRACKING: Add progress tracking state interface
interface ProgressTrackingState {
  isTracking: boolean
  lastTrackedSection: string | null
  sectionsCompleted: Set<string>
  fieldsCompletedBySection: Record<string, Set<string>>
}

// ================================================================
// UTILITY FUNCTIONS (KEEPING ALL YOUR ORIGINAL ONES)
// ================================================================

// Auto-generate client reference
const generateClientReference = (): string => {
  const timestamp = new Date().toISOString().slice(2, 10).replace(/-/g, '')
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `C${timestamp}${random}`
}

// Calculate age from DOB
const calculateAge = (dob: string): number => {
  if (!dob) return 0
  const birthDate = new Date(dob)
  const today = new Date()
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  return age
}

// Validate email
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Validate UK phone
const isValidUKPhone = (phone: string): boolean => {
  const ukPhoneRegex = /^(\+44|0)[1-9]\d{8,9}$/
  return ukPhoneRegex.test(phone.replace(/\s/g, ''))
}

// Calculate disposable income
const calculateDisposableIncome = (income: number, expenditure: number): number => {
  return Math.max(0, income - (expenditure * 12))
}

// Calculate net worth
const calculateNetWorth = (assets: number, property: number, liabilities: number, mortgage: number): number => {
  return assets + property - liabilities - mortgage
}

// Calculate emergency fund months
const calculateEmergencyMonths = (emergencyFund: number, monthlyExpenditure: number): number => {
  if (!monthlyExpenditure || monthlyExpenditure === 0) return 0
  return Math.round((emergencyFund / monthlyExpenditure) * 10) / 10
}

// PHASE 2: Enhanced recommendation with AI context
const generateRecommendation = (
  formData: SuitabilityDataEnhanced, 
  pulledData: PulledPlatformData,
  aiSuggestions: Record<string, AISuggestion>
): string => {
  const client = formData.personal_information || {}
  const partner = formData.partner_information || {}
  const objectives = formData.objectives || {}
  const financial = formData.financial_situation || {}
  const risk = formData.risk_assessment || {}
  
  // Include AI insights in recommendation
  const aiInsights = Object.values(aiSuggestions)
    .flatMap(s => s.insights)
    .filter(Boolean)
    .slice(0, 3) // Top 3 insights
  
  const name = client.client_name || 'the client'
  const hasPartner = ['Married', 'Civil Partnership'].includes(client.marital_status)
  const partnerText = hasPartner && partner.partner_name ? ` and ${partner.partner_name}` : ''
  
  // Use pulled data for more accurate risk assessment
  const riskLevel = pulledData.atrCategory || risk.attitude_to_risk || '4 - Medium Risk'
  const cflConstraint = pulledData.cflCategory || 'Medium'
  
  const primaryObjective = objectives.primary_objective || 'Balanced Growth'
  const timeHorizon = objectives.time_horizon || 10
  const investmentAmount = objectives.investment_amount || 100000
  const age = client.age || calculateAge(client.date_of_birth)
  
  // Smart retirement planning based on age
  const yearsToRetirement = Math.max(0, (client.target_retirement_age || 65) - age)
  const retirementFocus = yearsToRetirement < 10 ? 'pre-retirement planning' : 'long-term wealth accumulation'
  
  // Build enhanced recommendation
  let recommendation = `Based on the comprehensive assessment for ${name}${partnerText}, I recommend a ${primaryObjective.toLowerCase()} investment strategy aligned with their ${riskLevel.toLowerCase()} profile.

CLIENT PROFILE:
- Age: ${age} years${hasPartner ? ` (Partner: ${partner.partner_age || 'N/A'} years)` : ''}
- Employment: ${client.employment_status === 'employed' ? `${client.occupation} at ${client.employer}` : client.employment_status}
- Time to Retirement: ${yearsToRetirement} years
- Investment Objective: ${primaryObjective}
- Risk Profile: ${riskLevel}
- Capacity for Loss: ${cflConstraint}`

  // Add platform-pulled metrics
  if (pulledData.clientMetrics) {
    recommendation += `

VERIFIED FINANCIAL METRICS:
- Total Assets: £${Number(pulledData.clientMetrics.totalAssets || 0).toLocaleString()}
- Total Liabilities: £${Number(pulledData.clientMetrics.totalLiabilities || 0).toLocaleString()}
- Investment Experience: ${pulledData.clientMetrics.investmentExperience || 'Not specified'}`
  }

  recommendation += `

FINANCIAL SUMMARY:
- Annual Income: £${Number(financial.annual_income || 0).toLocaleString()}
- Monthly Expenditure: £${Number(financial.monthly_expenditure || 0).toLocaleString()}
- Disposable Income: £${Number(financial.disposable_income || 0).toLocaleString()} p.a.
- Net Worth: £${Number(financial.net_worth || 0).toLocaleString()}
- Emergency Fund: ${financial.emergency_months || '0'} months coverage
- Initial Investment: £${Number(investmentAmount).toLocaleString()}`

  // Add AI insights if available
  if (aiInsights.length > 0) {
    recommendation += `

AI-POWERED INSIGHTS:
${aiInsights.map((insight, i) => `${i + 1}. ${insight}`).join('\n')}`
  }

  // Add vulnerability considerations if flagged
  if (pulledData.vulnerabilityFactors && pulledData.vulnerabilityFactors.length > 0) {
    recommendation += `

SUPPORT CONSIDERATIONS:
- Identified vulnerability factors require enhanced support
- Recommend simplified communication and regular reviews
- Consider appointing trusted contact for oversight`
  }

  recommendation += `

KEY RECOMMENDATIONS:

1. Investment Strategy:
   • Asset Allocation: ${riskLevel.includes('1') || riskLevel.includes('2') ? 'Conservative 20/80' : 
                        riskLevel.includes('3') || riskLevel.includes('4') ? 'Balanced 60/40' : 
                        'Growth 80/20'} equity/bond split
   • Primary Focus: ${retirementFocus} with ${primaryObjective.toLowerCase()}
   • Diversification: Multi-asset approach across geographic regions

2. Risk Management:
   • Risk Profile: ${riskLevel} assessed through comprehensive ATR and CFL analysis
   • Maximum Drawdown Tolerance: ${risk.max_acceptable_loss || '15'}%
   • Review Triggers: Market volatility exceeding ${risk.max_acceptable_loss || '15'}%

3. Tax Efficiency:
   • ISA Allowance: Maximize £20,000 annual contribution
   • Pension Contributions: Consider salary sacrifice if employed
   • CGT Planning: Utilize annual exemption of £6,000

4. Income Strategy:
   • Time Horizon: ${timeHorizon} years allows for ${timeHorizon > 10 ? 'growth-focused accumulation' : 'balanced income generation'}
   • Regular Contributions: £${Number(objectives.additional_contributions || 0).toLocaleString()} monthly
   • Target Return: ${objectives.target_return || '5-7'}% p.a.

5. Protection Needs:
   ${hasPartner ? '• Life Insurance: Review coverage for both partners' : '• Life Insurance: Consider coverage based on dependents'}
   • Income Protection: ${client.employment_status === 'employed' ? 'Recommended to protect earnings' : 'Not currently required'}
   • Emergency Fund: ${financial.emergency_months < 3 ? 'Build to 3-6 months expenses' : 'Adequate coverage in place'}

IMPLEMENTATION PLAN:
1. Complete account opening documentation
2. Transfer initial investment within 5 working days
3. Establish regular contribution standing order
4. Schedule first review for 3 months
5. Annual reviews thereafter (or quarterly for high-risk profiles)

ONGOING SERVICE:
- Regular Portfolio Rebalancing
- Annual Tax Planning Review
- Life Event Reviews
- 24/7 Online Access
- Quarterly Performance Reports

REGULATORY COMPLIANCE:
This recommendation has been prepared in accordance with FCA requirements and meets the suitability criteria for:
✓ Client Objectives Alignment
✓ Risk Profile Suitability (ATR: ${pulledData.atrScore || 'N/A'}, CFL: ${pulledData.cflScore || 'N/A'})
✓ Affordability Assessment
✓ Best Interests Duty
✓ Consumer Duty Requirements

Prepared by: [ADVISOR_NAME]
Date: ${new Date().toLocaleDateString('en-GB')}
FCA Number: [FCA_NUMBER]`

  return recommendation
}

// ================================================================
// CROSS-SECTION VALIDATION RULES (KEEPING ALL YOUR ORIGINAL ONES)
// ================================================================

const crossSectionValidations: CrossSectionValidation[] = [
  {
    rule: 'Investment Amount vs Capacity',
    sections: ['objectives', 'financial_situation'],
    validate: (formData, pulledData) => {
      const investmentAmount = Number(formData.objectives?.investment_amount) || 0
      const disposableIncome = Number(formData.financial_situation?.disposable_income) || 0
      const liquidAssets = Number(formData.financial_situation?.liquid_assets) || 0
      
      const errors: EnhancedValidationError[] = []
      const warnings: ValidationWarning[] = []
      
      if (investmentAmount > liquidAssets) {
        errors.push({
          sectionId: 'objectives',
          fieldId: 'investment_amount',
          message: 'Investment amount exceeds available liquid assets',
          severity: 'error',
          code: 'CAPACITY_EXCEEDED'
        })
      }
      
      if (investmentAmount > disposableIncome * 2) {
        warnings.push({
          sectionId: 'objectives',
          fieldId: 'investment_amount',
          message: 'Investment amount is more than 2 years of disposable income',
          type: 'dataQuality'
        })
      }
      
      // Check against CFL if available
      if (pulledData.cflCategory === 'Low' && investmentAmount > liquidAssets * 0.3) {
        errors.push({
          sectionId: 'objectives',
          fieldId: 'investment_amount',
          message: 'Investment amount too high for Low capacity for loss profile',
          severity: 'error',
          code: 'CFL_VIOLATION'
        })
      }
      
      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        suggestions: warnings.length > 0 ? ['Consider reducing investment amount or phasing investment over time'] : []
      }
    }
  },
  {
    rule: 'Risk Profile Consistency',
    sections: ['risk_assessment', 'objectives'],
    validate: (formData, pulledData) => {
      const statedRisk = formData.risk_assessment?.attitude_to_risk || ''
      const timeHorizon = Number(formData.objectives?.time_horizon) || 0
      const objective = formData.objectives?.primary_objective || ''
      
      const errors: EnhancedValidationError[] = []
      const warnings: ValidationWarning[] = []
      
      // Short time horizon with high risk
      if (timeHorizon < 5 && (statedRisk.includes('6') || statedRisk.includes('7'))) {
        warnings.push({
          sectionId: 'risk_assessment',
          fieldId: 'attitude_to_risk',
          message: 'High risk profile may not be suitable for short time horizons',
          type: 'bestPractice'
        })
      }
      
      // Capital preservation with high risk
      if (objective === 'Capital Preservation' && !statedRisk.includes('1') && !statedRisk.includes('2')) {
        errors.push({
          sectionId: 'objectives',
          fieldId: 'primary_objective',
          message: 'Capital preservation objective conflicts with risk profile',
          severity: 'error',
          code: 'OBJECTIVE_RISK_CONFLICT'
        })
      }
      
      // Check ATR vs stated risk
      if (pulledData.atrScore) {
        const atrCategory = Math.floor(pulledData.atrScore / 15) + 1 // Convert to 1-7 scale
        const statedCategory = parseInt(statedRisk.match(/\d/)?.[0] || '4')
        
        if (Math.abs(atrCategory - statedCategory) > 2) {
          errors.push({
            sectionId: 'risk_assessment',
            fieldId: 'attitude_to_risk',
            message: `Significant mismatch between stated risk (${statedCategory}) and assessed risk (${atrCategory})`,
            severity: 'error',
            code: 'ATR_MISMATCH'
          })
        }
      }
      
      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        suggestions: errors.length > 0 ? ['Review risk assessment with client', 'Consider re-running ATR questionnaire'] : []
      }
    }
  },
  {
    rule: 'Age and Retirement Planning',
    sections: ['personal_information', 'objectives'],
    validate: (formData, pulledData) => {
      const age = formData.personal_information?.age || calculateAge(formData.personal_information?.date_of_birth)
      const retirementAge = Number(formData.personal_information?.target_retirement_age) || 65
      const timeHorizon = Number(formData.objectives?.time_horizon) || 0
      const objective = formData.objectives?.primary_objective || ''
      
      const errors: EnhancedValidationError[] = []
      const warnings: ValidationWarning[] = []
      
      const yearsToRetirement = retirementAge - age
      
      // Time horizon extends beyond retirement
      if (timeHorizon > yearsToRetirement && objective !== 'Estate Planning') {
        warnings.push({
          sectionId: 'objectives',
          fieldId: 'time_horizon',
          message: `Time horizon (${timeHorizon} years) extends beyond retirement age (${yearsToRetirement} years)`,
          type: 'bestPractice'
        })
      }
      
      // Near retirement with growth objectives
      if (yearsToRetirement < 5 && objective === 'Capital Growth') {
        warnings.push({
          sectionId: 'objectives',
          fieldId: 'primary_objective',
          message: 'Capital growth may not be suitable close to retirement',
          type: 'compliance'
        })
      }
      
      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        suggestions: warnings.length > 0 ? ['Consider retirement planning objectives', 'Review time horizon alignment'] : []
      }
    }
  }
]

// ================================================================
// ENHANCED SUITABILITY FORM STRUCTURE (KEEPING ALL YOUR 13 SECTIONS)
// ================================================================

const suitabilitySections: SuitabilitySectionEnhanced[] = [
  // KEEPING ALL YOUR COMPLETE SECTION DEFINITIONS
  {
    id: 'personal_information',
    title: '1. Personal Information',
    icon: User,
    status: 'incomplete',
    aiEnabled: true,
    pulledDataFields: ['client_name', 'date_of_birth', 'marital_status', 'employment_status'],
    fields: [
      { 
        id: 'client_name', 
        label: 'Full Name', 
        type: 'text', 
        required: true, 
        placeholder: 'Mr John Smith',
        pullFrom: 'client.personalDetails',
        aiSuggested: false
      },
      { 
        id: 'client_reference', 
        label: 'Client Reference', 
        type: 'text', 
        required: true, 
        autoGenerate: true, 
        placeholder: 'Auto-generated',
        helpText: 'Unique identifier for this client'
      },
      { 
        id: 'date_of_birth', 
        label: 'Date of Birth', 
        type: 'date', 
        required: true,
        pullFrom: 'client.personalDetails.dateOfBirth',
        validateWith: (value) => {
          const age = calculateAge(value)
          if (age < 18) return 'Client must be 18 or older'
          if (age > 100) return 'Please verify date of birth'
          return null
        }
      },
      { 
        id: 'age', 
        label: 'Age', 
        type: 'number', 
        calculate: 'age', 
        placeholder: 'Auto-calculated',
        helpText: 'Calculated from date of birth'
      },
      { 
        id: 'national_insurance', 
        label: 'National Insurance Number', 
        type: 'text', 
        placeholder: 'AB 12 34 56 C', 
        validation: 'ni',
        validateWith: (value) => {
          if (!value) return null
          const niRegex = /^[A-Z]{2}\s?\d{2}\s?\d{2}\s?\d{2}\s?[A-Z]$/
          if (!niRegex.test(value.toUpperCase().replace(/\s/g, ' '))) {
            return 'Invalid NI number format'
          }
          return null
        }
      },
      { 
        id: 'marital_status', 
        label: 'Marital Status', 
        type: 'select', 
        options: ['Single', 'Married', 'Divorced', 'Widowed', 'Civil Partnership'], 
        required: true,
        pullFrom: 'client.personalDetails.maritalStatus'
      },
      { 
        id: 'dependents', 
        label: 'Number of Dependents', 
        type: 'number', 
        placeholder: '0',
        pullFrom: 'client.personalDetails.dependents',
        validateWith: (value) => {
          if (value < 0) return 'Cannot be negative'
          if (value > 20) return 'Please verify number of dependents'
          return null
        }
      },
      { 
        id: 'employment_status', 
        label: 'Employment Status', 
        type: 'select', 
        options: ['Employed', 'Self-Employed', 'Retired', 'Not Working'], 
        required: true,
        pullFrom: 'client.personalDetails.employmentStatus'
      },
      { 
        id: 'target_retirement_age', 
        label: 'Target Retirement Age', 
        type: 'number', 
        placeholder: '65', 
        smartDefault: (data, pulled) => {
          const age = data.personal_information?.age || 30
          // AI-suggested retirement age based on occupation
          return Math.max(age + 10, 65)
        },
        aiSuggested: true,
        validateWith: (value, formData) => {
          const currentAge = formData.personal_information?.age || 0
          if (value <= currentAge) return 'Retirement age must be in the future'
          if (value > 100) return 'Please verify retirement age'
          return null
        }
      }
    ],
    conditionalFields: [
      {
        condition: (data) => ['Married', 'Civil Partnership'].includes(data.personal_information?.marital_status),
        aiReason: 'Partner information required for joint assessments and protection planning',
        fields: [
          { id: 'partner_name', label: 'Partner\'s Full Name', type: 'text', placeholder: 'Mrs Jane Smith' },
          { id: 'partner_date_of_birth', label: 'Partner\'s Date of Birth', type: 'date' },
          { id: 'partner_age', label: 'Partner\'s Age', type: 'number', calculate: 'partner_age', placeholder: 'Auto-calculated' },
          { id: 'partner_ni', label: 'Partner\'s NI Number', type: 'text', placeholder: 'CD 34 56 78 E' },
          { id: 'partner_employment_status', label: 'Partner\'s Employment Status', type: 'select', options: ['Employed', 'Self-Employed', 'Retired', 'Not Working'] },
          { id: 'joint_assessment', label: 'Is this a joint assessment?', type: 'radio', options: ['Yes', 'No'] }
        ]
      },
      {
        condition: (data) => data.personal_information?.employment_status === 'Employed',
        aiReason: 'Employment details needed for income verification and protection planning',
        fields: [
          { 
            id: 'occupation', 
            label: 'Occupation', 
            type: 'text', 
            required: true, 
            placeholder: 'Financial Manager',
            pullFrom: 'client.personalDetails.occupation',
            aiSuggested: true
          },
          { id: 'employer', label: 'Employer', type: 'text', required: true, placeholder: 'ABC Corporation Ltd' },
          { id: 'employment_duration', label: 'Years with Current Employer', type: 'number', placeholder: '5' },
          { 
            id: 'employment_sector', 
            label: 'Employment Sector', 
            type: 'select', 
            options: ['Finance', 'Technology', 'Healthcare', 'Education', 'Manufacturing', 'Retail', 'Other'],
            smartDefault: (data) => {
              // AI suggestion based on occupation
              const occupation = data.personal_information?.occupation?.toLowerCase() || ''
              if (occupation.includes('teacher') || occupation.includes('professor')) return 'Education'
              if (occupation.includes('doctor') || occupation.includes('nurse')) return 'Healthcare'
              if (occupation.includes('engineer') || occupation.includes('developer')) return 'Technology'
              if (occupation.includes('banker') || occupation.includes('accountant')) return 'Finance'
              return 'Other'
            },
            aiSuggested: true
          }
        ]
      },
      {
        condition: (data) => data.personal_information?.employment_status === 'Self-Employed',
        fields: [
          { id: 'business_name', label: 'Business Name', type: 'text', required: true },
          { id: 'business_type', label: 'Type of Business', type: 'text', required: true },
          { id: 'years_trading', label: 'Years Trading', type: 'number' },
          { id: 'business_structure', label: 'Business Structure', type: 'select', options: ['Sole Trader', 'Limited Company', 'Partnership', 'LLP'] }
        ]
      },
      {
        condition: (data) => data.personal_information?.employment_status === 'Retired',
        fields: [
          { id: 'retirement_date', label: 'Retirement Date', type: 'date' },
          { id: 'previous_occupation', label: 'Previous Occupation', type: 'text' },
          { id: 'pension_income', label: 'Annual Pension Income (£)', type: 'number', placeholder: '25000' }
        ]
      }
    ]
  },
  // ... ALL YOUR OTHER 12 SECTIONS REMAIN EXACTLY THE SAME ...
  {
    id: 'contact_details',
    title: '2. Contact Details',
    icon: Home,
    status: 'incomplete',
    aiEnabled: false,
    pulledDataFields: ['address', 'phone', 'email'],
    fields: [
      { 
        id: 'address', 
        label: 'Full Address', 
        type: 'textarea', 
        required: true, 
        placeholder: '123 Main Street\nLondon\nSW1A 1AA',
        pullFrom: 'client.contactInfo.address'
      },
      { 
        id: 'phone', 
        label: 'Phone Number', 
        type: 'tel', 
        required: true, 
        placeholder: '07123 456789',
        pullFrom: 'client.contactInfo.phone',
        validateWith: (value) => {
          if (!isValidUKPhone(value)) return 'Please enter a valid UK phone number'
          return null
        }
      },
      { 
        id: 'email', 
        label: 'Email Address', 
        type: 'email', 
        required: true, 
        placeholder: 'john.smith@email.com',
        pullFrom: 'client.contactInfo.email',
        validateWith: (value) => {
          if (!isValidEmail(value)) return 'Please enter a valid email address'
          return null
        }
      },
      { 
        id: 'preferred_contact', 
        label: 'Preferred Contact Method', 
        type: 'select', 
        options: ['Email', 'Phone', 'Post', 'Text'], 
        required: true,
        pullFrom: 'client.contactInfo.preferredContact'
      },
      { 
        id: 'best_contact_time', 
        label: 'Best Time to Contact', 
        type: 'select', 
        options: ['Morning (9am-12pm)', 'Afternoon (12pm-5pm)', 'Evening (5pm-8pm)', 'Anytime'],
        smartDefault: (data) => {
          // Default based on employment status
          if (data.personal_information?.employment_status === 'Retired') return 'Anytime'
          if (data.personal_information?.employment_status === 'Employed') return 'Evening (5pm-8pm)'
          return 'Afternoon (12pm-5pm)'
        }
      }
    ]
  },
  {
    id: 'objectives',
    title: '3. Investment Objectives',
    icon: Target,
    status: 'incomplete',
    aiEnabled: true,
    chartEnabled: true,
    fields: [
      { 
        id: 'primary_objective', 
        label: 'Primary Investment Objective', 
        type: 'select', 
        options: ['Capital Growth', 'Income Generation', 'Capital Preservation', 'Balanced Growth', 'Retirement Planning', 'Tax Planning'], 
        required: true,
        smartDefault: (data, pulled) => {
          const age = data.personal_information?.age || 30
          const yearsToRetirement = (data.personal_information?.target_retirement_age || 65) - age
          
          if (yearsToRetirement < 5) return 'Capital Preservation'
          if (yearsToRetirement < 10) return 'Balanced Growth'
          if (age < 40) return 'Capital Growth'
          return 'Balanced Growth'
        },
        aiSuggested: true
      },
      { 
        id: 'secondary_objectives', 
        label: 'Secondary Objectives', 
        type: 'checkbox', 
        options: ['Build Emergency Fund', 'Save for Property', 'Children\'s Education', 'Early Retirement', 'Estate Planning', 'Charitable Giving'] 
      },
      { 
        id: 'time_horizon', 
        label: 'Investment Time Horizon (Years)', 
        type: 'number', 
        required: true, 
        placeholder: '10',
        smartDefault: (data) => {
          const age = data.personal_information?.age || 30
          const retirementAge = data.personal_information?.target_retirement_age || 65
          return Math.max(5, retirementAge - age)
        },
        validateWith: (value, formData, pulled) => {
          if (value < 1) return 'Time horizon must be at least 1 year'
          if (pulled.cflCategory === 'Low' && value < 5) {
            return 'Short time horizons may not be suitable with low capacity for loss'
          }
          return null
        }
      },
      { 
        id: 'investment_amount', 
        label: 'Initial Investment Amount (£)', 
        type: 'number', 
        required: true, 
        placeholder: '50000',
        validateWith: (value, formData, pulled) => {
          const liquidAssets = formData.financial_situation?.liquid_assets || 0
          if (value > liquidAssets) {
            return 'Investment amount exceeds available liquid assets'
          }
          if (pulled.cflScore && pulled.cflScore < 30 && value > liquidAssets * 0.3) {
            return 'Investment amount too high for your capacity for loss profile'
          }
          return null
        }
      },
      { 
        id: 'additional_contributions', 
        label: 'Regular Monthly Contributions (£)', 
        type: 'number', 
        placeholder: '500',
        smartDefault: (data) => {
          const disposable = data.financial_situation?.disposable_income || 0
          return Math.floor(disposable / 12 * 0.2) // 20% of monthly disposable
        },
        aiSuggested: true
      },
      { 
        id: 'target_return', 
        label: 'Target Annual Return (%)', 
        type: 'number', 
        placeholder: '6',
        smartDefault: (data, pulled) => {
          const riskLevel = pulled.atrScore || 50
          if (riskLevel < 30) return 3
          if (riskLevel < 60) return 5
          return 7
        },
        aiSuggested: true
      },
      { id: 'income_requirement', label: 'Annual Income Requirement (£)', type: 'number', placeholder: '0' },
      { 
        id: 'specific_goals', 
        label: 'Specific Financial Goals', 
        type: 'textarea', 
        placeholder: 'Please describe any specific goals or milestones...',
        aiSuggested: true
      }
    ],
    conditionalFields: [
      {
        condition: (data) => data.objectives?.primary_objective === 'Retirement Planning',
        aiReason: 'Detailed retirement planning information needed',
        fields: [
          { 
            id: 'retirement_income_target', 
            label: 'Target Retirement Income (£ p.a.)', 
            type: 'number', 
            required: true,
            smartDefault: (data) => {
              const currentIncome = data.financial_situation?.annual_income || 0
              return Math.floor(currentIncome * 0.7) // 70% income replacement
            }
          },
          { id: 'state_pension_forecast', label: 'State Pension Forecast (£ p.a.)', type: 'number' },
          { id: 'other_pension_income', label: 'Other Pension Income (£ p.a.)', type: 'number' },
          { id: 'retirement_lifestyle', label: 'Retirement Lifestyle Plans', type: 'textarea' }
        ]
      },
      {
        condition: (data) => data.objectives?.secondary_objectives?.includes('Children\'s Education'),
        fields: [
          { id: 'number_of_children', label: 'Number of Children', type: 'number', required: true },
          { id: 'education_timeline', label: 'Years Until University', type: 'number' },
          { id: 'education_fund_target', label: 'Target Education Fund (£)', type: 'number' }
        ]
      }
    ]
  },
  {
    id: 'financial_situation',
    title: '4. Financial Situation',
    icon: PoundSterling,
    status: 'incomplete',
    aiEnabled: true,
    chartEnabled: true,
    pulledDataFields: ['annual_income', 'monthly_expenditure', 'liquid_assets', 'net_worth'],
    fields: [
      { 
        id: 'annual_income', 
        label: 'Annual Gross Income (£)', 
        type: 'number', 
        required: true, 
        placeholder: '60000',
        pullFrom: 'client.financialProfile.annualIncome',
        validateWith: (value, formData) => {
          if (value < 0) return 'Income cannot be negative'
          if (formData.personal_information?.employment_status === 'Not Working' && value > 0) {
            return 'Please verify income source'
          }
          return null
        }
      },
      { 
        id: 'monthly_expenditure', 
        label: 'Monthly Expenditure (£)', 
        type: 'number', 
        required: true, 
        placeholder: '3500',
        pullFrom: 'client.financialProfile.monthlyExpenses',
        validateWith: (value, formData) => {
          const monthlyIncome = (formData.financial_situation?.annual_income || 0) / 12
          if (value > monthlyIncome * 1.2) {
            return 'Expenditure significantly exceeds income - please verify'
          }
          return null
        }
      },
      { 
        id: 'disposable_income', 
        label: 'Annual Disposable Income (£)', 
        type: 'number', 
        calculate: 'disposable', 
        placeholder: 'Auto-calculated',
        helpText: 'Annual income minus annual expenditure'
      },
      { 
        id: 'liquid_assets', 
        label: 'Liquid Assets/Savings (£)', 
        type: 'number', 
        placeholder: '25000',
        pullFrom: 'client.financialProfile.liquidAssets'
      },
      { 
        id: 'property_value', 
        label: 'Property Value (£)', 
        type: 'number', 
        placeholder: '450000',
        helpText: 'Current market value of all properties'
      },
      { 
        id: 'outstanding_mortgage', 
        label: 'Outstanding Mortgage (£)', 
        type: 'number', 
        placeholder: '250000' 
      },
      { 
        id: 'other_liabilities', 
        label: 'Other Liabilities (£)', 
        type: 'number', 
        placeholder: '5000',
        helpText: 'Credit cards, loans, etc.'
      },
      { 
        id: 'net_worth', 
        label: 'Total Net Worth (£)', 
        type: 'number', 
        calculate: 'net_worth', 
        placeholder: 'Auto-calculated',
        pullFrom: 'client.financialProfile.netWorth'
      },
      { 
        id: 'emergency_fund', 
        label: 'Emergency Fund (£)', 
        type: 'number', 
        placeholder: '15000',
        smartDefault: (data) => {
          const monthly = data.financial_situation?.monthly_expenditure || 0
          return monthly * 6 // 6 months expenses
        },
        aiSuggested: true
      },
      { 
        id: 'emergency_months', 
        label: 'Emergency Fund Coverage', 
        type: 'text', 
        calculate: 'emergency_months', 
        placeholder: 'Auto-calculated',
        helpText: 'Number of months covered by emergency fund'
      }
    ],
    conditionalFields: [
      {
        condition: (data) => data.personal_information?.marital_status === 'Married' || data.personal_information?.marital_status === 'Civil Partnership',
        fields: [
          { id: 'partner_annual_income', label: 'Partner\'s Annual Income (£)', type: 'number' },
          { id: 'joint_monthly_expenditure', label: 'Joint Monthly Expenditure (£)', type: 'number' },
          { id: 'partner_assets', label: 'Partner\'s Assets (£)', type: 'number' },
          { id: 'partner_liabilities', label: 'Partner\'s Liabilities (£)', type: 'number' }
        ]
      }
    ]
  },
  {
    id: 'risk_assessment',
    title: '5. Risk Assessment',
    icon: Shield,
    status: 'incomplete',
    aiEnabled: true,
    chartEnabled: true,
    pulledDataFields: ['attitude_to_risk', 'risk_capacity_score'],
    fields: [
      { 
        id: 'attitude_to_risk', 
        label: 'Attitude to Risk (1-7)', 
        type: 'select', 
        options: ['1 - Very Low Risk', '2 - Low Risk', '3 - Low to Medium Risk', '4 - Medium Risk', '5 - Medium to High Risk', '6 - High Risk', '7 - Very High Risk'], 
        required: true,
        smartDefault: (data, pulled) => {
          if (pulled.atrScore) {
            const category = Math.min(7, Math.max(1, Math.floor(pulled.atrScore / 15) + 1))
            const labels = ['Very Low Risk', 'Low Risk', 'Low to Medium Risk', 'Medium Risk', 'Medium to High Risk', 'High Risk', 'Very High Risk']
            return `${category} - ${labels[category - 1]}`
          }
          return '4 - Medium Risk'
        },
        aiSuggested: true,
        validateWith: (value, formData, pulled) => {
          if (pulled.atrCategory) {
            const statedRisk = parseInt(value.match(/\d/)?.[0] || '4')
            const assessedRisk = Math.floor((pulled.atrScore ?? 0) / 15) + 1
            if (Math.abs(statedRisk - assessedRisk) > 2) {
              return `Significant mismatch with ATR assessment (${pulled.atrCategory})`
            }
          }
          return null
        }
      },
      { 
        id: 'max_acceptable_loss', 
        label: 'Maximum Acceptable Loss (%)', 
        type: 'number', 
        required: true, 
        placeholder: '15',
        smartDefault: (data, pulled) => {
          const riskLevel = data.risk_assessment?.attitude_to_risk || '4'
          const riskNum = parseInt(riskLevel.match(/\d/)?.[0] || '4')
          return riskNum * 5 // Simple formula: 5% per risk level
        },
        validateWith: (value, formData, pulled) => {
          if (pulled.cflCategory === 'Low' && value > 20) {
            return 'High loss tolerance conflicts with low capacity for loss'
          }
          return null
        }
      },
      { 
        id: 'risk_experience', 
        label: 'Investment Experience', 
        type: 'select', 
        options: ['None', 'Limited (1-3 years)', 'Moderate (3-7 years)', 'Extensive (7-15 years)', 'Professional (15+ years)'], 
        required: true,
        pullFrom: 'pulled.clientMetrics.investmentExperience'
      },
      { 
        id: 'volatility_comfort', 
        label: 'Comfort with Market Volatility', 
        type: 'radio', 
        options: ['Very Uncomfortable', 'Uncomfortable', 'Neutral', 'Comfortable', 'Very Comfortable'], 
        required: true 
      },
      { 
        id: 'previous_losses', 
        label: 'Previous Investment Losses?', 
        type: 'radio', 
        options: ['Yes', 'No'], 
        required: true 
      },
      { 
        id: 'risk_capacity_score', 
        label: 'Capacity for Loss Score', 
        type: 'select', 
        options: ['Low', 'Medium', 'High'], 
        required: true,
        smartDefault: (data, pulled) => {
          if (pulled.cflCategory) return pulled.cflCategory
          // Calculate based on financial situation
          const netWorth = data.financial_situation?.net_worth || 0
          const investment = data.objectives?.investment_amount || 0
          const ratio = investment / netWorth
          
          if (ratio > 0.5) return 'Low'
          if (ratio > 0.2) return 'Medium'
          return 'High'
        },
        aiSuggested: true
      },
      { 
        id: 'risk_reconciliation', 
        label: 'Risk Profile Notes', 
        type: 'textarea', 
        placeholder: 'Any differences between ATR and CFL assessments...',
        smartDefault: (data, pulled) => {
          if (pulled.atrScore && pulled.cflScore) {
            const atrCategory = Math.floor((pulled.atrScore ?? 0) / 15) + 1
            const cflCategory = pulled.cflCategory === 'Low' ? 2 : pulled.cflCategory === 'High' ? 6 : 4
            
            if (Math.abs(atrCategory - cflCategory) > 2) {
              return `Note: Significant difference between attitude to risk (${pulled.atrCategory}) and capacity for loss (${pulled.cflCategory}). Recommend using more conservative profile for suitability.`
            }
          }
          return ''
        },
        aiSuggested: true
      }
    ],
    conditionalFields: [
      {
        condition: (data) => data.risk_assessment?.previous_losses === 'Yes',
        aiReason: 'Understanding previous loss experience helps refine risk assessment',
        fields: [
          { id: 'loss_amount', label: 'Approximate Loss Amount (£)', type: 'number' },
          { id: 'loss_impact', label: 'Impact of Loss', type: 'select', options: ['Minimal', 'Moderate', 'Significant', 'Severe'] },
          { id: 'loss_learning', label: 'Lessons Learned', type: 'textarea', placeholder: 'What did you learn from this experience?' }
        ]
      }
    ]
  },
  {
    id: 'knowledge_experience',
    title: '6. Knowledge & Experience',
    icon: BookOpen,
    status: 'incomplete',
    aiEnabled: true,
    fields: [
      { 
        id: 'investment_knowledge', 
        label: 'Investment Knowledge Level', 
        type: 'select', 
        options: ['Basic', 'Intermediate', 'Advanced', 'Expert'], 
        required: true,
        smartDefault: (data, pulled) => {
          const experience = data.risk_assessment?.risk_experience || 'None'
          if (experience.includes('Professional')) return 'Expert'
          if (experience.includes('Extensive')) return 'Advanced'
          if (experience.includes('Moderate')) return 'Intermediate'
          return 'Basic'
        }
      },
      { 
        id: 'investment_types_known', 
        label: 'Familiar Investment Types', 
        type: 'checkbox', 
        options: ['Cash/Savings', 'Government Bonds', 'Corporate Bonds', 'UK Equities', 'International Equities', 'Property/REITs', 'Commodities', 'Derivatives', 'Structured Products', 'Alternative Investments'] 
      },
      { 
        id: 'current_investments', 
        label: 'Currently Hold Investments?', 
        type: 'radio', 
        options: ['Yes', 'No'], 
        required: true 
      },
      { 
        id: 'professional_qualifications', 
        label: 'Financial Qualifications', 
        type: 'text', 
        placeholder: 'e.g., ACCA, CFA, None' 
      },
      { 
        id: 'information_sources', 
        label: 'Investment Information Sources', 
        type: 'checkbox', 
        options: ['Financial Press', 'Online Research', 'Professional Advice', 'Friends/Family', 'Social Media', 'None'] 
      },
      { 
        id: 'education_needs', 
        label: 'Areas Requiring Education', 
        type: 'textarea', 
        placeholder: 'Which investment topics would you like to understand better?',
        smartDefault: (data) => {
          const knowledge = data.knowledge_experience?.investment_knowledge || 'Basic'
          if (knowledge === 'Basic') {
            return 'Would benefit from education on: investment basics, risk and return, diversification, and tax efficiency'
          }
          return ''
        },
        aiSuggested: true
      }
    ],
    conditionalFields: [
      {
        condition: (data) => data.knowledge_experience?.current_investments === 'Yes',
        fields: [
          { id: 'portfolio_value', label: 'Current Portfolio Value (£)', type: 'number' },
          { id: 'portfolio_composition', label: 'Portfolio Composition', type: 'textarea', placeholder: 'Describe your current holdings...' },
          { id: 'investment_performance', label: 'Performance Satisfaction', type: 'select', options: ['Very Satisfied', 'Satisfied', 'Neutral', 'Dissatisfied', 'Very Dissatisfied'] },
          { id: 'current_adviser', label: 'Currently Using Another Adviser?', type: 'radio', options: ['Yes', 'No'] }
        ]
      }
    ]
  },
  {
    id: 'existing_arrangements',
    title: '7. Existing Financial Arrangements',
    icon: Briefcase,
    status: 'incomplete',
    aiEnabled: true,
    fields: [
      { id: 'has_pension', label: 'Existing Pension Arrangements?', type: 'radio', options: ['Yes', 'No'], required: true },
      { id: 'has_protection', label: 'Life/Health Insurance?', type: 'radio', options: ['Yes', 'No'], required: true },
      { id: 'has_mortgage_protection', label: 'Mortgage Protection?', type: 'radio', options: ['Yes', 'No', 'N/A - No Mortgage'], required: true },
      { id: 'has_will', label: 'Valid Will in Place?', type: 'radio', options: ['Yes', 'No'], required: true },
      { id: 'has_lpa', label: 'Lasting Power of Attorney?', type: 'radio', options: ['Yes', 'No'], required: true },
      { 
        id: 'estate_planning_needs', 
        label: 'Estate Planning Priorities', 
        type: 'textarea', 
        placeholder: 'Any specific estate planning concerns or objectives...',
        smartDefault: (data) => {
          const hasPartner = ['Married', 'Civil Partnership'].includes(data.personal_information?.marital_status)
          const hasDependents = (data.personal_information?.dependents || 0) > 0
          
          if (hasPartner || hasDependents) {
            return 'Priority: Ensure adequate provision for family members. Consider life insurance and will updates.'
          }
          return ''
        },
        aiSuggested: true
      }
    ],
    conditionalFields: [
      {
        condition: (data) => data.existing_arrangements?.has_pension === 'Yes',
        fields: [
          { id: 'pension_providers', label: 'Pension Providers', type: 'textarea', placeholder: 'List all pension providers and approximate values...' },
          { id: 'total_pension_value', label: 'Total Pension Value (£)', type: 'number' },
          { id: 'pension_contributions', label: 'Monthly Pension Contributions (£)', type: 'number' },
          { id: 'pension_review_needed', label: 'Pension Review Required?', type: 'radio', options: ['Yes', 'No', 'Unsure'] }
        ]
      },
      {
        condition: (data) => data.existing_arrangements?.has_protection === 'Yes',
        fields: [
          { id: 'life_cover_amount', label: 'Life Cover Amount (£)', type: 'number' },
          { id: 'critical_illness_cover', label: 'Critical Illness Cover (£)', type: 'number' },
          { id: 'income_protection', label: 'Income Protection (£/month)', type: 'number' },
          { id: 'protection_review_needed', label: 'Protection Review Required?', type: 'radio', options: ['Yes', 'No', 'Unsure'] }
        ]
      }
    ]
  },
  {
    id: 'vulnerability_assessment',
    title: '8. Vulnerability & Support Needs',
    icon: Heart,
    status: 'incomplete',
    aiEnabled: true,
    pulledDataFields: ['health_concerns', 'life_events', 'vulnerability_notes'],
    fields: [
      { 
        id: 'health_concerns', 
        label: 'Any Health Concerns?', 
        type: 'radio', 
        options: ['None', 'Minor', 'Moderate', 'Significant'], 
        required: true,
        smartDefault: (data, pulled) => {
          if (pulled.vulnerabilityScore === 'High') return 'Moderate'
          return 'None'
        }
      },
      { 
        id: 'cognitive_ability', 
        label: 'Decision-Making Confidence', 
        type: 'select', 
        options: ['Very Confident', 'Confident', 'Somewhat Confident', 'Need Support'], 
        required: true 
      },
      { 
        id: 'life_events', 
        label: 'Recent Life Events', 
        type: 'checkbox', 
        options: ['None', 'Bereavement', 'Divorce', 'Job Loss', 'Health Diagnosis', 'Financial Difficulty', 'Other'],
        pullFrom: 'pulled.vulnerabilityFactors'
      },
      { 
        id: 'support_network', 
        label: 'Support Network Available?', 
        type: 'radio', 
        options: ['Strong', 'Moderate', 'Limited', 'None'], 
        required: true 
      },
      { 
        id: 'communication_preferences', 
        label: 'Communication Adjustments Needed?', 
        type: 'checkbox', 
        options: ['None', 'Large Print', 'Audio', 'Simplified Language', 'Extra Time', 'Third Party Present'] 
      },
      { 
        id: 'vulnerability_notes', 
        label: 'Additional Support Requirements', 
        type: 'textarea', 
        placeholder: 'Any other support needs or considerations...',
        pullFrom: 'client.vulnerabilityAssessment.assessmentNotes'
      }
    ],
    conditionalFields: [
      {
        condition: (data) => data.vulnerability_assessment?.life_events?.includes('Other'),
        fields: [
          { id: 'other_life_event', label: 'Please Specify Other Life Event', type: 'text', required: true }
        ]
      }
    ]
  },
  {
    id: 'regulatory_compliance',
    title: '9. Regulatory & Compliance',
    icon: Shield,
    status: 'incomplete',
    aiEnabled: false,
    fields: [
      { 
        id: 'advice_scope', 
        label: 'Scope of Advice', 
        type: 'select', 
        options: ['Investment Only', 'Holistic Financial Planning', 'Pension Transfer', 'Retirement Planning', 'Protection Planning'], 
        required: true 
      },
      { 
        id: 'service_level', 
        label: 'Ongoing Service Level', 
        type: 'select', 
        options: ['Execution Only', 'Advisory', 'Discretionary Management'], 
        required: true 
      },
      { 
        id: 'politically_exposed', 
        label: 'Politically Exposed Person?', 
        type: 'radio', 
        options: ['Yes', 'No'], 
        required: true 
      },
      { 
        id: 'source_of_wealth', 
        label: 'Source of Wealth', 
        type: 'select', 
        options: ['Employment', 'Business Income', 'Inheritance', 'Property', 'Investments', 'Other'], 
        required: true 
      },
      { 
        id: 'data_protection_consent', 
        label: 'Data Protection Consent', 
        type: 'radio', 
        options: ['Given', 'Declined'], 
        required: true 
      },
      { 
        id: 'marketing_consent', 
        label: 'Marketing Communications', 
        type: 'radio', 
        options: ['Yes', 'No'] 
      },
      { 
        id: 'complaints_acknowledged', 
        label: 'Complaints Procedure Acknowledged', 
        type: 'radio', 
        options: ['Yes', 'No'], 
        required: true 
      }
    ],
    conditionalFields: [
      {
        condition: (data) => data.regulatory_compliance?.politically_exposed === 'Yes',
        fields: [
          { id: 'pep_position', label: 'Position/Role', type: 'text', required: true },
          { id: 'pep_country', label: 'Country', type: 'text', required: true },
          { id: 'pep_dates', label: 'Dates in Position', type: 'text', required: true }
        ]
      },
      {
        condition: (data) => data.regulatory_compliance?.source_of_wealth === 'Other',
        fields: [
          { id: 'wealth_source_details', label: 'Please Specify Source of Wealth', type: 'textarea', required: true }
        ]
      }
    ]
  },
  {
    id: 'recommendation',
    title: '10. Recommendation',
    icon: TrendingUp,
    status: 'incomplete',
    aiEnabled: true,
    chartEnabled: true,
    fields: [
      { 
        id: 'recommendation_summary', 
        label: 'Recommendation Summary', 
        type: 'textarea', 
        required: true, 
        placeholder: 'Click Generate Recommendation button to auto-populate',
        aiSuggested: true
      },
      { 
        id: 'product_selection', 
        label: 'Recommended Products', 
        type: 'checkbox', 
        options: ['ISA', 'General Investment Account', 'SIPP', 'Offshore Bond', 'Onshore Bond', 'VCT', 'EIS'],
        smartDefault: (data, pulled) => {
          const recommendations: string[] = [] // Fix: Explicitly type as string array
          const age = data.personal_information?.age || 30
          const objective = data.objectives?.primary_objective
          
          // Always recommend ISA for tax efficiency
          recommendations.push('ISA')
          
          // Pension for retirement planning
          if (objective === 'Retirement Planning' || age > 40) {
            recommendations.push('SIPP')
          }
          
          // GIA for amounts over ISA allowance
          const investment = data.objectives?.investment_amount || 0
          if (investment > 20000) {
            recommendations.push('General Investment Account')
          }
          
          return recommendations
        },
        aiSuggested: true
      },
      { 
        id: 'platform_recommendation', 
        label: 'Recommended Platform', 
        type: 'select', 
        options: ['Platform A', 'Platform B', 'Platform C', 'Direct'], 
        required: true 
      },
      { 
        id: 'asset_allocation', 
        label: 'Asset Allocation Strategy', 
        type: 'textarea', 
        placeholder: 'Describe the recommended asset allocation...',
        smartDefault: (data, pulled) => {
          const riskLevel = data.risk_assessment?.attitude_to_risk || '4'
          const riskNum = parseInt(riskLevel.match(/\d/)?.[0] || '4')
          
          if (riskNum <= 2) {
            return 'Conservative allocation: 20% Equities (diversified global), 70% Bonds (government and investment grade corporate), 10% Cash/Alternatives'
          } else if (riskNum <= 4) {
            return 'Balanced allocation: 60% Equities (40% UK, 20% International), 35% Bonds (mixed duration), 5% Alternatives'
          } else {
            return 'Growth allocation: 80% Equities (30% UK, 50% International including emerging markets), 15% Bonds, 5% Alternatives'
          }
        },
        aiSuggested: true
      },
      { 
        id: 'implementation_timeline', 
        label: 'Implementation Timeline', 
        type: 'select', 
        options: ['Immediate', 'Phased - 3 months', 'Phased - 6 months', 'Phased - 12 months'],
        smartDefault: (data, pulled) => {
          const amount = data.objectives?.investment_amount || 0
          const volatility = data.risk_assessment?.volatility_comfort || 'Neutral'
          
          if (amount > 100000 && volatility !== 'Very Comfortable') {
            return 'Phased - 6 months'
          }
          return 'Immediate'
        }
      },
      { 
        id: 'review_frequency', 
        label: 'Review Frequency', 
        type: 'select', 
        options: ['Quarterly', 'Bi-annual', 'Annual', 'Ad-hoc'], 
        required: true,
        smartDefault: (data, pulled) => {
          const riskLevel = data.risk_assessment?.attitude_to_risk || '4'
          const hasVulnerabilities = (pulled.vulnerabilityFactors?.length || 0) > 0
          
          if (hasVulnerabilities) return 'Quarterly'
          if (riskLevel.includes('6') || riskLevel.includes('7')) return 'Quarterly'
          if (riskLevel.includes('1') || riskLevel.includes('2')) return 'Annual'
          return 'Bi-annual'
        },
        aiSuggested: true
      }
    ]
  },
  {
    id: 'suitability_declaration',
    title: '11. Suitability Assessment',
    icon: FileCheck,
    status: 'incomplete',
    aiEnabled: true,
    fields: [
      { 
        id: 'meets_objectives', 
        label: 'Meets Client Objectives?', 
        type: 'radio', 
        options: ['Yes', 'No'], 
        required: true 
      },
      { 
        id: 'objectives_explanation', 
        label: 'Objectives Alignment Explanation', 
        type: 'textarea', 
        required: true, 
        placeholder: 'Explain how the recommendation meets client objectives...',
        smartDefault: (data) => {
          const objective = data.objectives?.primary_objective || 'growth'
          const timeHorizon = data.objectives?.time_horizon || 10
          const allocation = data.recommendation?.asset_allocation || ''
          
          return `The recommended strategy aligns with the client's ${objective} objective over a ${timeHorizon} year time horizon. ${allocation.includes('Conservative') ? 'The conservative allocation prioritizes capital preservation while providing modest growth potential.' : allocation.includes('Growth') ? 'The growth-oriented allocation maximizes long-term capital appreciation potential.' : 'The balanced allocation provides an optimal mix of growth and stability.'}`
        },
        aiSuggested: true
      },
      { 
        id: 'suitable_risk', 
        label: 'Suitable for Risk Profile?', 
        type: 'radio', 
        options: ['Yes', 'No'], 
        required: true 
      },
      { 
        id: 'risk_explanation', 
        label: 'Risk Suitability Explanation', 
        type: 'textarea', 
        required: true, 
        placeholder: 'Explain risk assessment and suitability...',
        smartDefault: (data, pulled) => {
          const atrScore = pulled.atrScore || 'Not assessed'
          const cflScore = pulled.cflScore || 'Not assessed'
          const statedRisk = data.risk_assessment?.attitude_to_risk || 'Medium'
          
          return `Risk assessment shows alignment between client's stated risk preference (${statedRisk}), attitude to risk assessment (Score: ${atrScore}), and capacity for loss (Score: ${cflScore}). The recommended portfolio volatility matches the client's risk tolerance and capacity.`
        },
        aiSuggested: true
      },
      { 
        id: 'affordable', 
        label: 'Affordable for Client?', 
        type: 'radio', 
        options: ['Yes', 'No'], 
        required: true 
      },
      { 
        id: 'affordability_explanation', 
        label: 'Affordability Assessment', 
        type: 'textarea', 
        required: true, 
        placeholder: 'Detail affordability calculations...',
        smartDefault: (data) => {
          const investment = data.objectives?.investment_amount || 0
          const liquid = data.financial_situation?.liquid_assets || 0
          const emergency = data.financial_situation?.emergency_fund || 0
          const remaining = liquid - investment - emergency
          
          return `Initial investment of £${investment.toLocaleString()} represents ${Math.round(investment/liquid*100)}% of liquid assets. After investment and maintaining emergency fund of £${emergency.toLocaleString()}, client retains £${remaining.toLocaleString()} in accessible funds. Monthly contributions are within disposable income limits.`
        },
        aiSuggested: true
      },
      { 
        id: 'consumer_duty_met', 
        label: 'Consumer Duty Requirements Met?', 
        type: 'radio', 
        options: ['Yes', 'No'], 
        required: true 
      },
      { 
        id: 'best_interests_declaration', 
        label: 'Best Interests Declaration', 
        type: 'textarea', 
        required: true, 
        placeholder: 'Confirm recommendation is in client\'s best interests...',
        smartDefault: () => {
          return 'I confirm that this recommendation has been made in the client\'s best interests, considering their financial objectives, risk profile, capacity for loss, and personal circumstances. The recommended solution provides fair value and is expected to deliver good outcomes for the client. All costs have been disclosed and the benefits outweigh the charges.'
        }
      }
    ]
  },
  {
    id: 'costs_charges',
    title: '12. Costs & Charges',
    icon: Calculator,
    status: 'incomplete',
    aiEnabled: true,
    chartEnabled: true,
    fields: [
      { 
        id: 'initial_adviser_charge', 
        label: 'Initial Adviser Charge (%)', 
        type: 'number', 
        placeholder: '3' 
      },
      { 
        id: 'initial_adviser_charge_amount', 
        label: 'Initial Charge Amount (£)', 
        type: 'number', 
        calculate: 'initial_charge', 
        placeholder: 'Auto-calculated' 
      },
      { 
        id: 'ongoing_adviser_charge', 
        label: 'Ongoing Adviser Charge (% p.a.)', 
        type: 'number', 
        placeholder: '0.75' 
      },
      { 
        id: 'platform_charge', 
        label: 'Platform Charge (% p.a.)', 
        type: 'number', 
        placeholder: '0.25' 
      },
      { 
        id: 'fund_charges', 
        label: 'Average Fund Charges (% p.a.)', 
        type: 'number', 
        placeholder: '0.75' 
      },
      { 
        id: 'total_ongoing_charges', 
        label: 'Total Ongoing Charges (% p.a.)', 
        type: 'number', 
        calculate: 'total_charges', 
        placeholder: 'Auto-calculated' 
      },
      { 
        id: 'transaction_costs', 
        label: 'Estimated Transaction Costs (% p.a.)', 
        type: 'number', 
        placeholder: '0.1' 
      },
      { 
        id: 'value_assessment', 
        label: 'Value for Money Assessment', 
        type: 'textarea', 
        required: true, 
        placeholder: 'Explain how charges represent value...',
        smartDefault: (data) => {
          const totalCharges = data.costs_charges?.total_ongoing_charges || 1.75
          return `Total ongoing charges of ${totalCharges}% p.a. represent good value considering: comprehensive financial planning service, ongoing portfolio management, regular reviews, tax optimization, and dedicated support. Charges are competitive with market rates and transparent.`
        },
        aiSuggested: true
      }
    ]
  },
  {
    id: 'documentation',
    title: '13. Documentation & Next Steps',
    icon: Settings,
    status: 'incomplete',
    aiEnabled: true,
    fields: [
      { 
        id: 'documents_to_provide', 
        label: 'Documents to be Provided', 
        type: 'checkbox', 
        options: ['Suitability Report', 'Key Features Document', 'Client Agreement', 'Fee Schedule', 'Platform Terms'], 
        required: true,
        smartDefault: () => ['Suitability Report', 'Key Features Document', 'Client Agreement', 'Fee Schedule']
      },
      { 
        id: 'client_actions_required', 
        label: 'Client Actions Required', 
        type: 'textarea', 
        placeholder: 'List any actions the client needs to take...',
        smartDefault: (data) => {
          const actions: string[] = [] // Fix: Explicitly type as string array
          actions.push('1. Review and sign the suitability report')
          actions.push('2. Complete application forms')
          actions.push('3. Provide proof of identity and address')
          if (data.objectives?.investment_amount) {
            actions.push(`4. Arrange transfer of £${Number(data.objectives.investment_amount).toLocaleString()}`)
          }
          return actions.join('\n')
        },
        aiSuggested: true
      },
      { 
        id: 'adviser_actions', 
        label: 'Adviser Actions', 
        type: 'textarea', 
        placeholder: 'List follow-up actions for adviser...' 
      },
      { 
        id: 'next_review_date', 
        label: 'Next Review Date', 
        type: 'date', 
        required: true,
        smartDefault: () => {
          const date = new Date()
          date.setMonth(date.getMonth() + 3) // 3 months from now
          return date.toISOString().split('T')[0]
        }
      },
      { 
        id: 'special_instructions', 
        label: 'Special Instructions', 
        type: 'textarea', 
        placeholder: 'Any special considerations or instructions...' 
      },
      { 
        id: 'assessment_completed_by', 
        label: 'Assessment Completed By', 
        type: 'text', 
        required: true, 
        placeholder: 'Adviser name and qualification' 
      },
      { 
        id: 'assessment_date', 
        label: 'Assessment Date', 
        type: 'date', 
        required: true, 
        smartDefault: () => new Date().toISOString().split('T')[0] 
      }
    ]
  }
]

// ================================================================
// MAIN COMPONENT WITH PROGRESS TRACKING ENHANCEMENT
// ================================================================

export default function EnhancedSuitabilityAssessmentPage() {
  const router = useRouter()
  const { toast } = useToast()
  
  // PHASE 1: Use useClientContext instead of searchParams
  const { client, clientId, isProspect } = useClientContext()
  
  // INTEGRATION: Use the integration hook
  const { 
    completeAssessment,
    generateDocument,
    saveDraft,
    hasDraft
  } = useClientIntegration({ 
    clientId: clientId || undefined,
    autoSave: true 
  })

  // PHASE 2: Enhanced state with AI features (same as before)
  const [formData, setFormData] = useState<SuitabilityDataEnhanced>({
    _metadata: {
      version: '2.0.0',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completionPercentage: 0,
      aiEnabled: true,
      pulledData: {}
    },
    _aiSuggestions: {},
    _chartData: {}
  })
  
  const [pulledData, setPulledData] = useState<PulledPlatformData>({})
  const [aiSuggestions, setAiSuggestions] = useState<Record<string, AISuggestion>>({})
  const [chartData, setChartData] = useState<Record<string, ChartData>>({})
  const [isLoadingAI, setIsLoadingAI] = useState<Record<string, boolean>>({})
  const [isPullingData, setIsPullingData] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['personal_information']))
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const [crossValidationErrors, setCrossValidationErrors] = useState<EnhancedValidationError[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [savedAssessmentId, setSavedAssessmentId] = useState<string | null>(null)
  const [showDocumentGeneration, setShowDocumentGeneration] = useState(false)

  // PROGRESS TRACKING: Add new state for progress tracking
  const [progressTracking, setProgressTracking] = useState<ProgressTrackingState>({
    isTracking: false,
    lastTrackedSection: null,
    sectionsCompleted: new Set(),
    fieldsCompletedBySection: {}
  })

  // Initialize Supabase client
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // PROGRESS TRACKING: Calculate section completion
  const calculateSectionCompletion = useCallback((sectionId: string) => {
    const section = suitabilitySections.find(s => s.id === sectionId)
    if (!section) return 0

    const sectionData = formData[sectionId] || {}
    let totalRequired = 0
    let completedRequired = 0

    // Count main fields
    section.fields.forEach(field => {
      if (field.required && shouldShowField(field, sectionData)) {
        totalRequired++
        if (sectionData[field.id]) completedRequired++
      }
    })

    // Count conditional fields
    section.conditionalFields?.forEach(group => {
      if (group.condition(formData, pulledData)) {
        group.fields.forEach(field => {
          if (field.required) {
            totalRequired++
            if (sectionData[field.id]) completedRequired++
          }
        })
      }
    })

    return totalRequired > 0 ? (completedRequired / totalRequired) * 100 : 0
  }, [formData, pulledData])

  // PROGRESS TRACKING: Calculate overall progress
  const calculateOverallProgress = useCallback(() => {
    let totalSections = suitabilitySections.length
    let completedSections = 0

    suitabilitySections.forEach(section => {
      const completion = calculateSectionCompletion(section.id)
      if (completion === 100) {
        completedSections++
      }
    })

    return Math.round((completedSections / totalSections) * 100)
  }, [calculateSectionCompletion])

  // PROGRESS TRACKING: Track assessment start
  useEffect(() => {
    if (clientId && !progressTracking.lastTrackedSection) {
      // Track assessment start
      AssessmentService.updateProgress(clientId, {
        assessmentType: 'suitability',
        status: 'in_progress',
        progressPercentage: 0,
        metadata: {
          startedAt: new Date().toISOString(),
          currentSection: 'personal_information',
          source: 'direct_navigation'
        }
      }).catch(console.error) // Non-blocking

      AssessmentService.logHistory(clientId, {
        assessmentType: 'suitability',
        action: 'assessment_started',
        metadata: {
          source: 'direct_navigation'
        }
      }).catch(console.error) // Non-blocking

      setProgressTracking(prev => ({
        ...prev,
        lastTrackedSection: 'started'
      }))
    }
  }, [clientId, progressTracking.lastTrackedSection])

  // PROGRESS TRACKING: Track progress on field updates
  const trackProgress = useCallback(async () => {
    if (!clientId || progressTracking.isTracking) return

    setProgressTracking(prev => ({ ...prev, isTracking: true }))

    try {
      const overallProgress = calculateOverallProgress()
      const sectionsCompleted = new Set<string>()
      const sectionDetails: Record<string, any> = {}

      suitabilitySections.forEach(section => {
        const completion = calculateSectionCompletion(section.id)
        if (completion === 100) {
          sectionsCompleted.add(section.id)
        }
        sectionDetails[section.id] = {
          completion,
          fieldsCompleted: Object.keys(formData[section.id] || {}).length
        }
      })

      // Update progress
      await AssessmentService.updateProgress(clientId, {
        assessmentType: 'suitability',
        status: overallProgress === 100 ? 'completed' : 'in_progress',
        progressPercentage: overallProgress,
        metadata: {
          lastUpdated: new Date().toISOString(),
          sectionsCompleted: Array.from(sectionsCompleted),
          sectionDetails,
          currentSection: Array.from(expandedSections)[0] || 'unknown'
        }
      })

      // Track section completion if new section completed
      sectionsCompleted.forEach(sectionId => {
        if (!progressTracking.sectionsCompleted.has(sectionId)) {
          AssessmentService.logHistory(clientId, {
            assessmentType: 'suitability',
            action: 'section_completed',
            changes: {
              section: sectionId,
              sectionName: suitabilitySections.find(s => s.id === sectionId)?.title
            }
          }).catch(console.error)
        }
      })

      setProgressTracking(prev => ({
        ...prev,
        sectionsCompleted,
        isTracking: false
      }))

      // Show progress toast at milestones
      if (overallProgress > 0 && overallProgress % 25 === 0 && overallProgress !== 100) {
        toast({
          title: `${overallProgress}% Complete!`,
          description: 'Keep going - you\'re making great progress',
          variant: 'default'
        })
      }

    } catch (error) {
      console.error('Failed to track progress:', error)
      setProgressTracking(prev => ({ ...prev, isTracking: false }))
    }
  }, [clientId, calculateOverallProgress, calculateSectionCompletion, expandedSections, formData, progressTracking, toast])

  // PROGRESS TRACKING: Debounced progress tracking
  useEffect(() => {
    const timer = setTimeout(() => {
      trackProgress()
    }, 2000) // Track progress after 2 seconds of inactivity

    return () => clearTimeout(timer)
  }, [formData, trackProgress])

  // PHASE 2: Auto-save enhanced form data (same as before)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (Object.keys(formData).filter(k => !k.startsWith('_')).length > 0) {
        saveDraft(formData)
        setLastSaved(new Date())
      }
    }, 30000) // Save every 30 seconds

    return () => clearTimeout(timer)
  }, [formData, saveDraft])

  // PHASE 2: Pull platform data on mount (same as before)
  useEffect(() => {
    if (clientId && !isPullingData) {
      pullPlatformData()
    }
  }, [clientId])

  // PHASE 2: Pull platform data (same as before)
  const pullPlatformData = async () => {
    if (!clientId) return
    
    setIsPullingData(true)
    try {
      const data = await aiAssistantService.pullPlatformData(clientId)
      setPulledData(data)
      
      // Update form metadata
      setFormData(prev => ({
        ...prev,
        _metadata: {
          ...prev._metadata,
          pulledData: data,
          updatedAt: new Date().toISOString()
        }
      }))
      
      toast({
        title: 'Platform Data Loaded',
        description: 'CFL, ATR, and client data synchronized',
        variant: 'default'
      })
    } catch (error) {
      console.error('Error pulling platform data:', error)
      toast({
        title: 'Data Sync Error',
        description: 'Some platform data could not be loaded',
        variant: 'destructive'
      })
    } finally {
      setIsPullingData(false)
    }
  }

  // PHASE 3: Enhanced AI suggestion with chart generation (same as before)
  const getAISuggestion = async (sectionId: string) => {
    setIsLoadingAI(prev => ({ ...prev, [sectionId]: true }))
    
    try {
      const suggestion = await aiAssistantService.generateSuggestion(
        sectionId,
        formData,
        pulledData
      )
      
      setAiSuggestions(prev => ({ ...prev, [sectionId]: suggestion }))
      
      // Apply field suggestions
      if (suggestion.fieldSuggestions) {
        Object.entries(suggestion.fieldSuggestions).forEach(([fieldId, value]) => {
          updateField(sectionId, fieldId, value, true) // true = AI suggested
        })
      }
      
      // Generate chart if applicable
      const section = suitabilitySections.find(s => s.id === sectionId)
      if (section?.chartEnabled) {
        const chart = await aiAssistantService.generateChartData(sectionId, formData, pulledData)
        if (chart) {
          setChartData(prev => ({ ...prev, [sectionId]: chart }))
        }
      }
      
      toast({
        title: 'AI Analysis Complete',
        description: `${suggestion.insights.length} insights generated`,
        variant: 'default'
      })
    } catch (error) {
      console.error('AI suggestion error:', error)
      toast({
        title: 'AI Error',
        description: 'Could not generate suggestions',
        variant: 'destructive'
      })
    } finally {
      setIsLoadingAI(prev => ({ ...prev, [sectionId]: false }))
    }
  }

  // INTEGRATION: Pre-populate from client data (same as before with added tracking)
  useEffect(() => {
    if (client && Object.keys(formData).filter(k => !k.startsWith('_')).length === 0) {
      // Pre-populate personal information
      updateField('personal_information', 'client_name', 
        `${client.personalDetails?.firstName || ''} ${client.personalDetails?.lastName || ''}`.trim()
      )
      updateField('personal_information', 'client_reference', client.clientRef || generateClientReference())
      updateField('personal_information', 'date_of_birth', client.personalDetails?.dateOfBirth || '')
      updateField('personal_information', 'marital_status', client.personalDetails?.maritalStatus || '')
      updateField('personal_information', 'dependents', client.personalDetails?.dependents || 0)
      updateField('personal_information', 'employment_status', 
        client.personalDetails?.employmentStatus === 'employed' ? 'Employed' :
        client.personalDetails?.employmentStatus === 'self_employed' ? 'Self-Employed' :
        client.personalDetails?.employmentStatus === 'retired' ? 'Retired' : 'Not Working'
      )
      updateField('personal_information', 'occupation', client.personalDetails?.occupation || '')
      
      // Pre-populate contact details
      const address = client.contactInfo?.address
      if (address) {
        const fullAddress = [
          address.line1,
          address.line2,
          address.city,
          address.county,
          address.postcode
        ].filter(Boolean).join('\n')
        updateField('contact_details', 'address', fullAddress)
      }
      updateField('contact_details', 'phone', client.contactInfo?.phone || '')
      updateField('contact_details', 'email', client.contactInfo?.email || '')
      updateField('contact_details', 'preferred_contact', 
        client.contactInfo?.preferredContact ? 
        client.contactInfo.preferredContact.charAt(0).toUpperCase() + 
        client.contactInfo.preferredContact.slice(1) : 'Email'
      )
      
      // Pre-populate financial situation
      updateField('financial_situation', 'annual_income', client.financialProfile?.annualIncome || 0)
      updateField('financial_situation', 'monthly_expenditure', client.financialProfile?.monthlyExpenses || 0)
      updateField('financial_situation', 'liquid_assets', client.financialProfile?.liquidAssets || 0)
      updateField('financial_situation', 'net_worth', client.financialProfile?.netWorth || 0)
      
      // Pre-populate risk assessment if exists
      if (client.riskProfile) {
        updateField('risk_assessment', 'attitude_to_risk', 
          `${client.riskProfile.attitudeToRisk || 4} - ${
            client.riskProfile.attitudeToRisk <= 2 ? 'Low Risk' :
            client.riskProfile.attitudeToRisk <= 4 ? 'Medium Risk' :
            client.riskProfile.attitudeToRisk <= 6 ? 'High Risk' : 'Very High Risk'
          }`
        )
        updateField('risk_assessment', 'risk_capacity_score', client.riskProfile.riskCapacity || 'Medium')
      }
      
      // Pre-populate vulnerability assessment
      if (client.vulnerabilityAssessment) {
        const vuln = client.vulnerabilityAssessment
        updateField('vulnerability_assessment', 'health_concerns', 
          vuln.is_vulnerable ? 'Moderate' : 'None'
        )
        if (vuln.vulnerabilityFactors && vuln.vulnerabilityFactors.length > 0) {
          updateField('vulnerability_assessment', 'life_events', vuln.vulnerabilityFactors)
        }
        updateField('vulnerability_assessment', 'vulnerability_notes', vuln.assessmentNotes || '')
      }
      
      // PHASE 2: Apply smart defaults
      suitabilitySections.forEach(section => {
        section.fields.forEach(field => {
          if (field.smartDefault && !formData[section.id]?.[field.id]) {
            const defaultValue = field.smartDefault(formData, pulledData)
            if (defaultValue !== undefined && defaultValue !== null) {
              updateField(section.id, field.id, defaultValue)
            }
          }
        })
      })
      
      toast({
        title: 'Client Data Loaded',
        description: `Assessment pre-populated for ${client.personalDetails?.firstName} ${client.personalDetails?.lastName}`,
        variant: 'default'
      })
    }
    
    // Set default assessment date
    if (!formData.documentation?.assessment_date) {
      updateField('documentation', 'assessment_date', new Date().toISOString().split('T')[0])
    }
  }, [client, pulledData])

  // Check if field should be shown based on conditions (same as before)
  const shouldShowField = useCallback((field: SuitabilityFieldEnhanced, sectionData: any): boolean => {
    if (!field.dependsOn) return true
    
    const { field: dependField, value: dependValue, operator = 'equals' } = field.dependsOn
    const actualValue = sectionData[dependField]
    
    switch (operator) {
      case 'equals':
        return actualValue === dependValue
      case 'includes':
        return Array.isArray(actualValue) && actualValue.includes(dependValue)
      case 'greaterThan':
        return Number(actualValue) > Number(dependValue)
      case 'lessThan':
        return Number(actualValue) < Number(dependValue)
      default:
        return true
    }
  }, [])

  // Get completion status (enhanced with section details)
  const getCompletionStatus = useCallback(() => {
    let totalRequired = 0
    let completedRequired = 0
    const sectionStatuses: Record<string, { completed: number; total: number }> = {}
    
    suitabilitySections.forEach(section => {
      const sectionData = formData[section.id] || {}
      let sectionTotal = 0
      let sectionCompleted = 0
      
      // Count main fields
      section.fields.forEach(field => {
        if (field.required && shouldShowField(field, sectionData)) {
          totalRequired++
          sectionTotal++
          if (sectionData[field.id]) {
            completedRequired++
            sectionCompleted++
          }
        }
      })
      
      // Count conditional fields
      section.conditionalFields?.forEach(group => {
        if (group.condition(formData, pulledData)) {
          group.fields.forEach(field => {
            if (field.required) {
              totalRequired++
              sectionTotal++
              if (sectionData[field.id]) {
                completedRequired++
                sectionCompleted++
              }
            }
          })
        }
      })
      
      sectionStatuses[section.id] = {
        completed: sectionCompleted,
        total: sectionTotal
      }
    })
    
    const percentage = totalRequired > 0 ? Math.round((completedRequired / totalRequired) * 100) : 0
    
    // Update metadata
    setFormData(prev => ({
      ...prev,
      _metadata: {
        ...prev._metadata,
        completionPercentage: percentage
      }
    }))
    
    return { completed: completedRequired, total: totalRequired, percentage, sectionStatuses }
  }, [formData, pulledData, shouldShowField])

  // PHASE 2: Enhanced field validation (same as before)
  const validateField = (sectionId: string, fieldId: string, value: any): string | null => {
    const section = suitabilitySections.find(s => s.id === sectionId)
    const field = section?.fields.find(f => f.id === fieldId) || 
                 section?.conditionalFields?.flatMap(g => g.fields).find(f => f.id === fieldId)
    
    if (!field) return null
    
    // Required field validation
    if (field.required && (!value || value === '' || (Array.isArray(value) && value.length === 0))) {
      return `${field.label} is required`
    }
    
    // Custom validation function
    if (field.validateWith) {
      return field.validateWith(value, formData, pulledData)
    }
    
    // Email validation
    if (field.type === 'email' && value && !isValidEmail(value)) {
      return 'Please enter a valid email address'
    }
    
    // Phone validation
    if (field.type === 'tel' && value && !isValidUKPhone(value)) {
      return 'Please enter a valid UK phone number'
    }
    
    // NI validation
    if (field.validation === 'ni' && value && !/^[A-Z]{2}\s?\d{2}\s?\d{2}\s?\d{2}\s?[A-Z]$/.test(value)) {
      return 'Please enter a valid National Insurance number'
    }
    
    return null
  }

  // PHASE 2: Run cross-section validations (same as before)
  const runCrossValidations = useCallback(() => {
    const allErrors: EnhancedValidationError[] = []
    const allWarnings: ValidationWarning[] = []
    
    crossSectionValidations.forEach(validation => {
      const result = validation.validate(formData, pulledData)
      allErrors.push(...result.errors)
      allWarnings.push(...result.warnings)
    })
    
    // Convert warnings to validation errors for display
    const warningsAsErrors: EnhancedValidationError[] = allWarnings.map(w => ({
      sectionId: w.sectionId,
      fieldId: w.fieldId,
      message: w.message,
      severity: 'error' as const, // For display purposes
      code: `WARNING_${w.type}`
    }))
    
    setCrossValidationErrors([...allErrors, ...warningsAsErrors])
    return allErrors.length === 0
  }, [formData, pulledData])

  // Update field with calculations (same as before)
  const updateField = (sectionId: string, fieldId: string, value: any, aiSuggested = false) => {
    setFormData(prev => {
      const newData = {
        ...prev,
        [sectionId]: {
          ...prev[sectionId],
          [fieldId]: value
        },
        _metadata: {
          ...prev._metadata,
          updatedAt: new Date().toISOString()
        }
      }
      
      // Track AI suggestions
      if (aiSuggested) {
        newData._aiSuggestions = {
          ...prev._aiSuggestions,
          [sectionId]: {
            ...prev._aiSuggestions[sectionId],
            fieldSuggestions: {
              ...prev._aiSuggestions[sectionId]?.fieldSuggestions,
              [fieldId]: value
            }
          }
        }
      }
      
      // Perform calculations (same as before)
      if (sectionId === 'personal_information') {
        if (fieldId === 'date_of_birth' && value) {
          newData.personal_information = {
            ...newData.personal_information,
            age: calculateAge(value)
          }
        }
        if (fieldId === 'partner_date_of_birth' && value) {
          newData.personal_information = {
            ...newData.personal_information,
            partner_age: calculateAge(value)
          }
        }
      }
      
      if (sectionId === 'financial_situation') {
        const financial = (newData as any).financial_situation || {}
        
        if (fieldId === 'annual_income' || fieldId === 'monthly_expenditure') {
          const income = Number(fieldId === 'annual_income' ? value : financial.annual_income) || 0
          const expenditure = Number(fieldId === 'monthly_expenditure' ? value : financial.monthly_expenditure) || 0
          const disposableIncome = calculateDisposableIncome(income, expenditure)
          
          ;(newData as any).financial_situation = {
            ...financial,
            annual_income: fieldId === 'annual_income' ? value : financial.annual_income,
            monthly_expenditure: fieldId === 'monthly_expenditure' ? value : financial.monthly_expenditure,
            disposable_income: disposableIncome
          }
        }
        
        if (['liquid_assets', 'property_value', 'other_liabilities', 'outstanding_mortgage'].includes(fieldId)) {
          const currentFinancial = (newData as any).financial_situation || {}
          const assets = Number(fieldId === 'liquid_assets' ? value : currentFinancial.liquid_assets) || 0
          const property = Number(fieldId === 'property_value' ? value : currentFinancial.property_value) || 0
          const liabilities = Number(fieldId === 'other_liabilities' ? value : currentFinancial.other_liabilities) || 0
          const mortgage = Number(fieldId === 'outstanding_mortgage' ? value : currentFinancial.outstanding_mortgage) || 0
          const netWorth = calculateNetWorth(assets, property, liabilities, mortgage)
          
          ;(newData as any).financial_situation = {
            ...currentFinancial,
            [fieldId]: value,
            net_worth: netWorth
          }
        }
        
        if (fieldId === 'emergency_fund' || fieldId === 'monthly_expenditure') {
          const currentFinancial = (newData as any).financial_situation || {}
          const fund = Number(fieldId === 'emergency_fund' ? value : currentFinancial.emergency_fund) || 0
          const monthly = Number(fieldId === 'monthly_expenditure' ? value : currentFinancial.monthly_expenditure) || 0
          const months = calculateEmergencyMonths(fund, monthly)
          
          ;(newData as any).financial_situation = {
            ...currentFinancial,
            [fieldId]: value,
            emergency_months: `${months} months`
          }
        }
      }
      
      if (sectionId === 'costs_charges') {
        const costs = (newData as any).costs_charges || {}
        
        if (fieldId === 'initial_adviser_charge') {
          const rate = Number(value) || 0
          const objectives = (newData as any).objectives || {}
          const investment = Number(objectives.investment_amount) || 0
          
          ;(newData as any).costs_charges = {
            ...costs,
            initial_adviser_charge: value,
            initial_adviser_charge_amount: Math.round(investment * rate / 100)
          }
        }

        if (['ongoing_adviser_charge', 'platform_charge', 'fund_charges'].includes(fieldId)) {
          const currentCosts = (newData as any).costs_charges || {}
          const ongoing = Number(fieldId === 'ongoing_adviser_charge' ? value : currentCosts.ongoing_adviser_charge) || 0
          const platform = Number(fieldId === 'platform_charge' ? value : currentCosts.platform_charge) || 0
          const fund = Number(fieldId === 'fund_charges' ? value : currentCosts.fund_charges) || 0
          
          ;(newData as any).costs_charges = {
            ...currentCosts,
            [fieldId]: value,
            total_ongoing_charges: (ongoing + platform + fund).toFixed(2)
          }
        }
      }

      if (sectionId === 'objectives' && fieldId === 'investment_amount') {
        const costsData = (newData as any).costs_charges || {}
        const rate = Number(costsData.initial_adviser_charge) || 0
        const investment = Number(value) || 0
        
        ;(newData as any).costs_charges = {
          ...costsData,
          initial_adviser_charge_amount: Math.round(investment * rate / 100)
        }
      }
      
      return newData
    })

    // Clear validation error
    setValidationErrors(prev => 
      prev.filter(error => !(error.sectionId === sectionId && error.fieldId === fieldId))
    )

    // Validate field
    const error = validateField(sectionId, fieldId, value)
    if (error) {
      setValidationErrors(prev => [...prev, { sectionId, fieldId, message: error }])
    }
    
    // PHASE 2: Trigger cross-validation after key field updates
    const triggerFields = ['investment_amount', 'annual_income', 'attitude_to_risk', 'time_horizon']
    if (triggerFields.includes(fieldId)) {
      setTimeout(runCrossValidations, 500) // Debounce
    }
    
    // PHASE 2: Pull related data when certain fields change
    if (sectionId === 'risk_assessment' && fieldId === 'attitude_to_risk' && clientId) {
      // Could trigger a refresh of ATR data here if needed
    }
  }

  // PHASE 2: Enhanced recommendation generation with AI (same as before)
  const handleGenerateRecommendation = async () => {
    // First get AI analysis if not already done
    if (!aiSuggestions.recommendation) {
      await getAISuggestion('recommendation')
    }
    
    const recommendation = generateRecommendation(formData, pulledData, aiSuggestions)
    updateField('recommendation', 'recommendation_summary', recommendation)
    
    // Auto-set other recommendation fields based on AI
    const section = suitabilitySections.find(s => s.id === 'recommendation')
    section?.fields.forEach(field => {
      if (field.smartDefault && !formData.recommendation?.[field.id]) {
        const value = field.smartDefault(formData, pulledData)
        if (value) {
          updateField('recommendation', field.id, value)
        }
      }
    })
  }

  // Toggle section with tracking
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId)
      } else {
        newSet.add(sectionId)
        
        // PROGRESS TRACKING: Log section view
        if (clientId) {
          AssessmentService.logHistory(clientId, {
            assessmentType: 'suitability',
            action: 'section_opened',
            metadata: {
              sectionId,
              sectionName: suitabilitySections.find(s => s.id === sectionId)?.title
            }
          }).catch(console.error)
        }
      }
      return newSet
    })
  }

  // PROGRESS TRACKING: Enhanced save with completion tracking
  const saveAssessment = async () => {
    setIsLoading(true)
    try {
      if (!clientId) {
        throw new Error('No client selected. Please select a client before saving.')
      }
      
      // Run final validation
      const isValid = runCrossValidations()
      if (!isValid && crossValidationErrors.some(e => !e.code.startsWith('WARNING_'))) {
        throw new Error('Please resolve validation errors before saving')
      }

      // Get completion status
      const { percentage, sectionStatuses } = getCompletionStatus()

      // Prepare assessment data
      const assessmentData = {
        clientId,
        type: 'suitability',
        data: formData,
        completionPercentage: percentage,
        status: percentage === 100 ? 'completed' : 'draft',
        completedAt: percentage === 100 ? new Date().toISOString() : undefined,
        metadata: {
          aiSuggestionsUsed: Object.keys(aiSuggestions).length > 0,
          pulledDataSources: Object.keys(pulledData).filter(k => {
            const value = pulledData[k as keyof PulledPlatformData]
            return value !== undefined && value !== null
          }),
          parentAssessmentId: formData._metadata.parentAssessmentId,
          sectionStatuses
        }
      }

      // Save assessment (simulate for now)
      const simulatedId = `suitability-${Date.now()}`
      setSavedAssessmentId(simulatedId)
      
      // Sync to platform
      await aiAssistantService.syncToPlatform(clientId, simulatedId, formData)
      
      // PROGRESS TRACKING: Track completion if 100%
      if (percentage === 100) {
        await AssessmentService.updateProgress(clientId, {
          assessmentType: 'suitability',
          status: 'completed',
          progressPercentage: 100,
          metadata: {
            assessmentId: simulatedId,
            completedAt: new Date().toISOString(),
            totalSections: suitabilitySections.length,
            completedSections: Object.values(sectionStatuses).filter(s => s.completed === s.total).length,
            totalFields: Object.values(sectionStatuses).reduce((sum, s) => sum + s.total, 0),
            completedFields: Object.values(sectionStatuses).reduce((sum, s) => sum + s.completed, 0),
            aiAssisted: Object.keys(aiSuggestions).length > 0,
            platformDataUsed: Object.keys(pulledData).length > 0
          }
        })

        await AssessmentService.logHistory(clientId, {
          assessmentType: 'suitability',
          action: 'assessment_completed',
          changes: {
            assessmentId: simulatedId,
            completionTime: Math.floor((new Date().getTime() - new Date(formData._metadata.createdAt).getTime()) / 60000), // minutes
            sectionsWithAI: Object.keys(aiSuggestions),
            finalRiskProfile: formData.risk_assessment?.attitude_to_risk
          }
        })
      }
      
      setShowDocumentGeneration(true)
      setLastSaved(new Date())
      
      toast({
        title: 'Assessment Saved',
        description: percentage === 100 
          ? 'Suitability assessment completed and saved successfully!' 
          : `Draft saved with ${percentage}% completion`,
        variant: 'default'
      })
      
    } catch (error) {
      console.error('Save error:', error)
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to save assessment',
        variant: 'destructive'
      })
    } finally {
      setIsLoading(false)
    }
  }

  // Handle document generation success
  const handleDocumentGenerationSuccess = (docId: string, docUrl: string) => {
    console.log('Document generated successfully:', docId)
    toast({
      title: 'Document Generated',
      description: 'Suitability report has been created successfully',
      variant: 'default'
    })
  }

  const { completed, total, percentage, sectionStatuses } = getCompletionStatus()

  // PHASE 1: Navigation handlers - updated to use hub pattern
  const handleBack = () => {
    router.push(`/assessments/client/${clientId}${isProspect ? '?isProspect=true' : ''}`)
  }

  const handleNavigateToDocuments = () => {
    if (clientId) {
      router.push(`/documents?clientId=${clientId}`)
    }
  }

  // Get client name and email for document generation
  const clientName = formData.personal_information?.client_name || 
    (client ? `${client.personalDetails?.firstName} ${client.personalDetails?.lastName}`.trim() : 'Client')
  const clientEmail = formData.contact_details?.email || client?.contactInfo?.email || ''

  // PHASE 1: Wrap entire component in NavigationGuard
  return (
    <NavigationGuard requireClient={true}>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* PHASE 1: Updated back button navigation */}
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="outline"
            onClick={handleBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Assessments
          </Button>
          <div className="text-sm text-gray-600">
            {client && (
              <>
                Assessing: <span className="font-medium">{client.personalDetails?.firstName} {client.personalDetails?.lastName}</span>
              </>
            )}
          </div>
          {/* PHASE 1: Prospect indicator */}
          {isProspect && (
            <Badge variant="outline" className="ml-auto bg-orange-50 text-orange-700 border-orange-300">
              <Users className="h-3 w-3 mr-1" />
              Prospect Mode
            </Badge>
          )}
        </div>

        {/* PHASE 1: Prospect warning banner */}
        {isProspect && (
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription>
              <span className="font-medium text-orange-800">
                This is a temporary prospect assessment. Data will be stored locally for 30 days. 
                Convert to a full client to save permanently.
              </span>
            </AlertDescription>
          </Alert>
        )}

        {/* PROGRESS TRACKING: Enhanced header with progress bar */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <FileText className="h-8 w-8 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-blue-900">Enhanced Suitability Assessment</h1>
                <p className="text-blue-700">AI-powered assessment with progress tracking</p>
                {lastSaved && (
                  <p className="text-sm text-blue-600">Last saved: {lastSaved.toLocaleTimeString()}</p>
                )}
                {hasDraft && (
                  <p className="text-sm text-orange-600">Draft auto-saved</p>
                )}
              </div>
            </div>
            <div className="flex space-x-3">
              <Button 
                onClick={pullPlatformData} 
                disabled={isPullingData || isProspect} 
                variant="outline"
                className="flex items-center space-x-2"
              >
                {isPullingData ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Syncing...</span>
                  </>
                ) : (
                  <>
                    <Database className="h-4 w-4" />
                    <span>Sync Data</span>
                  </>
                )}
              </Button>
              <Button 
                onClick={saveAssessment} 
                disabled={isLoading || !clientId} 
                className="flex items-center space-x-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    <span>Save</span>
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* PROGRESS TRACKING: Enhanced progress display */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">
                Progress: {completed} of {total} required fields completed
              </span>
              <span className="text-gray-600">{percentage}%</span>
            </div>
            <Progress value={percentage} className="w-full h-3" />
            
            {/* PROGRESS TRACKING: Section-level progress indicators */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mt-3">
              {suitabilitySections.slice(0, 6).map(section => {
                const status = sectionStatuses?.[section.id]
                const sectionPercentage = status 
                  ? (status.total > 0 ? Math.round((status.completed / status.total) * 100) : 0)
                  : 0
                
                return (
                  <div 
                    key={section.id}
                    className="text-center cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => toggleSection(section.id)}
                  >
                    <div className={cn(
                      "h-2 rounded-full mb-1",
                      sectionPercentage === 100 ? "bg-green-500" :
                      sectionPercentage > 0 ? "bg-yellow-500" : "bg-gray-300"
                    )} />
                    <p className="text-xs text-gray-600">{section.title.split('.')[0]}</p>
                  </div>
                )
              })}
            </div>
          </div>

          {/* PROGRESS TRACKING: Show if tracking is active */}
          {progressTracking.isTracking && (
            <div className="mt-2 flex items-center gap-2 text-sm text-blue-600">
              <Activity className="h-4 w-4 animate-pulse" />
              <span>Saving progress...</span>
            </div>
          )}

          {/* PHASE 2: Platform data status (same as before) */}
          {pulledData && Object.keys(pulledData).length > 0 && (
            <div className="mt-4 flex items-center gap-4 text-sm">
              <Badge variant="outline" className="bg-green-50">
                <Activity className="h-3 w-3 mr-1" />
                ATR: {pulledData.atrCategory || 'Not assessed'}
              </Badge>
              <Badge variant="outline" className="bg-blue-50">
                <Shield className="h-3 w-3 mr-1" />
                CFL: {pulledData.cflCategory || 'Not assessed'}
              </Badge>
              {pulledData.vulnerabilityScore && (
                <Badge variant="outline" className="bg-orange-50">
                  <Heart className="h-3 w-3 mr-1" />
                  Vulnerability: {pulledData.vulnerabilityScore}
                </Badge>
              )}
            </div>
          )}

          {/* Validation Summary (Enhanced) */}
          {(validationErrors.length > 0 || crossValidationErrors.length > 0) && (
            <Alert className="mt-4 border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription>
                <span className="font-medium text-red-800">
                  {crossValidationErrors.filter(e => !e.code.startsWith('WARNING_')).length + validationErrors.length} error{validationErrors.length > 1 ? 's' : ''}, 
                  {crossValidationErrors.filter(e => e.code.startsWith('WARNING_')).length} warning{crossValidationErrors.filter(e => e.code.startsWith('WARNING_')).length !== 1 ? 's' : ''}
                </span>
              </AlertDescription>
            </Alert>
          )}

          {/* Success Message & Document Generation */}
          {savedAssessmentId && showDocumentGeneration && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <p className="font-medium text-green-800">Assessment saved successfully!</p>
              </div>
              <div className="flex items-center justify-center">
                <DocumentGenerationButton
                  assessmentType="suitability"
                  assessmentId={savedAssessmentId}
                  clientId={clientId!}
                  clientName={clientName}
                  clientEmail={clientEmail}
                  onSuccess={handleDocumentGenerationSuccess}
                />
              </div>
            </div>
          )}
        </div>

        {/* PROGRESS TRACKING: Show completion message */}
        {percentage === 100 && !savedAssessmentId && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription>
              <span className="font-medium text-green-800">
                All required fields completed! Click Save to finalize the assessment.
              </span>
            </AlertDescription>
          </Alert>
        )}

        {/* PHASE 2: Cross-validation warnings (same as before) */}
        {crossValidationErrors.length > 0 && (
          <Card className="border-orange-200 bg-orange-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-800">
                <AlertTriangle className="h-5 w-5" />
                Cross-Section Validation Issues
              </CardTitle>
            </CardHeader>
            <CardContent>
              {crossValidationErrors.filter(e => !e.code.startsWith('WARNING_')).length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium text-red-800 mb-2">Errors (must be resolved):</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {crossValidationErrors.filter(e => !e.code.startsWith('WARNING_')).map((error, i) => (
                      <li key={i} className="text-sm text-red-700">{error.message}</li>
                    ))}
                  </ul>
                </div>
              )}
              {crossValidationErrors.filter(e => e.code.startsWith('WARNING_')).length > 0 && (
                <div>
                  <h4 className="font-medium text-orange-800 mb-2">Warnings (review recommended):</h4>
                  <ul className="list-disc list-inside space-y-1">
                    {crossValidationErrors.filter(e => e.code.startsWith('WARNING_')).map((error, i) => (
                      <li key={i} className="text-sm text-orange-700">{error.message}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Sections (Enhanced with progress tracking) - ALL YOUR ORIGINAL SECTIONS */}
        <div className="space-y-4">
          {suitabilitySections.map((section) => {
            const isExpanded = expandedSections.has(section.id)
            const sectionData = formData[section.id] || {}
            const sectionAI = aiSuggestions[section.id]
            const sectionChart = chartData[section.id]
            
            // PROGRESS TRACKING: Get section completion
            const sectionStatus = sectionStatuses?.[section.id]
            const sectionPercentage = sectionStatus 
              ? (sectionStatus.total > 0 ? Math.round((sectionStatus.completed / sectionStatus.total) * 100) : 100)
              : 0
            const sectionComplete = sectionPercentage === 100
            
            const hasAISuggestions = section.aiEnabled && sectionAI?.insights?.length > 0

            return (
              <Card key={section.id} className="overflow-hidden">
                <CardHeader 
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleSection(section.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <section.icon className="h-5 w-5 text-blue-600" />
                      <div>
                        <CardTitle className="text-lg">{section.title}</CardTitle>
                        <div className="flex items-center space-x-2 mt-1">
                          {/* PROGRESS TRACKING: Enhanced status badge */}
                          <Badge 
                            variant={
                              sectionComplete ? 'success' : 
                              sectionPercentage > 0 ? 'warning' : 
                              'outline'
                            }
                          >
                            {sectionComplete ? 'Complete' : 
                             sectionPercentage > 0 ? `${sectionPercentage}% Complete` : 
                             'Not Started'}
                          </Badge>
                          {sectionStatus && sectionStatus.total > 0 && (
                            <span className="text-sm text-gray-500">
                              {sectionStatus.completed}/{sectionStatus.total} required fields
                            </span>
                          )}
                          {section.aiEnabled && (
                            <Badge variant="outline" className="bg-purple-50">
                              <Brain className="h-3 w-3 mr-1" />
                              AI
                            </Badge>
                          )}
                          {hasAISuggestions && (
                            <Badge variant="outline" className="bg-green-50">
                              <Sparkles className="h-3 w-3 mr-1" />
                              Suggestions
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                      {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="space-y-6">
                    {/* Special actions for specific sections */}
                    {section.id === 'personal_information' && (
                      <div className="bg-blue-50 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-blue-800">
                            Client Reference: <strong>{formData.personal_information?.client_reference}</strong>
                          </span>
                          <Button 
                            onClick={() => updateField('personal_information', 'client_reference', generateClientReference())} 
                            size="sm" 
                            variant="outline"
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Regenerate
                          </Button>
                        </div>
                      </div>
                    )}

                    {section.id === 'recommendation' && (
                      <div>
                        <Button 
                          onClick={handleGenerateRecommendation} 
                          className="flex items-center space-x-2"
                        >
                          <Sparkles className="h-4 w-4" />
                          <span>Generate AI Recommendation</span>
                        </Button>
                        <p className="text-sm text-gray-600 mt-2">
                          AI-powered recommendations based on all assessment data and platform insights
                        </p>
                      </div>
                    )}

                    {/* PHASE 2: AI Assistant Panel */}
                    {section.aiEnabled && !isProspect && (
                      <div className="bg-purple-50 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Brain className="h-5 w-5 text-purple-600" />
                            <h4 className="font-medium text-purple-900">AI Assistant</h4>
                          </div>
                          <Button
                            onClick={() => getAISuggestion(section.id)}
                            disabled={isLoadingAI[section.id]}
                            size="sm"
                            variant="outline"
                          >
                            {isLoadingAI[section.id] ? (
                              <>
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                Analyzing...
                              </>
                            ) : (
                              <>
                                <Sparkles className="h-3 w-3 mr-1" />
                                Get Suggestions
                              </>
                            )}
                          </Button>
                        </div>
                        
                        {sectionAI && (
                          <div className="space-y-3">
                            {sectionAI.insights.length > 0 && (
                              <div>
                                <h5 className="text-sm font-medium text-purple-800 mb-1">Insights:</h5>
                                <ul className="text-sm text-purple-700 space-y-1">
                                  {sectionAI.insights.map((insight, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                      <span className="text-purple-500 mt-0.5">•</span>
                                      <span>{insight}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {sectionAI.warnings && sectionAI.warnings.length > 0 && (
                              <div>
                                <h5 className="text-sm font-medium text-orange-800 mb-1">Warnings:</h5>
                                <ul className="text-sm text-orange-700 space-y-1">
                                  {sectionAI.warnings.map((warning, i) => (
                                    <li key={i} className="flex items-start gap-2">
                                      <AlertTriangle className="h-3 w-3 text-orange-500 mt-0.5" />
                                      <span>{warning}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            <div className="flex items-center justify-between text-xs text-purple-600">
                              <span>Confidence: {Math.round(sectionAI.confidence * 100)}%</span>
                              <span>Sources: {sectionAI.sources.join(', ')}</span>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* PHASE 3: Chart visualization with real Chart.js components */}
                    {section.chartEnabled && !isProspect && (
                      <SectionCharts 
                        sectionId={section.id}
                        chartData={chartData[section.id]}
                        loading={isLoadingAI[section.id]}
                      />
                    )}

                    {/* Main fields */}
                    <div className="grid md:grid-cols-2 gap-4">
                      {section.fields.map((field) => {
                        if (!shouldShowField(field, sectionData)) return null
                        
                        const value = sectionData[field.id] || ''
                        const fieldError = validationErrors.find(
                          e => e.sectionId === section.id && e.fieldId === field.id
                        )
                        const isCalculated = Boolean(field.calculate)
                        const isAutoGenerated = Boolean(field.autoGenerate)
                        const isAISuggested = field.aiSuggested && formData._aiSuggestions[section.id]?.fieldSuggestions?.[field.id]

                        return (
                          <div 
                            key={field.id} 
                            className={cn(
                              "space-y-2",
                              field.type === 'textarea' && "md:col-span-2"
                            )}
                          >
                            <label className="block text-sm font-medium text-gray-700">
                              {field.label}
                              {field.required && <span className="text-red-500 ml-1">*</span>}
                              {isAutoGenerated && <span className="text-blue-500 ml-1">(auto)</span>}
                              {isCalculated && <span className="text-green-500 ml-1">(calculated)</span>}
                              {isAISuggested && <span className="text-purple-500 ml-1">(AI suggested)</span>}
                              {field.pullFrom && <Database className="inline h-3 w-3 ml-1 text-gray-400" />}
                            </label>

                            {/* Field inputs based on type (same as before) */}
                            {field.type === 'text' && (
                              <input
                                type="text"
                                value={value}
                                onChange={(e) => updateField(section.id, field.id, e.target.value)}
                                placeholder={field.placeholder}
                                readOnly={isAutoGenerated || isCalculated}
                                className={cn(
                                  "w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
                                  fieldError ? "border-red-500" : "border-gray-300",
                                  (isAutoGenerated || isCalculated) && "bg-gray-50",
                                  isAISuggested && "bg-purple-50"
                                )}
                              />
                            )}

                            {field.type === 'number' && (
                              <input
                                type="number"
                                value={value}
                                onChange={(e) => updateField(section.id, field.id, e.target.value)}
                                placeholder={field.placeholder}
                                readOnly={isCalculated}
                                className={cn(
                                  "w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
                                  fieldError ? "border-red-500" : "border-gray-300",
                                  isCalculated && "bg-gray-50",
                                  isAISuggested && "bg-purple-50"
                                )}
                              />
                            )}

                            {field.type === 'email' && (
                              <input
                                type="email"
                                value={value}
                                onChange={(e) => updateField(section.id, field.id, e.target.value)}
                                placeholder={field.placeholder}
                                className={cn(
                                  "w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
                                  fieldError ? "border-red-500" : "border-gray-300"
                                )}
                              />
                            )}

                            {field.type === 'tel' && (
                              <input
                                type="tel"
                                value={value}
                                onChange={(e) => updateField(section.id, field.id, e.target.value)}
                                placeholder={field.placeholder}
                                className={cn(
                                  "w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
                                  fieldError ? "border-red-500" : "border-gray-300"
                                )}
                              />
                            )}

                            {field.type === 'date' && (
                              <input
                                type="date"
                                value={value}
                                onChange={(e) => updateField(section.id, field.id, e.target.value)}
                                className={cn(
                                  "w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
                                  fieldError ? "border-red-500" : "border-gray-300"
                                )}
                              />
                            )}

                            {field.type === 'select' && (
                              <select
                                value={value}
                                onChange={(e) => updateField(section.id, field.id, e.target.value)}
                                className={cn(
                                  "w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
                                  fieldError ? "border-red-500" : "border-gray-300",
                                  isAISuggested && "bg-purple-50"
                                )}
                              >
                                <option value="">Select {field.label}...</option>
                                {field.options?.map((option) => (
                                  <option key={option} value={option}>{option}</option>
                                ))}
                              </select>
                            )}

                            {field.type === 'textarea' && (
                              <textarea
                                value={value}
                                onChange={(e) => updateField(section.id, field.id, e.target.value)}
                                placeholder={field.placeholder}
                                rows={4}
                                className={cn(
                                  "w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
                                  fieldError ? "border-red-500" : "border-gray-300",
                                  isAISuggested && "bg-purple-50"
                                )}
                              />
                            )}

                            {field.type === 'radio' && (
                              <div className="space-y-2">
                                {field.options?.map((option) => (
                                  <label key={option} className="flex items-center space-x-2">
                                    <input
                                      type="radio"
                                      name={`${section.id}_${field.id}`}
                                      value={option}
                                      checked={value === option}
                                      onChange={(e) => updateField(section.id, field.id, e.target.value)}
                                      className="text-blue-600"
                                    />
                                    <span className="text-sm">{option}</span>
                                  </label>
                                ))}
                              </div>
                            )}

                            {field.type === 'checkbox' && (
                              <div className="space-y-2">
                                {field.options?.map((option) => (
                                  <label key={option} className="flex items-center space-x-2">
                                    <input
                                      type="checkbox"
                                      checked={Array.isArray(value) ? value.includes(option) : false}
                                      onChange={(e) => {
                                        const currentValues = Array.isArray(value) ? value : []
                                        if (e.target.checked) {
                                          updateField(section.id, field.id, [...currentValues, option])
                                        } else {
                                          updateField(section.id, field.id, currentValues.filter((v: string) => v !== option))
                                        }
                                      }}
                                      className="text-blue-600"
                                    />
                                    <span className="text-sm">{option}</span>
                                  </label>
                                ))}
                              </div>
                            )}

                            {fieldError && (
                              <p className="text-sm text-red-600">{fieldError.message}</p>
                            )}

                            {field.helpText && (
                              <p className="text-xs text-gray-500">{field.helpText}</p>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* Conditional fields */}
                    {section.conditionalFields?.map((group, groupIndex) => {
                      if (!group.condition(formData, pulledData)) return null

                      return (
                        <div key={`conditional-${groupIndex}`} className="mt-6 pt-6 border-t border-gray-200">
                          <div className="mb-4">
                            <div className="flex items-center space-x-2">
                              <Users className="h-4 w-4 text-purple-600" />
                              <h4 className="text-sm font-medium text-purple-900">Additional Information Required</h4>
                            </div>
                            {group.aiReason && (
                              <p className="text-xs text-gray-600 mt-1">{group.aiReason}</p>
                            )}
                          </div>
                          <div className="grid md:grid-cols-2 gap-4">
                            {group.fields.map((field) => {
                              const value = sectionData[field.id] || ''
                              const fieldError = validationErrors.find(
                                e => e.sectionId === section.id && e.fieldId === field.id
                              )
                              const isCalculated = Boolean(field.calculate)

                              return (
                                <div 
                                  key={field.id} 
                                  className={cn(
                                    "space-y-2",
                                    field.type === 'textarea' && "md:col-span-2"
                                  )}
                                >
                                  <label className="block text-sm font-medium text-gray-700">
                                    {field.label}
                                    {field.required && <span className="text-red-500 ml-1">*</span>}
                                    {isCalculated && <span className="text-green-500 ml-1">(calculated)</span>}
                                  </label>

                                  {/* Same field type rendering as above */}
                                  {field.type === 'text' && (
                                    <input
                                      type="text"
                                      value={value}
                                      onChange={(e) => updateField(section.id, field.id, e.target.value)}
                                      placeholder={field.placeholder}
                                      readOnly={isCalculated}
                                      className={cn(
                                        "w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
                                        fieldError ? "border-red-500" : "border-gray-300",
                                        isCalculated && "bg-gray-50"
                                      )}
                                    />
                                  )}

                                  {field.type === 'number' && (
                                    <input
                                      type="number"
                                      value={value}
                                      onChange={(e) => updateField(section.id, field.id, e.target.value)}
                                      placeholder={field.placeholder}
                                      readOnly={isCalculated}
                                      className={cn(
                                        "w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
                                        fieldError ? "border-red-500" : "border-gray-300",
                                        isCalculated && "bg-gray-50"
                                      )}
                                    />
                                  )}

                                  {field.type === 'date' && (
                                    <input
                                      type="date"
                                      value={value}
                                      onChange={(e) => updateField(section.id, field.id, e.target.value)}
                                      className={cn(
                                        "w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
                                        fieldError ? "border-red-500" : "border-gray-300"
                                      )}
                                    />
                                  )}

                                  {field.type === 'select' && (
                                    <select
                                      value={value}
                                      onChange={(e) => updateField(section.id, field.id, e.target.value)}
                                      className={cn(
                                        "w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
                                        fieldError ? "border-red-500" : "border-gray-300"
                                      )}
                                    >
                                      <option value="">Select {field.label}...</option>
                                      {field.options?.map((option) => (
                                        <option key={option} value={option}>{option}</option>
                                      ))}
                                    </select>
                                  )}

                                  {field.type === 'textarea' && (
                                    <textarea
                                      value={value}
                                      onChange={(e) => updateField(section.id, field.id, e.target.value)}
                                      placeholder={field.placeholder}
                                      rows={3}
                                      className={cn(
                                        "w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
                                        fieldError ? "border-red-500" : "border-gray-300"
                                      )}
                                    />
                                  )}

                                  {field.type === 'radio' && (
                                    <div className="space-y-2">
                                      {field.options?.map((option) => (
                                        <label key={option} className="flex items-center space-x-2">
                                          <input
                                            type="radio"
                                            name={`${section.id}_${field.id}`}
                                            value={option}
                                            checked={value === option}
                                            onChange={(e) => updateField(section.id, field.id, e.target.value)}
                                            className="text-blue-600"
                                          />
                                          <span className="text-sm">{option}</span>
                                        </label>
                                      ))}
                                    </div>
                                  )}

                                  {fieldError && (
                                    <p className="text-sm text-red-600">{fieldError.message}</p>
                                  )}
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}

                    {/* PROGRESS TRACKING: Section completion indicator */}
                    {sectionStatus && (
                      <div className="mt-6 pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-between text-sm text-gray-600">
                          <span>
                            Section progress: {sectionStatus.completed} of {sectionStatus.total} required fields completed
                          </span>
                          {sectionComplete && (
                            <div className="flex items-center gap-1 text-green-600">
                              <CheckCircle className="h-4 w-4" />
                              <span className="font-medium">Section Complete</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            )
          })}
        </div>

        {/* Summary Card (Enhanced with progress tracking) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <span>Assessment Summary</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-5 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{percentage}%</div>
                <div className="text-sm text-gray-600">Complete</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{completed}</div>
                <div className="text-sm text-gray-600">Fields Completed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{total - completed}</div>
                <div className="text-sm text-gray-600">Remaining</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{validationErrors.length}</div>
                <div className="text-sm text-gray-600">Validation Errors</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{Object.keys(aiSuggestions).length}</div>
                <div className="text-sm text-gray-600">AI Sections</div>
              </div>
            </div>
            
            {/* Platform sync status */}
            {!isProspect && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-2">Platform Integration Status</h4>
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Activity className={cn("h-4 w-4", pulledData.atrScore ? "text-green-600" : "text-gray-400")} />
                    <span>ATR: {pulledData.atrScore ? `Score ${pulledData.atrScore}` : 'Not synced'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className={cn("h-4 w-4", pulledData.cflScore ? "text-green-600" : "text-gray-400")} />
                    <span>CFL: {pulledData.cflScore ? `Score ${pulledData.cflScore}` : 'Not synced'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Heart className={cn("h-4 w-4", pulledData.vulnerabilityScore ? "text-green-600" : "text-gray-400")} />
                    <span>Vulnerability: {pulledData.vulnerabilityScore || 'Not assessed'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* PROGRESS TRACKING: Sections completion overview */}
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-3">Sections Overview</h4>
              <div className="space-y-2">
                {suitabilitySections.map(section => {
                  const status = sectionStatuses?.[section.id]
                  const sectionPercentage = status 
                    ? (status.total > 0 ? Math.round((status.completed / status.total) * 100) : 100)
                    : 0
                  
                  return (
                    <div key={section.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <section.icon className="h-4 w-4 text-blue-600" />
                        <span className="text-sm">{section.title}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div 
                            className={cn(
                              "h-2 rounded-full transition-all",
                              sectionPercentage === 100 ? "bg-green-500" :
                              sectionPercentage > 0 ? "bg-yellow-500" : "bg-gray-300"
                            )}
                            style={{ width: `${sectionPercentage}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-600 w-12 text-right">{sectionPercentage}%</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            
            <div className="flex justify-center space-x-4">
              <Button 
                onClick={saveAssessment} 
                disabled={isLoading || !clientId}
                size="lg"
              >
                <Save className="h-4 w-4 mr-2" />
                Save Assessment
              </Button>
              
              {savedAssessmentId && (
                <Button 
                  onClick={handleNavigateToDocuments}
                  variant="outline"
                  size="lg"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  View Documents
                </Button>
              )}
            </div>

            {percentage < 80 && (
              <p className="text-sm text-gray-500 text-center mt-4">
                Complete at least 80% of the assessment to generate a report
              </p>
            )}
            
            {/* PHASE 1: Prospect-specific message */}
            {isProspect && (
              <div className="mt-4 p-3 bg-orange-50 rounded-lg">
                <p className="text-sm text-orange-700 text-center">
                  <AlertCircle className="inline h-4 w-4 mr-1" />
                  Remember to convert this prospect to a client to save permanently
                </p>
              </div>
            )}

            {/* PROGRESS TRACKING: Show tracking status */}
            {progressTracking.isTracking && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-blue-700 text-center flex items-center justify-center gap-2">
                  <Activity className="h-4 w-4 animate-pulse" />
                  Progress is being saved to the Assessment Hub
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </NavigationGuard>
  )
}
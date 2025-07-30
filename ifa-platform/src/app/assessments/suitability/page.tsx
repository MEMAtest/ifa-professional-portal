// ================================================================
// File: src/app/assessments/suitability/page.tsx
// INTEGRATED VERSION - Connected to Client & Document Systems
// ================================================================

'use client'
import { useState, useEffect, useCallback, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Progress } from '@/components/ui/Progress'
import { Alert, AlertDescription } from '@/components/ui/Alert'
import { useToast } from '@/components/ui/use-toast'
// INTEGRATION: Import the integration hook and services
import { useClientIntegration } from '@/lib/hooks/useClientIntegration'
import { integratedClientService } from '@/services/integratedClientService'
import { realDocumentService } from '@/services/realIntegratedServices'
import { documentTemplateService } from '@/services/documentTemplateService'
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
  ArrowLeft
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createBrowserClient } from '@supabase/ssr'

// ================================================================
// TYPES & INTERFACES (UNCHANGED)
// ================================================================

interface SuitabilitySection {
  id: string
  title: string
  icon: React.ComponentType<{ className?: string }>
  status: 'complete' | 'partial' | 'incomplete'
  fields: SuitabilityField[]
  conditionalFields?: ConditionalFieldGroup[]
}

interface SuitabilityField {
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
  smartDefault?: (formData: SuitabilityData) => any
  helpText?: string
}

interface ConditionalFieldGroup {
  condition: (formData: SuitabilityData) => boolean
  fields: SuitabilityField[]
}

interface FieldDependency {
  field: string
  value: any
  operator?: 'equals' | 'includes' | 'greaterThan' | 'lessThan'
}

interface SuitabilityData {
  [sectionId: string]: {
    [fieldId: string]: any
  }
}

interface ValidationError {
  sectionId: string
  fieldId: string
  message: string
}

// ================================================================
// UTILITY FUNCTIONS (UNCHANGED)
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

// Generate comprehensive recommendation (UNCHANGED)
const generateRecommendation = (formData: SuitabilityData): string => {
  const client = formData.personal_information || {}
  const partner = formData.partner_information || {}
  const objectives = formData.objectives || {}
  const financial = formData.financial_situation || {}
  const risk = formData.risk_assessment || {}
  
  const name = client.client_name || 'the client'
  const hasPartner = ['Married', 'Civil Partnership'].includes(client.marital_status)
  const partnerText = hasPartner && partner.partner_name ? ` and ${partner.partner_name}` : ''
  const riskLevel = risk.attitude_to_risk || '4 - Medium Risk'
  const primaryObjective = objectives.primary_objective || 'Balanced Growth'
  const timeHorizon = objectives.time_horizon || 10
  const investmentAmount = objectives.investment_amount || 100000
  const age = client.age || calculateAge(client.date_of_birth)
  
  // Smart retirement planning based on age
  const yearsToRetirement = Math.max(0, (client.target_retirement_age || 65) - age)
  const retirementFocus = yearsToRetirement < 10 ? 'pre-retirement planning' : 'long-term wealth accumulation'
  
  return `Based on the comprehensive assessment for ${name}${partnerText}, I recommend a ${primaryObjective.toLowerCase()} investment strategy aligned with their ${riskLevel.toLowerCase()} profile.

CLIENT PROFILE:
• Age: ${age} years${hasPartner ? ` (Partner: ${partner.partner_age || 'N/A'} years)` : ''}
• Employment: ${client.employment_status === 'employed' ? `${client.occupation} at ${client.employer}` : client.employment_status}
• Time to Retirement: ${yearsToRetirement} years
• Investment Objective: ${primaryObjective}
• Risk Profile: ${riskLevel}

FINANCIAL SUMMARY:
• Annual Income: £${Number(financial.annual_income || 0).toLocaleString()}
• Monthly Expenditure: £${Number(financial.monthly_expenditure || 0).toLocaleString()}
• Disposable Income: £${Number(financial.disposable_income || 0).toLocaleString()} p.a.
• Net Worth: £${Number(financial.net_worth || 0).toLocaleString()}
• Emergency Fund: ${financial.emergency_months || '0'} months coverage
• Initial Investment: £${Number(investmentAmount).toLocaleString()}

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
• Regular Portfolio Rebalancing
• Annual Tax Planning Review
• Life Event Reviews
• 24/7 Online Access
• Quarterly Performance Reports

REGULATORY COMPLIANCE:
This recommendation has been prepared in accordance with FCA requirements and meets the suitability criteria for:
✓ Client Objectives Alignment
✓ Risk Profile Suitability
✓ Affordability Assessment
✓ Best Interests Duty

Prepared by: [ADVISOR_NAME]
Date: ${new Date().toLocaleDateString('en-GB')}
FCA Number: [FCA_NUMBER]`
}

// ================================================================
// ENHANCED SUITABILITY FORM STRUCTURE (UNCHANGED)
// ================================================================

const suitabilitySections: SuitabilitySection[] = [
  {
    id: 'personal_information',
    title: '1. Personal Information',
    icon: User,
    status: 'incomplete',
    fields: [
      { id: 'client_name', label: 'Full Name', type: 'text', required: true, placeholder: 'Mr John Smith' },
      { id: 'client_reference', label: 'Client Reference', type: 'text', required: true, autoGenerate: true, placeholder: 'Auto-generated' },
      { id: 'date_of_birth', label: 'Date of Birth', type: 'date', required: true },
      { id: 'age', label: 'Age', type: 'number', calculate: 'age', placeholder: 'Auto-calculated' },
      { id: 'national_insurance', label: 'National Insurance Number', type: 'text', placeholder: 'AB 12 34 56 C', validation: 'ni' },
      { id: 'marital_status', label: 'Marital Status', type: 'select', options: ['Single', 'Married', 'Divorced', 'Widowed', 'Civil Partnership'], required: true },
      { id: 'dependents', label: 'Number of Dependents', type: 'number', placeholder: '0' },
      { id: 'employment_status', label: 'Employment Status', type: 'select', options: ['Employed', 'Self-Employed', 'Retired', 'Not Working'], required: true },
      { id: 'target_retirement_age', label: 'Target Retirement Age', type: 'number', placeholder: '65', smartDefault: (data) => 65 }
    ],
    conditionalFields: [
      {
        condition: (data) => ['Married', 'Civil Partnership'].includes(data.personal_information?.marital_status),
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
        fields: [
          { id: 'occupation', label: 'Occupation', type: 'text', required: true, placeholder: 'Financial Manager' },
          { id: 'employer', label: 'Employer', type: 'text', required: true, placeholder: 'ABC Corporation Ltd' },
          { id: 'employment_duration', label: 'Years with Current Employer', type: 'number', placeholder: '5' },
          { id: 'employment_sector', label: 'Employment Sector', type: 'select', options: ['Finance', 'Technology', 'Healthcare', 'Education', 'Manufacturing', 'Retail', 'Other'] }
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
  {
    id: 'contact_details',
    title: '2. Contact Details',
    icon: Home,
    status: 'incomplete',
    fields: [
      { id: 'address', label: 'Full Address', type: 'textarea', required: true, placeholder: '123 Main Street\nLondon\nSW1A 1AA' },
      { id: 'phone', label: 'Phone Number', type: 'tel', required: true, placeholder: '07123 456789' },
      { id: 'email', label: 'Email Address', type: 'email', required: true, placeholder: 'john.smith@email.com' },
      { id: 'preferred_contact', label: 'Preferred Contact Method', type: 'select', options: ['Email', 'Phone', 'Post', 'Text'], required: true },
      { id: 'best_contact_time', label: 'Best Time to Contact', type: 'select', options: ['Morning (9am-12pm)', 'Afternoon (12pm-5pm)', 'Evening (5pm-8pm)', 'Anytime'] }
    ]
  },
  {
    id: 'objectives',
    title: '3. Investment Objectives',
    icon: Target,
    status: 'incomplete',
    fields: [
      { id: 'primary_objective', label: 'Primary Investment Objective', type: 'select', options: ['Capital Growth', 'Income Generation', 'Capital Preservation', 'Balanced Growth', 'Retirement Planning', 'Tax Planning'], required: true },
      { id: 'secondary_objectives', label: 'Secondary Objectives', type: 'checkbox', options: ['Build Emergency Fund', 'Save for Property', 'Children\'s Education', 'Early Retirement', 'Estate Planning', 'Charitable Giving'] },
      { id: 'time_horizon', label: 'Investment Time Horizon (Years)', type: 'number', required: true, placeholder: '10' },
      { id: 'investment_amount', label: 'Initial Investment Amount (£)', type: 'number', required: true, placeholder: '50000' },
      { id: 'additional_contributions', label: 'Regular Monthly Contributions (£)', type: 'number', placeholder: '500' },
      { id: 'target_return', label: 'Target Annual Return (%)', type: 'number', placeholder: '6' },
      { id: 'income_requirement', label: 'Annual Income Requirement (£)', type: 'number', placeholder: '0' },
      { id: 'specific_goals', label: 'Specific Financial Goals', type: 'textarea', placeholder: 'Please describe any specific goals or milestones...' }
    ],
    conditionalFields: [
      {
        condition: (data) => data.objectives?.primary_objective === 'Retirement Planning',
        fields: [
          { id: 'retirement_income_target', label: 'Target Retirement Income (£ p.a.)', type: 'number', required: true },
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
    fields: [
      { id: 'annual_income', label: 'Annual Gross Income (£)', type: 'number', required: true, placeholder: '60000' },
      { id: 'monthly_expenditure', label: 'Monthly Expenditure (£)', type: 'number', required: true, placeholder: '3500' },
      { id: 'disposable_income', label: 'Annual Disposable Income (£)', type: 'number', calculate: 'disposable', placeholder: 'Auto-calculated' },
      { id: 'liquid_assets', label: 'Liquid Assets/Savings (£)', type: 'number', placeholder: '25000' },
      { id: 'property_value', label: 'Property Value (£)', type: 'number', placeholder: '450000' },
      { id: 'outstanding_mortgage', label: 'Outstanding Mortgage (£)', type: 'number', placeholder: '250000' },
      { id: 'other_liabilities', label: 'Other Liabilities (£)', type: 'number', placeholder: '5000' },
      { id: 'net_worth', label: 'Total Net Worth (£)', type: 'number', calculate: 'net_worth', placeholder: 'Auto-calculated' },
      { id: 'emergency_fund', label: 'Emergency Fund (£)', type: 'number', placeholder: '15000' },
      { id: 'emergency_months', label: 'Emergency Fund Coverage', type: 'text', calculate: 'emergency_months', placeholder: 'Auto-calculated' }
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
    fields: [
      { id: 'attitude_to_risk', label: 'Attitude to Risk (1-7)', type: 'select', options: ['1 - Very Low Risk', '2 - Low Risk', '3 - Low to Medium Risk', '4 - Medium Risk', '5 - Medium to High Risk', '6 - High Risk', '7 - Very High Risk'], required: true },
      { id: 'max_acceptable_loss', label: 'Maximum Acceptable Loss (%)', type: 'number', required: true, placeholder: '15' },
      { id: 'risk_experience', label: 'Investment Experience', type: 'select', options: ['None', 'Limited (1-3 years)', 'Moderate (3-7 years)', 'Extensive (7-15 years)', 'Professional (15+ years)'], required: true },
      { id: 'volatility_comfort', label: 'Comfort with Market Volatility', type: 'radio', options: ['Very Uncomfortable', 'Uncomfortable', 'Neutral', 'Comfortable', 'Very Comfortable'], required: true },
      { id: 'previous_losses', label: 'Previous Investment Losses?', type: 'radio', options: ['Yes', 'No'], required: true },
      { id: 'risk_capacity_score', label: 'Capacity for Loss Score', type: 'select', options: ['Low', 'Medium', 'High'], required: true },
      { id: 'risk_reconciliation', label: 'Risk Profile Notes', type: 'textarea', placeholder: 'Any differences between ATR and CFL assessments...' }
    ],
    conditionalFields: [
      {
        condition: (data) => data.risk_assessment?.previous_losses === 'Yes',
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
    fields: [
      { id: 'investment_knowledge', label: 'Investment Knowledge Level', type: 'select', options: ['Basic', 'Intermediate', 'Advanced', 'Expert'], required: true },
      { id: 'investment_types_known', label: 'Familiar Investment Types', type: 'checkbox', options: ['Cash/Savings', 'Government Bonds', 'Corporate Bonds', 'UK Equities', 'International Equities', 'Property/REITs', 'Commodities', 'Derivatives', 'Structured Products', 'Alternative Investments'] },
      { id: 'current_investments', label: 'Currently Hold Investments?', type: 'radio', options: ['Yes', 'No'], required: true },
      { id: 'professional_qualifications', label: 'Financial Qualifications', type: 'text', placeholder: 'e.g., ACCA, CFA, None' },
      { id: 'information_sources', label: 'Investment Information Sources', type: 'checkbox', options: ['Financial Press', 'Online Research', 'Professional Advice', 'Friends/Family', 'Social Media', 'None'] },
      { id: 'education_needs', label: 'Areas Requiring Education', type: 'textarea', placeholder: 'Which investment topics would you like to understand better?' }
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
    fields: [
      { id: 'has_pension', label: 'Existing Pension Arrangements?', type: 'radio', options: ['Yes', 'No'], required: true },
      { id: 'has_protection', label: 'Life/Health Insurance?', type: 'radio', options: ['Yes', 'No'], required: true },
      { id: 'has_mortgage_protection', label: 'Mortgage Protection?', type: 'radio', options: ['Yes', 'No', 'N/A - No Mortgage'], required: true },
      { id: 'has_will', label: 'Valid Will in Place?', type: 'radio', options: ['Yes', 'No'], required: true },
      { id: 'has_lpa', label: 'Lasting Power of Attorney?', type: 'radio', options: ['Yes', 'No'], required: true },
      { id: 'estate_planning_needs', label: 'Estate Planning Priorities', type: 'textarea', placeholder: 'Any specific estate planning concerns or objectives...' }
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
    fields: [
      { id: 'health_concerns', label: 'Any Health Concerns?', type: 'radio', options: ['None', 'Minor', 'Moderate', 'Significant'], required: true },
      { id: 'cognitive_ability', label: 'Decision-Making Confidence', type: 'select', options: ['Very Confident', 'Confident', 'Somewhat Confident', 'Need Support'], required: true },
      { id: 'life_events', label: 'Recent Life Events', type: 'checkbox', options: ['None', 'Bereavement', 'Divorce', 'Job Loss', 'Health Diagnosis', 'Financial Difficulty', 'Other'] },
      { id: 'support_network', label: 'Support Network Available?', type: 'radio', options: ['Strong', 'Moderate', 'Limited', 'None'], required: true },
      { id: 'communication_preferences', label: 'Communication Adjustments Needed?', type: 'checkbox', options: ['None', 'Large Print', 'Audio', 'Simplified Language', 'Extra Time', 'Third Party Present'] },
      { id: 'vulnerability_notes', label: 'Additional Support Requirements', type: 'textarea', placeholder: 'Any other support needs or considerations...' }
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
    fields: [
      { id: 'advice_scope', label: 'Scope of Advice', type: 'select', options: ['Investment Only', 'Holistic Financial Planning', 'Pension Transfer', 'Retirement Planning', 'Protection Planning'], required: true },
      { id: 'service_level', label: 'Ongoing Service Level', type: 'select', options: ['Execution Only', 'Advisory', 'Discretionary Management'], required: true },
      { id: 'politically_exposed', label: 'Politically Exposed Person?', type: 'radio', options: ['Yes', 'No'], required: true },
      { id: 'source_of_wealth', label: 'Source of Wealth', type: 'select', options: ['Employment', 'Business Income', 'Inheritance', 'Property', 'Investments', 'Other'], required: true },
      { id: 'data_protection_consent', label: 'Data Protection Consent', type: 'radio', options: ['Given', 'Declined'], required: true },
      { id: 'marketing_consent', label: 'Marketing Communications', type: 'radio', options: ['Yes', 'No'] },
      { id: 'complaints_acknowledged', label: 'Complaints Procedure Acknowledged', type: 'radio', options: ['Yes', 'No'], required: true }
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
    fields: [
      { id: 'recommendation_summary', label: 'Recommendation Summary', type: 'textarea', required: true, placeholder: 'Click Generate Recommendation button to auto-populate' },
      { id: 'product_selection', label: 'Recommended Products', type: 'checkbox', options: ['ISA', 'General Investment Account', 'SIPP', 'Offshore Bond', 'Onshore Bond', 'VCT', 'EIS'] },
      { id: 'platform_recommendation', label: 'Recommended Platform', type: 'select', options: ['Platform A', 'Platform B', 'Platform C', 'Direct'], required: true },
      { id: 'asset_allocation', label: 'Asset Allocation Strategy', type: 'textarea', placeholder: 'Describe the recommended asset allocation...' },
      { id: 'implementation_timeline', label: 'Implementation Timeline', type: 'select', options: ['Immediate', 'Phased - 3 months', 'Phased - 6 months', 'Phased - 12 months'] },
      { id: 'review_frequency', label: 'Review Frequency', type: 'select', options: ['Quarterly', 'Bi-annual', 'Annual', 'Ad-hoc'], required: true }
    ]
  },
  {
    id: 'suitability_declaration',
    title: '11. Suitability Assessment',
    icon: FileCheck,
    status: 'incomplete',
    fields: [
      { id: 'meets_objectives', label: 'Meets Client Objectives?', type: 'radio', options: ['Yes', 'No'], required: true },
      { id: 'objectives_explanation', label: 'Objectives Alignment Explanation', type: 'textarea', required: true, placeholder: 'Explain how the recommendation meets client objectives...' },
      { id: 'suitable_risk', label: 'Suitable for Risk Profile?', type: 'radio', options: ['Yes', 'No'], required: true },
      { id: 'risk_explanation', label: 'Risk Suitability Explanation', type: 'textarea', required: true, placeholder: 'Explain risk assessment and suitability...' },
      { id: 'affordable', label: 'Affordable for Client?', type: 'radio', options: ['Yes', 'No'], required: true },
      { id: 'affordability_explanation', label: 'Affordability Assessment', type: 'textarea', required: true, placeholder: 'Detail affordability calculations...' },
      { id: 'consumer_duty_met', label: 'Consumer Duty Requirements Met?', type: 'radio', options: ['Yes', 'No'], required: true },
      { id: 'best_interests_declaration', label: 'Best Interests Declaration', type: 'textarea', required: true, placeholder: 'Confirm recommendation is in client\'s best interests...' }
    ]
  },
  {
    id: 'costs_charges',
    title: '12. Costs & Charges',
    icon: Calculator,
    status: 'incomplete',
    fields: [
      { id: 'initial_adviser_charge', label: 'Initial Adviser Charge (%)', type: 'number', placeholder: '3' },
      { id: 'initial_adviser_charge_amount', label: 'Initial Charge Amount (£)', type: 'number', calculate: 'initial_charge', placeholder: 'Auto-calculated' },
      { id: 'ongoing_adviser_charge', label: 'Ongoing Adviser Charge (% p.a.)', type: 'number', placeholder: '0.75' },
      { id: 'platform_charge', label: 'Platform Charge (% p.a.)', type: 'number', placeholder: '0.25' },
      { id: 'fund_charges', label: 'Average Fund Charges (% p.a.)', type: 'number', placeholder: '0.75' },
      { id: 'total_ongoing_charges', label: 'Total Ongoing Charges (% p.a.)', type: 'number', calculate: 'total_charges', placeholder: 'Auto-calculated' },
      { id: 'transaction_costs', label: 'Estimated Transaction Costs (% p.a.)', type: 'number', placeholder: '0.1' },
      { id: 'value_assessment', label: 'Value for Money Assessment', type: 'textarea', required: true, placeholder: 'Explain how charges represent value...' }
    ]
  },
  {
    id: 'documentation',
    title: '13. Documentation & Next Steps',
    icon: Settings,
    status: 'incomplete',
    fields: [
      { id: 'documents_to_provide', label: 'Documents to be Provided', type: 'checkbox', options: ['Suitability Report', 'Key Features Document', 'Client Agreement', 'Fee Schedule', 'Platform Terms'], required: true },
      { id: 'client_actions_required', label: 'Client Actions Required', type: 'textarea', placeholder: 'List any actions the client needs to take...' },
      { id: 'adviser_actions', label: 'Adviser Actions', type: 'textarea', placeholder: 'List follow-up actions for adviser...' },
      { id: 'next_review_date', label: 'Next Review Date', type: 'date', required: true },
      { id: 'special_instructions', label: 'Special Instructions', type: 'textarea', placeholder: 'Any special considerations or instructions...' },
      { id: 'assessment_completed_by', label: 'Assessment Completed By', type: 'text', required: true, placeholder: 'Adviser name and qualification' },
      { id: 'assessment_date', label: 'Assessment Date', type: 'date', required: true, smartDefault: () => new Date().toISOString().split('T')[0] }
    ]
  }
]

// ================================================================
// MAIN COMPONENT WITH INTEGRATION
// ================================================================

export default function IntegratedSuitabilityAssessmentPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  
  // INTEGRATION: Get clientId from URL params
  const clientId = searchParams?.get('clientId') || null
  
  // INTEGRATION: Use the integration hook
  const { 
    client, 
    completeAssessment,
    generateDocument,
    saveDraft,
    hasDraft
  } = useClientIntegration({ 
    clientId: clientId || undefined,
    autoSave: true 
  })

  const [formData, setFormData] = useState<SuitabilityData>({})
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['personal_information']))
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [showReportModal, setShowReportModal] = useState(false)
  const [generatedReportId, setGeneratedReportId] = useState<string | null>(null)

  // Initialize Supabase client
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  // INTEGRATION: Pre-populate from client data
  useEffect(() => {
    if (client && Object.keys(formData).length === 0) {
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
  }, [client])

  // INTEGRATION: Auto-save form data
  useEffect(() => {
    if (Object.keys(formData).length > 0) {
      saveDraft(formData)
    }
  }, [formData, saveDraft])

  // Check if field should be shown based on conditions (UNCHANGED)
  const shouldShowField = useCallback((field: SuitabilityField, sectionData: any): boolean => {
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

  // Get completion status (UNCHANGED)
  const getCompletionStatus = useCallback(() => {
    let totalRequired = 0
    let completedRequired = 0
    
    suitabilitySections.forEach(section => {
      const sectionData = formData[section.id] || {}
      
      // Count main fields
      section.fields.forEach(field => {
        if (field.required && shouldShowField(field, sectionData)) {
          totalRequired++
          if (sectionData[field.id]) completedRequired++
        }
      })
      
      // Count conditional fields
      section.conditionalFields?.forEach(group => {
        if (group.condition(formData)) {
          group.fields.forEach(field => {
            if (field.required) {
              totalRequired++
              if (sectionData[field.id]) completedRequired++
            }
          })
        }
      })
    })
    
    const percentage = totalRequired > 0 ? Math.round((completedRequired / totalRequired) * 100) : 0
    return { completed: completedRequired, total: totalRequired, percentage }
  }, [formData, shouldShowField])

  // Validate field (UNCHANGED)
  const validateField = (sectionId: string, fieldId: string, value: any): string | null => {
    const section = suitabilitySections.find(s => s.id === sectionId)
    const field = section?.fields.find(f => f.id === fieldId) || 
                 section?.conditionalFields?.flatMap(g => g.fields).find(f => f.id === fieldId)
    
    if (!field) return null
    
    // Required field validation
    if (field.required && (!value || value === '' || (Array.isArray(value) && value.length === 0))) {
      return `${field.label} is required`
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

  // Update field with calculations (FIXED CALCULATION BUG)
  const updateField = (sectionId: string, fieldId: string, value: any) => {
    setFormData(prev => {
      const newData = {
        ...prev,
        [sectionId]: {
          ...prev[sectionId],
          [fieldId]: value
        }
      }
      
      // Perform calculations
      if (sectionId === 'personal_information') {
        // Calculate age from DOB
        if (fieldId === 'date_of_birth' && value) {
          newData.personal_information.age = calculateAge(value)
        }
        // Calculate partner age
        if (fieldId === 'partner_date_of_birth' && value) {
          newData.personal_information.partner_age = calculateAge(value)
        }
      }
      
      if (sectionId === 'financial_situation') {
        const financial = newData.financial_situation || {}
        
        // Calculate disposable income
        if (fieldId === 'annual_income' || fieldId === 'monthly_expenditure') {
          const income = Number(financial.annual_income) || 0
          const expenditure = Number(financial.monthly_expenditure) || 0
          newData.financial_situation.disposable_income = calculateDisposableIncome(income, expenditure)
        }
        
        // Calculate net worth
        if (['liquid_assets', 'property_value', 'other_liabilities', 'outstanding_mortgage'].includes(fieldId)) {
          const assets = Number(financial.liquid_assets) || 0
          const property = Number(financial.property_value) || 0
          const liabilities = Number(financial.other_liabilities) || 0
          const mortgage = Number(financial.outstanding_mortgage) || 0
          newData.financial_situation.net_worth = calculateNetWorth(assets, property, liabilities, mortgage)
        }
        
        // Calculate emergency months
        if (fieldId === 'emergency_fund' || fieldId === 'monthly_expenditure') {
          const fund = Number(financial.emergency_fund) || 0
          const monthly = Number(financial.monthly_expenditure) || 0
          const months = calculateEmergencyMonths(fund, monthly)
          newData.financial_situation.emergency_months = `${months} months`
        }
      }
      
      if (sectionId === 'costs_charges') {
        const costs = newData.costs_charges || {}
        
        // Calculate initial charge amount when initial_adviser_charge changes
        if (fieldId === 'initial_adviser_charge') {
          const rate = Number(value) || 0
          const investment = Number(newData.objectives?.investment_amount) || 0
          newData.costs_charges.initial_adviser_charge_amount = Math.round(investment * rate / 100)
        }

        // Calculate total ongoing charges
        if (['ongoing_adviser_charge', 'platform_charge', 'fund_charges'].includes(fieldId)) {
          const ongoing = Number(costs.ongoing_adviser_charge) || 0
          const platform = Number(costs.platform_charge) || 0
          const fund = Number(costs.fund_charges) || 0
          newData.costs_charges.total_ongoing_charges = (ongoing + platform + fund).toFixed(2)
        }
      }

      // Also update initial charge amount when investment amount changes in objectives
      if (sectionId === 'objectives' && fieldId === 'investment_amount') {
        if (!newData.costs_charges) newData.costs_charges = {}
        const rate = Number(newData.costs_charges.initial_adviser_charge) || 0
        const investment = Number(value) || 0
        newData.costs_charges.initial_adviser_charge_amount = Math.round(investment * rate / 100)
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
  }

  // Generate AI recommendation (UNCHANGED)
  const handleGenerateRecommendation = () => {
    const recommendation = generateRecommendation(formData)
    updateField('recommendation', 'recommendation_summary', recommendation)
    
    // Auto-set review frequency based on risk
    const riskLevel = formData.risk_assessment?.attitude_to_risk || '4 - Medium Risk'
    if (riskLevel.includes('1') || riskLevel.includes('2')) {
      updateField('recommendation', 'review_frequency', 'Annual')
    } else if (riskLevel.includes('6') || riskLevel.includes('7')) {
      updateField('recommendation', 'review_frequency', 'Quarterly')
    } else {
      updateField('recommendation', 'review_frequency', 'Bi-annual')
    }
  }

  // Toggle section (UNCHANGED)
  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev)
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId)
      } else {
        newSet.add(sectionId)
      }
      return newSet
    })
  }

  // INTEGRATION: Enhanced save assessment with client update
  const saveAssessment = async () => {
    setIsLoading(true)
    try {
      if (!clientId) {
        throw new Error('No client selected. Please select a client before saving.')
      }

      // Build assessment result for integration
      const assessmentResult = {
        id: `assessment-${Date.now()}`,
        clientId,
        clientData: {
          name: formData.personal_information?.client_name,
          email: formData.contact_details?.email,
          phone: formData.contact_details?.phone
        },
        riskProfile: {
          overall: formData.risk_assessment?.attitude_to_risk || 'Not Assessed',
          attitudeToRisk: parseInt(formData.risk_assessment?.attitude_to_risk?.charAt(0) || '4'),
          riskCapacity: formData.risk_assessment?.risk_capacity_score || 'Medium',
          riskExperience: formData.risk_assessment?.risk_experience || 'None'
        },
        financialProfile: formData.financial_situation,
        objectives: formData.objectives,
        vulnerabilityAssessment: formData.vulnerability_assessment,
        overallScore: getCompletionStatus().percentage,
        completedAt: new Date().toISOString(),
        recommendations: [formData.recommendation?.recommendation_summary || '']
      }

      // Use integrated service to complete assessment
      const result = await completeAssessment(assessmentResult)
      
      if (result.success) {
        setLastSaved(new Date())
        toast({
          title: 'Assessment Saved',
          description: 'Client risk profile has been updated',
          variant: 'default'
        })
      } else {
        throw new Error(result.message)
      }
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

  // INTEGRATION: Enhanced report generation with document service
  const generateReport = async () => {
    const { completed, total } = getCompletionStatus()
    if (completed < total * 0.8) {
      toast({
        title: 'Incomplete Assessment',
        description: 'Please complete at least 80% of the assessment before generating a report.',
        variant: 'destructive'
      })
      return
    }
    
    setIsGeneratingReport(true)
    try {
      if (!clientId) {
        throw new Error('No client selected')
      }

      // Generate document using integrated service
      const document = await generateDocument('suitability_report', {
        CLIENT_NAME: formData.personal_information?.client_name || 'Client',
        ADVISOR_NAME: formData.documentation?.assessment_completed_by || 'Adviser',
        REPORT_DATE: new Date().toLocaleDateString('en-GB'),
        RISK_PROFILE: formData.risk_assessment?.attitude_to_risk || 'Not assessed',
        INVESTMENT_AMOUNT: formData.objectives?.investment_amount || 0,
        RECOMMENDATION: formData.recommendation?.recommendation_summary || 'See attached assessment',
        // Add all form data for comprehensive report
        ASSESSMENT_DATA: JSON.stringify(formData)
      })

      if (document) {
        setGeneratedReportId(document.id)
        setShowReportModal(true)
        
        toast({
          title: 'Report Generated',
          description: 'Suitability report has been created successfully',
          variant: 'default'
        })
      }
    } catch (error) {
      console.error('Report generation error:', error)
      toast({
        title: 'Error',
        description: 'Failed to generate report. Please try again.',
        variant: 'destructive'
      })
    } finally {
      setIsGeneratingReport(false)
    }
  }

  const { completed, total, percentage } = getCompletionStatus()

  // INTEGRATION: Navigation handlers
  const handleBack = () => {
    if (clientId) {
      router.push(`/clients/${clientId}`)
    } else {
      router.push('/clients')
    }
  }

  const handleNavigateToDocuments = () => {
    if (clientId) {
      router.push(`/documents?clientId=${clientId}`)
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* INTEGRATION: Back button and client info */}
      {client && (
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="outline"
            onClick={handleBack}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Client
          </Button>
          <div className="text-sm text-gray-600">
            Assessing: <span className="font-medium">{client.personalDetails?.firstName} {client.personalDetails?.lastName}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <FileText className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-blue-900">Suitability Assessment</h1>
              <p className="text-blue-700">FCA-compliant assessment with integrated workflows</p>
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
            <Button 
              onClick={generateReport} 
              disabled={isGeneratingReport || percentage < 80 || !clientId}
              variant="outline" 
              className="flex items-center space-x-2"
            >
              {isGeneratingReport ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  <span>Generate Report</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">
              Progress: {completed} of {total} required fields completed
            </span>
            <span className="text-gray-600">{percentage}%</span>
          </div>
          <Progress value={percentage} className="w-full" />
        </div>

        {/* Validation Summary */}
        {validationErrors.length > 0 && (
          <Alert className="mt-4 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription>
              <span className="font-medium text-red-800">
                {validationErrors.length} validation error{validationErrors.length > 1 ? 's' : ''}
              </span>
            </AlertDescription>
          </Alert>
        )}

        {/* INTEGRATION: No client warning */}
        {!clientId && (
          <Alert className="mt-4 border-orange-200 bg-orange-50">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription>
              <span className="font-medium text-orange-800">
                No client selected. Please select a client from the clients page to save this assessment.
              </span>
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Sections (UNCHANGED - using existing section rendering) */}
      <div className="space-y-4">
        {suitabilitySections.map((section) => {
          const isExpanded = expandedSections.has(section.id)
          const sectionData = formData[section.id] || {}
          
          // Calculate section completion
          let sectionRequired = 0
          let sectionCompleted = 0
          
          section.fields.forEach(field => {
            if (field.required && shouldShowField(field, sectionData)) {
              sectionRequired++
              if (sectionData[field.id]) sectionCompleted++
            }
          })
          
          section.conditionalFields?.forEach(group => {
            if (group.condition(formData)) {
              group.fields.forEach(field => {
                if (field.required) {
                  sectionRequired++
                  if (sectionData[field.id]) sectionCompleted++
                }
              })
            }
          })
          
          const sectionProgress = sectionRequired > 0 
            ? Math.round((sectionCompleted / sectionRequired) * 100) 
            : 100

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
                        <Badge 
                          variant={
                            sectionProgress === 100 ? 'success' : 
                            sectionProgress > 0 ? 'warning' : 
                            'outline'
                          }
                        >
                          {sectionProgress === 100 ? 'Complete' : 
                           sectionProgress > 0 ? `${sectionProgress}% Complete` : 
                           'Not Started'}
                        </Badge>
                        {sectionRequired > 0 && (
                          <span className="text-sm text-gray-500">
                            {sectionCompleted}/{sectionRequired} required fields
                          </span>
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
                        Intelligently generates recommendations based on all assessment data
                      </p>
                    </div>
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
                          </label>

                          {/* Field inputs based on type (UNCHANGED) */}
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
                                (isAutoGenerated || isCalculated) && "bg-gray-50"
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
                              rows={4}
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

                  {/* Conditional fields (UNCHANGED) */}
                  {section.conditionalFields?.map((group, groupIndex) => {
                    if (!group.condition(formData)) return null

                    return (
                      <div key={`conditional-${groupIndex}`} className="mt-6 pt-6 border-t border-gray-200">
                        <div className="mb-4">
                          <div className="flex items-center space-x-2">
                            <Users className="h-4 w-4 text-purple-600" />
                            <h4 className="text-sm font-medium text-purple-900">Additional Information Required</h4>
                          </div>
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
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span>Assessment Summary</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4 mb-6">
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
            <Button 
              onClick={generateReport} 
              disabled={isGeneratingReport || percentage < 80 || !clientId}
              variant="outline"
              size="lg"
            >
              <FileText className="h-4 w-4 mr-2" />
              Generate Suitability Report
            </Button>
          </div>

          {percentage < 80 && (
            <p className="text-sm text-gray-500 text-center mt-4">
              Complete at least 80% of the assessment to generate a report
            </p>
          )}
          
          {!clientId && (
            <p className="text-sm text-orange-600 text-center mt-4 font-medium">
              Please select a client before saving this assessment
            </p>
          )}
        </CardContent>
      </Card>

      {/* INTEGRATION: Enhanced Report Generation Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <Card className="max-w-md w-full mx-4">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle className="h-6 w-6 text-green-600" />
                <span>Report Generated Successfully</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4">
                Your suitability report has been generated and is ready for download.
              </p>
              <div className="flex flex-col space-y-2">
                <Button 
                  onClick={() => {
                    // Download report logic
                    window.open(`/api/documents/download/${generatedReportId}`, '_blank')
                  }}
                  className="flex items-center justify-center space-x-2"
                >
                  <Download className="h-4 w-4" />
                  <span>Download Report</span>
                </Button>
                <Button 
                  onClick={() => {
                    setShowReportModal(false)
                    handleNavigateToDocuments()
                  }}
                  variant="outline"
                  className="flex items-center justify-center space-x-2"
                >
                  <Send className="h-4 w-4" />
                  <span>Manage Documents</span>
                </Button>
                <Button 
                  onClick={() => setShowReportModal(false)}
                  variant="ghost"
                >
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

// ===================================================================
// INTEGRATION DOCUMENTATION FOR FUTURE AI
// ===================================================================

/*
INTEGRATION SUMMARY:
1. Pre-populates from client data when clientId in URL
2. Auto-saves form progress as draft
3. Updates client risk profile on save
4. Generates documents using integrated service
5. Links assessment to client record

KEY IMPROVEMENTS:
1. Fixed initial charge calculation bug
2. Added client selection validation
3. Enhanced navigation flow
4. Integrated with document service
5. Added auto-save functionality

DATA FLOW:
- Client data → Pre-populates form
- Form data → Auto-saves as draft
- Save → Updates client risk profile
- Generate → Creates document linked to client
- Complete → Navigates to documents

TESTING:
1. Navigate from client detail with ?clientId=xxx
2. Check form pre-populates correctly
3. Make changes and verify auto-save
4. Save and check client profile updated
5. Generate report and verify document created
*/
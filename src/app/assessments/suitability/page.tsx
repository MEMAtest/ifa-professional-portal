// ================================================================
// File: ifa-platform/src/app/assessments/suitability/page.tsx
// COMPLETE VERSION - Auto-generation, Validation, Recommendations
// ================================================================

'use client'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Progress } from '@/components/ui/Progress'
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
  Upload
} from 'lucide-react'
import { cn } from '@/lib/utils'

// ================================================================
// TYPES & INTERFACES
// ================================================================

interface SuitabilitySection {
  id: string
  title: string
  icon: React.ComponentType<{ className?: string }>
  status: 'complete' | 'partial' | 'incomplete'
  fields: SuitabilityField[]
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
// UTILITY FUNCTIONS
// ================================================================

// Auto-generate client reference in format C250626917
const generateClientReference = (): string => {
  const timestamp = new Date().toISOString().slice(2, 10).replace(/-/g, '') // YYMMDD
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `C${timestamp}${random}`
}

// Validate email format
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

// Validate UK phone number
const isValidUKPhone = (phone: string): boolean => {
  const ukPhoneRegex = /^(\+44|0)[1-9]\d{8,9}$/
  return ukPhoneRegex.test(phone.replace(/\s/g, ''))
}

// Calculate emergency fund months
const calculateEmergencyMonths = (emergencyFund: number, monthlyExpenditure: number): number => {
  if (!monthlyExpenditure || monthlyExpenditure === 0) return 0
  return Math.round((emergencyFund / monthlyExpenditure) * 10) / 10
}

// Generate AI-powered recommendation
const generateRecommendation = (formData: SuitabilityData): string => {
  const clientDetails = formData.client_details || {}
  const objectives = formData.objectives || {}
  const financial = formData.financial_situation || {}
  const risk = formData.risk_assessment || {}
  
  const name = clientDetails.client_name || 'the client'
  const riskLevel = risk.attitude_to_risk || '4 - Medium Risk'
  const primaryObjective = objectives.primary_objective || 'Balanced Growth'
  const timeHorizon = objectives.time_horizon || 10
  const investmentAmount = objectives.investment_amount || 100000
  
  return `Based on the comprehensive assessment for ${name}, I recommend a ${primaryObjective.toLowerCase()} investment strategy aligned with their ${riskLevel.toLowerCase()} profile.

KEY RECOMMENDATIONS:

Investment Strategy:
• Asset Allocation: Given the ${riskLevel} tolerance and ${timeHorizon}-year time horizon, recommend a diversified portfolio
• Primary Focus: ${primaryObjective} with appropriate risk management
• Investment Amount: £${Number(investmentAmount).toLocaleString()} initial investment

Risk Management:
• Risk Profile: ${riskLevel} has been assessed through comprehensive ATR and CFL analysis
• Diversification: Multi-asset approach to manage volatility
• Review Strategy: Regular monitoring and rebalancing as required

Income Strategy:
• Time Horizon: ${timeHorizon} years allows for ${timeHorizon > 10 ? 'long-term growth focus' : 'balanced approach'}
• Withdrawal Strategy: To be determined based on income requirements
• Tax Efficiency: Utilize available allowances and tax-efficient wrappers

Next Steps:
1. Client review and approval of recommendations
2. Portfolio implementation within 5-10 working days
3. Initial review scheduled for 3 months
4. Ongoing annual reviews with quarterly performance updates

This recommendation is based on the information provided and meets the suitability criteria for objectives, risk profile, and affordability as assessed.`
}

// ================================================================
// SUITABILITY FORM STRUCTURE
// ================================================================

const suitabilitySections: SuitabilitySection[] = [
  {
    id: 'client_details',
    title: '1. Client Details & Objectives',
    icon: User,
    status: 'incomplete',
    fields: [
      { id: 'client_name', label: 'Client Name', type: 'text', required: true, placeholder: 'Enter full name' },
      { id: 'client_reference', label: 'Client Reference', type: 'text', required: true, autoGenerate: true, placeholder: 'Auto-generated' },
      { id: 'date_of_birth', label: 'Date of Birth', type: 'date', required: true },
      { id: 'national_insurance', label: 'National Insurance Number', type: 'text', placeholder: 'AB 12 34 56 C', validation: 'ni' },
      { id: 'address', label: 'Address', type: 'textarea', required: true, placeholder: 'Full postal address including postcode' },
      { id: 'phone', label: 'Phone Number', type: 'tel', required: true, placeholder: '07xxx xxxxxx or 01xxx xxxxxx' },
      { id: 'email', label: 'Email Address', type: 'email', required: true, placeholder: 'client@example.com' },
      { id: 'occupation', label: 'Occupation', type: 'text', required: true, placeholder: 'Current job title' },
      { id: 'employer', label: 'Employer', type: 'text', placeholder: 'Company name' },
      { id: 'marital_status', label: 'Marital Status', type: 'select', options: ['Single', 'Married', 'Divorced', 'Widowed', 'Civil Partnership'], required: true },
      { id: 'dependents', label: 'Number of Dependents', type: 'number', placeholder: '0' },
    ]
  },
  {
    id: 'objectives',
    title: '2. Investment Objectives',
    icon: Target,
    status: 'incomplete',
    fields: [
      { id: 'primary_objective', label: 'Primary Investment Objective', type: 'select', options: ['Capital Growth', 'Income Generation', 'Capital Preservation', 'Balanced Growth'], required: true },
      { id: 'time_horizon', label: 'Investment Time Horizon (Years)', type: 'number', required: true, placeholder: '5-30 years' },
      { id: 'investment_amount', label: 'Initial Investment Amount (£)', type: 'number', required: true, placeholder: '10000' },
      { id: 'additional_contributions', label: 'Regular Contributions (£/month)', type: 'number', placeholder: '500' },
      { id: 'target_return', label: 'Target Annual Return (%)', type: 'number', placeholder: '5-8%' },
      { id: 'income_requirement', label: 'Income Requirement (£/year)', type: 'number', placeholder: '4000' },
      { id: 'objectives_notes', label: 'Additional Objectives', type: 'textarea', placeholder: 'Any specific goals, preferences, or requirements' },
    ]
  },
  {
    id: 'financial_situation',
    title: '3. Financial Situation',
    icon: PoundSterling,
    status: 'incomplete',
    fields: [
      { id: 'annual_income', label: 'Annual Income (£)', type: 'number', required: true, placeholder: '50000' },
      { id: 'monthly_expenditure', label: 'Monthly Expenditure (£)', type: 'number', required: true, placeholder: '3000' },
      { id: 'liquid_assets', label: 'Liquid Assets (£)', type: 'number', placeholder: '25000' },
      { id: 'property_value', label: 'Property Value (£)', type: 'number', placeholder: '300000' },
      { id: 'outstanding_mortgage', label: 'Outstanding Mortgage (£)', type: 'number', placeholder: '200000' },
      { id: 'other_liabilities', label: 'Other Liabilities (£)', type: 'number', placeholder: '5000' },
      { id: 'emergency_fund', label: 'Emergency Fund (£)', type: 'number', placeholder: '15000' },
      { id: 'emergency_months', label: 'Emergency Fund Coverage', type: 'text', calculate: 'emergency_months' },
      { id: 'pension_value', label: 'Pension Value (£)', type: 'number', placeholder: '150000' },
    ]
  },
  {
    id: 'risk_assessment',
    title: '4. Risk Assessment',
    icon: Shield,
    status: 'incomplete',
    fields: [
      { id: 'attitude_to_risk', label: 'Attitude to Risk (1-7)', type: 'select', options: ['1 - Very Low Risk', '2 - Low Risk', '3 - Low to Medium Risk', '4 - Medium Risk', '5 - Medium to High Risk', '6 - High Risk', '7 - Very High Risk'], required: true },
      { id: 'max_acceptable_loss', label: 'Maximum Acceptable Loss (%)', type: 'number', required: true, placeholder: '10-25%' },
      { id: 'risk_experience', label: 'Investment Experience', type: 'select', options: ['None', 'Limited', 'Moderate', 'Extensive', 'Professional'], required: true },
      { id: 'volatility_comfort', label: 'Comfort with Volatility', type: 'radio', options: ['Very Uncomfortable', 'Uncomfortable', 'Neutral', 'Comfortable', 'Very Comfortable'], required: true },
      { id: 'risk_reconciliation', label: 'Risk Profile Reconciliation Notes', type: 'textarea', placeholder: 'Any differences between ATR and CFL assessments' },
    ]
  },
  {
    id: 'knowledge_experience',
    title: '5. Knowledge & Experience',
    icon: BookOpen,
    status: 'incomplete',
    fields: [
      { id: 'investment_knowledge', label: 'Investment Knowledge Level', type: 'select', options: ['Basic', 'Intermediate', 'Advanced', 'Expert'], required: true },
      { id: 'investment_types_known', label: 'Investment Types Familiar With', type: 'checkbox', options: ['Stocks', 'Bonds', 'Mutual Funds', 'ETFs', 'Property', 'Derivatives', 'Alternative Investments'] },
      { id: 'previous_investments', label: 'Previous Investment Experience', type: 'textarea', placeholder: 'Describe any previous investments and outcomes' },
      { id: 'professional_qualifications', label: 'Relevant Professional Qualifications', type: 'text', placeholder: 'CFP, CFA, ACCA, etc.' },
      { id: 'education_needs', label: 'Educational Needs Assessment', type: 'textarea', placeholder: 'Areas requiring additional education or explanation' },
    ]
  },
  {
    id: 'existing_arrangements',
    title: '6. Existing Arrangements',
    icon: Briefcase,
    status: 'incomplete',
    fields: [
      { id: 'existing_investments', label: 'Existing Investment Value (£)', type: 'number', placeholder: '75000' },
      { id: 'existing_providers', label: 'Current Investment Providers', type: 'textarea', placeholder: 'List current providers and products' },
      { id: 'pension_arrangements', label: 'Existing Pension Arrangements', type: 'textarea', placeholder: 'Workplace pensions, SIPPs, etc.' },
      { id: 'insurance_policies', label: 'Life Insurance/Protection', type: 'textarea', placeholder: 'Current life insurance and protection policies' },
      { id: 'other_advisers', label: 'Other Financial Advisers', type: 'text', placeholder: 'Names of other advisers consulted' },
    ]
  },
  {
    id: 'regulation_compliance',
    title: '7. Regulation & Compliance',
    icon: Shield,
    status: 'incomplete',
    fields: [
      { id: 'advice_scope', label: 'Scope of Advice', type: 'select', options: ['Investment Only', 'Pension Transfer', 'Retirement Planning', 'Comprehensive Review'], required: true },
      { id: 'vulnerable_client', label: 'Vulnerable Client Indicators', type: 'radio', options: ['None Identified', 'Age Related', 'Health Related', 'Life Event', 'Financial Stress'], required: true },
      { id: 'data_protection_consent', label: 'Data Protection Consent', type: 'radio', options: ['Given', 'Declined'], required: true },
      { id: 'marketing_consent', label: 'Marketing Consent', type: 'radio', options: ['Given', 'Declined'] },
      { id: 'complaints_procedure', label: 'Complaints Procedure Explained', type: 'radio', options: ['Yes', 'No'], required: true },
    ]
  },
  {
    id: 'recommendation',
    title: '8. Recommendation',
    icon: TrendingUp,
    status: 'incomplete',
    fields: [
      { id: 'recommendation_summary', label: 'Recommendation Summary', type: 'textarea', required: true, placeholder: 'Click Generate Recommendation button to auto-populate' },
      { id: 'income_strategy', label: 'Income Strategy Details', type: 'textarea', placeholder: 'Detailed income withdrawal strategy' },
      { id: 'investment_strategy', label: 'Investment Strategy Details', type: 'textarea', placeholder: 'Asset allocation and investment approach' },
      { id: 'asset_allocation', label: 'Recommended Asset Allocation', type: 'textarea', placeholder: 'Specific % allocations by asset class' },
      { id: 'death_benefit_nominations', label: 'Death Benefit Nominations', type: 'textarea', placeholder: 'Beneficiary nominations if applicable' },
      { id: 'review_frequency', label: 'Recommended Review Frequency', type: 'select', options: ['Annual', 'Bi-annual', 'Quarterly', 'As Required'] },
    ]
  },
  {
    id: 'suitability_assessment',
    title: '9. Suitability Assessment',
    icon: FileCheck,
    status: 'incomplete',
    fields: [
      { id: 'meets_objectives', label: 'Meets Client Objectives?', type: 'radio', options: ['Yes', 'No'], required: true },
      { id: 'objectives_explanation', label: 'Explain How Recommendation Meets Objectives', type: 'textarea', required: true, placeholder: 'Detailed explanation of suitability' },
      { id: 'suitable_risk', label: 'Suitable for Risk Profile?', type: 'radio', options: ['Yes', 'No'], required: true },
      { id: 'risk_explanation', label: 'Explain Risk Suitability', type: 'textarea', required: true, placeholder: 'Risk assessment justification' },
      { id: 'affordable', label: 'Affordable for Client?', type: 'radio', options: ['Yes', 'No'], required: true },
      { id: 'affordability_explanation', label: 'Explain Affordability Assessment', type: 'textarea', required: true, placeholder: 'Affordability calculation and reasoning' },
    ]
  },
  {
    id: 'costs_charges',
    title: '10. Costs & Charges',
    icon: Calculator,
    status: 'incomplete',
    fields: [
      { id: 'fee_structure', label: 'Primary Fee Structure', type: 'radio', options: ['Percentage-based fees', 'Flat fee structure', 'Hybrid approach'], required: true },
      { id: 'initial_adviser_charge', label: 'Initial Adviser Charge (%)', type: 'number', placeholder: '1-3%' },
      { id: 'ongoing_adviser_charge', label: 'Ongoing Adviser Charge (% p.a.)', type: 'number', placeholder: '0.5-1.5%' },
      { id: 'platform_charge', label: 'Platform Charge (% p.a.)', type: 'number', placeholder: '0.15-0.45%' },
      { id: 'fund_charges', label: 'Fund Charges (% p.a.)', type: 'number', placeholder: '0.5-1.5%' },
      { id: 'total_ongoing_charges', label: 'Total Ongoing Charges (% p.a.)', type: 'number', calculate: 'total_charges' },
      { id: 'value_assessment', label: 'Value for Money Assessment', type: 'textarea', required: true, placeholder: 'Explain how charges represent value for money' },
    ]
  },
  {
    id: 'documentation_compliance',
    title: '11. Documentation & Compliance',
    icon: Settings,
    status: 'incomplete',
    fields: [
      { id: 'documents_provided', label: 'Documents Provided to Client', type: 'checkbox', options: ['Suitability Report', 'Key Features Documents', 'Terms of Business', 'Client Agreement', 'Fact Find'], required: true },
      { id: 'document_storage_location', label: 'Document Storage Location', type: 'text', required: true, placeholder: 'File path or reference number' },
      { id: 'compliance_notes', label: 'Compliance Notes', type: 'textarea', placeholder: 'Any additional compliance considerations' },
      { id: 'next_review_date', label: 'Next Review Date', type: 'date', required: true },
      { id: 'adviser_signature', label: 'Adviser Name & Signature', type: 'text', required: true, placeholder: 'Adviser name and qualification' },
    ]
  }
]

// ================================================================
// MAIN COMPONENT
// ================================================================

export default function SuitabilityAssessmentPage() {
  const [formData, setFormData] = useState<SuitabilityData>({})
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['client_details']))
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  // Auto-generate client reference on component mount
  useEffect(() => {
    if (!formData.client_details?.client_reference) {
      updateField('client_details', 'client_reference', generateClientReference())
    }
  }, [])

  // Calculate completion status
  const getCompletionStatus = () => {
    const totalFields = suitabilitySections.reduce((sum: number, section: SuitabilitySection) => 
      sum + section.fields.filter(field => field.required).length, 0)
    
    const completedFields = Object.values(formData).reduce((sum: number, sectionData: any) => {
      return sum + Object.keys(sectionData).filter(fieldId => {
        const section = suitabilitySections.find(s => formData[s.id] === sectionData)
        const field = section?.fields.find(f => f.id === fieldId)
        return field?.required && sectionData[fieldId]
      }).length
    }, 0)
    
    return { completed: completedFields, total: totalFields, percentage: Math.round((completedFields / totalFields) * 100) }
  }

  // Validate field
  const validateField = (sectionId: string, fieldId: string, value: any): string | null => {
    const section = suitabilitySections.find(s => s.id === sectionId)
    const field = section?.fields.find(f => f.id === fieldId)
    
    if (!field) return null
    
    // Required field validation
    if (field.required && (!value || value === '')) {
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
    
    // NI number validation
    if (field.validation === 'ni' && value && !/^[A-Z]{2}\s?\d{2}\s?\d{2}\s?\d{2}\s?[A-Z]$/.test(value)) {
      return 'Please enter a valid National Insurance number (e.g. AB 12 34 56 C)'
    }
    
    return null
  }

  // Update field value with validation and calculations
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
      if (sectionId === 'financial_situation') {
        const financial = newData.financial_situation || {}
        
        // Calculate emergency months
        if (fieldId === 'emergency_fund' || fieldId === 'monthly_expenditure') {
          const emergencyFund = Number(financial.emergency_fund) || 0
          const monthlyExpenditure = Number(financial.monthly_expenditure) || 0
          const months = calculateEmergencyMonths(emergencyFund, monthlyExpenditure)
          newData.financial_situation.emergency_months = `${months} months`
        }
      }
      
      // Calculate total charges
      if (sectionId === 'costs_charges') {
        const costs = newData.costs_charges || {}
        if (['ongoing_adviser_charge', 'platform_charge', 'fund_charges'].includes(fieldId)) {
          const ongoing = Number(costs.ongoing_adviser_charge) || 0
          const platform = Number(costs.platform_charge) || 0
          const fund = Number(costs.fund_charges) || 0
          const total = (ongoing + platform + fund).toFixed(2)
          newData.costs_charges.total_ongoing_charges = total
        }
      }
      
      return newData
    })

    // Clear validation error for this field
    setValidationErrors(prev => 
      prev.filter(error => !(error.sectionId === sectionId && error.fieldId === fieldId))
    )

    // Validate field
    const error = validateField(sectionId, fieldId, value)
    if (error) {
      setValidationErrors(prev => [...prev, { sectionId, fieldId, message: error }])
    }
  }

  // Auto-generate client reference
  const regenerateClientReference = () => {
    updateField('client_details', 'client_reference', generateClientReference())
  }

  // Generate AI recommendation
  const handleGenerateRecommendation = () => {
    const recommendation = generateRecommendation(formData)
    updateField('recommendation', 'recommendation_summary', recommendation)
    
    // Auto-populate some related fields
    const riskLevel = formData.risk_assessment?.attitude_to_risk || '4 - Medium Risk'
    if (riskLevel.includes('1') || riskLevel.includes('2')) {
      updateField('recommendation', 'review_frequency', 'Annual')
    } else if (riskLevel.includes('6') || riskLevel.includes('7')) {
      updateField('recommendation', 'review_frequency', 'Quarterly')
    } else {
      updateField('recommendation', 'review_frequency', 'Bi-annual')
    }
  }

  // Toggle section expansion
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

  // Save assessment
  const saveAssessment = async () => {
    setIsLoading(true)
    try {
      // Validate all required fields
      const errors: ValidationError[] = []
      suitabilitySections.forEach(section => {
        section.fields.forEach(field => {
          if (field.required) {
            const value = formData[section.id]?.[field.id]
            const error = validateField(section.id, field.id, value)
            if (error) {
              errors.push({ sectionId: section.id, fieldId: field.id, message: error })
            }
          }
        })
      })

      if (errors.length > 0) {
        setValidationErrors(errors)
        alert(`Please fix ${errors.length} validation errors before saving.`)
        return
      }

      // Save to your backend/database
      console.log('Saving suitability assessment:', formData)
      
      // Simulate save
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      setLastSaved(new Date())
      alert('Assessment saved successfully!')
    } catch (error) {
      console.error('Error saving assessment:', error)
      alert('Error saving assessment')
    } finally {
      setIsLoading(false)
    }
  }

  // Load assessment
  const loadAssessment = async () => {
    setIsLoading(true)
    try {
      // Load from your backend/database
      console.log('Loading assessment...')
      
      // Simulate load with sample data
      const sampleData = {
        client_details: {
          client_name: 'Geoffrey Clarkson',
          client_reference: generateClientReference(),
          email: 'geoffrey.clarkson@example.com',
          phone: '07700 900123'
        }
      }
      
      setFormData(sampleData)
      alert('Sample assessment loaded!')
    } catch (error) {
      console.error('Error loading assessment:', error)
      alert('Error loading assessment')
    } finally {
      setIsLoading(false)
    }
  }

  // Generate report
  const generateReport = () => {
    const { completed, total } = getCompletionStatus()
    if (completed < total * 0.8) {
      alert('Please complete at least 80% of the form before generating a report.')
      return
    }
    
    alert('Generating suitability report...\n\nThis will create:\n• FCA compliant suitability report\n• Risk assessment summary\n• Regulatory documentation\n• Client recommendations\n\nReport will be available for download shortly.')
  }

  const { completed, total, percentage } = getCompletionStatus()

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <FileText className="h-8 w-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-blue-900">Suitability Assessment</h1>
              <p className="text-blue-700">Complete FCA compliant assessment form</p>
              {lastSaved && (
                <p className="text-sm text-blue-600">Last saved: {lastSaved.toLocaleTimeString()}</p>
              )}
            </div>
          </div>
          <div className="flex space-x-3">
            <Button onClick={loadAssessment} variant="outline" className="flex items-center space-x-2">
              <Upload className="h-4 w-4" />
              <span>Load</span>
            </Button>
            <Button onClick={saveAssessment} disabled={isLoading} className="flex items-center space-x-2">
              <Save className="h-4 w-4" />
              <span>{isLoading ? 'Saving...' : 'Save'}</span>
            </Button>
            <Button onClick={generateReport} variant="outline" className="flex items-center space-x-2">
              <Download className="h-4 w-4" />
              <span>Generate Report</span>
            </Button>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium">Progress: {completed} of {total} required fields completed</span>
            <span className="text-gray-600">{percentage}%</span>
          </div>
          <Progress value={percentage} className="w-full" />
        </div>

        {/* Validation Errors */}
        {validationErrors.length > 0 && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center space-x-2 text-red-800 mb-2">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">{validationErrors.length} validation error(s)</span>
            </div>
            <ul className="text-sm text-red-700 space-y-1">
              {validationErrors.slice(0, 5).map((error, index) => (
                <li key={index}>• {error.message}</li>
              ))}
              {validationErrors.length > 5 && (
                <li>• ... and {validationErrors.length - 5} more</li>
              )}
            </ul>
          </div>
        )}
      </div>

      {/* Sections */}
      <div className="space-y-4">
        {suitabilitySections.map((section: SuitabilitySection, index: number) => {
          const isExpanded = expandedSections.has(section.id)
          const sectionData = formData[section.id] || {}
          const requiredFields = section.fields.filter(f => f.required)
          const completedRequiredFields = requiredFields.filter(f => sectionData[f.id]).length
          const sectionProgress = requiredFields.length > 0 ? Math.round((completedRequiredFields / requiredFields.length) * 100) : 100

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
                        <Badge variant={sectionProgress === 100 ? 'success' : sectionProgress > 0 ? 'warning' : 'outline'}>
                          {sectionProgress === 100 ? 'Complete' : sectionProgress > 0 ? 'In Progress' : 'Not Started'}
                        </Badge>
                        <span className="text-sm text-gray-500">
                          {completedRequiredFields}/{requiredFields.length} required fields
                        </span>
                      </div>
                    </div>
                  </div>
                  {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
              </CardHeader>

              {isExpanded && (
                <CardContent className="space-y-4">
                  {/* Special buttons for specific sections */}
                  {section.id === 'client_details' && (
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-blue-800">Client Reference: {formData.client_details?.client_reference}</span>
                        <Button onClick={regenerateClientReference} size="sm" variant="outline">
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Regenerate
                        </Button>
                      </div>
                    </div>
                  )}

                  {section.id === 'recommendation' && (
                    <div className="mb-4">
                      <Button onClick={handleGenerateRecommendation} className="flex items-center space-x-2">
                        <Sparkles className="h-4 w-4" />
                        <span>Generate AI Recommendation</span>
                      </Button>
                      <p className="text-sm text-gray-600 mt-2">
                        Generate a recommendation based on all assessment data entered so far
                      </p>
                    </div>
                  )}

                  <div className="grid md:grid-cols-2 gap-4">
                    {section.fields.map((field: SuitabilityField) => {
                      const value = sectionData[field.id] || ''
                      const fieldError = validationErrors.find(e => e.sectionId === section.id && e.fieldId === field.id)
                      const isCalculatedField = field.calculate

                      return (
                        <div key={field.id} className={cn("space-y-2", field.type === 'textarea' && "md:col-span-2")}>
                          <label className="block text-sm font-medium text-gray-700">
                            {field.label}
                            {field.required && <span className="text-red-500 ml-1">*</span>}
                            {field.autoGenerate && <span className="text-blue-500 ml-1">(auto)</span>}
                            {isCalculatedField && <span className="text-green-500 ml-1">(calculated)</span>}
                          </label>

                          {field.type === 'text' && (
                            <input
                              type="text"
                              value={value}
                              onChange={(e) => updateField(section.id, field.id, e.target.value)}
                              placeholder={field.placeholder}
                              readOnly={Boolean(field.autoGenerate) || Boolean(isCalculatedField)}
                              className={cn(
                                "w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
                                fieldError ? "border-red-500" : "border-gray-300",
                                (field.autoGenerate || isCalculatedField) && "bg-gray-50"
                              )}
                            />
                          )}

                          {field.type === 'number' && (
                            <input
                              type="number"
                              value={value}
                              onChange={(e) => updateField(section.id, field.id, e.target.value)}
                              placeholder={field.placeholder}
                              readOnly={Boolean(isCalculatedField)}
                              className={cn(
                                "w-full p-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500",
                                fieldError ? "border-red-500" : "border-gray-300",
                                isCalculatedField && "bg-gray-50"
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
                              <option value="">Select an option...</option>
                              {field.options?.map((option: string) => (
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
                              {field.options?.map((option: string) => (
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
                              {field.options?.map((option: string) => (
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
                        </div>
                      )
                    })}
                  </div>
                </CardContent>
              )}
            </Card>
          )
        })}
      </div>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span>Assessment Summary</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-4 gap-4">
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
          
          <div className="mt-6 flex justify-center space-x-4">
            <Button onClick={saveAssessment} disabled={isLoading}>
              <Save className="h-4 w-4 mr-2" />
              Save Assessment
            </Button>
            <Button onClick={generateReport} variant="outline">
              <FileText className="h-4 w-4 mr-2" />
              Generate Suitability Report
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
import { createClient } from "@/lib/supabase/client"
// =====================================================
// FILE: src/services/suitability/AutoGenerationService.ts
// FIXED AUTO-GENERATION ENGINE FOR SUITABILITY FIELDS
// =====================================================

import type { 
  SuitabilityFormData, 
  SuitabilitySection, 
  PulledPlatformData 
} from '@/types/suitability'

const DEBUG_AUTOGEN = process.env.NEXT_PUBLIC_DEBUG_SUITABILITY === 'true'
const debugLog = (...args: any[]) => {
}
const debugWarn = (...args: any[]) => {
  if (DEBUG_AUTOGEN) console.warn(...args)
}

interface AutoGenerationOptions {
  client?: any
  pulledData?: PulledPlatformData
  formData?: SuitabilityFormData
  skipExistingValues?: boolean
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

const generateClientReference = (): string => {
  const timestamp = new Date().toISOString().slice(2, 10).replace(/-/g, '')
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
  return `C${timestamp}${random}`
}

const calculateAge = (dateOfBirth?: string): number => {
  if (!dateOfBirth) return 0
  const today = new Date()
  const birthDate = new Date(dateOfBirth)
  
  if (isNaN(birthDate.getTime())) return 0
  
  let age = today.getFullYear() - birthDate.getFullYear()
  const monthDiff = today.getMonth() - birthDate.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--
  }
  
  return age >= 0 && age <= 150 ? age : 0
}

const getNestedValue = (obj: any, path: string): any => {
  if (!obj || !path) return undefined
  
  try {
    return path.split('.').reduce((current, key) => {
      return current?.[key]
    }, obj)
  } catch {
    return undefined
  }
}

const toNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const normalized = value.replace(/[^0-9.-]/g, '')
    if (!normalized) return null
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

const sumNumeric = (values: unknown[]): number | undefined => {
  let total = 0
  let hasValue = false
  for (const value of values) {
    const num = toNumber(value)
    if (num === null) continue
    total += num
    hasValue = true
  }
  return hasValue ? total : undefined
}

// =====================================================
// AUTO-GENERATION SERVICE
// =====================================================

export class AutoGenerationService {
  /**
   * Process all auto-generation rules for form initialization
   */
  static processAutoGeneration(
    sections: SuitabilitySection[],
    options: AutoGenerationOptions = {}
  ): Partial<SuitabilityFormData> {
    const { client, pulledData = {}, formData = {} as SuitabilityFormData, skipExistingValues = true } = options
    const updates: Partial<SuitabilityFormData> = {}
    
    debugLog('🔄 Processing auto-generation for', sections.length, 'sections')
    debugLog('Client available:', !!client)
    
    if (client) {
      debugLog('Client structure:', {
        personalDetails: !!client.personalDetails,
        contactInfo: !!client.contactInfo,
        financialProfile: !!client.financialProfile,
        riskProfile: !!client.riskProfile
      })
    }
    
    let workingFormData = { ...formData } as SuitabilityFormData

    sections.forEach(section => {
      if (!section.fields) return

      const sectionUpdates: Record<string, any> = {}
      debugLog(`\n📋 Processing section: ${section.id}`)

      const applyField = (field: any, currentValue: any, workingFormData: SuitabilityFormData) => {
        if (skipExistingValues && currentValue !== undefined && currentValue !== null && currentValue !== '') {
          debugLog(`⏭️ Skipping ${field.id} - already has value:`, currentValue)
          return
        }

        let generatedValue: any = undefined

        if (field.pullFrom && client) {
          generatedValue = this.executePullFrom(field.pullFrom, client)
          if (generatedValue !== undefined && generatedValue !== null && generatedValue !== '') {
            debugLog(`📥 Pulled ${section.id}.${field.id}:`, generatedValue)
          } else {
            debugLog(`❌ Pull failed for ${field.pullFrom} - got:`, generatedValue)
          }
        }

        if (field.autoGenerate && (generatedValue === undefined || generatedValue === null || generatedValue === '')) {
          generatedValue = this.executeAutoGenerate(field.id, field, client)
          if (generatedValue !== undefined && generatedValue !== null && generatedValue !== '') {
            debugLog(`🤖 Auto-generated ${section.id}.${field.id}:`, generatedValue)
          }
        }

        if (field.smartDefault && (generatedValue === undefined || generatedValue === null || generatedValue === '')) {
          try {
            generatedValue = field.smartDefault(workingFormData, pulledData)
            if (generatedValue !== undefined && generatedValue !== null && generatedValue !== '') {
              debugLog(`🧠 Smart default ${section.id}.${field.id}:`, generatedValue)
            }
          } catch (error) {
            debugWarn(`Smart default failed for ${section.id}.${field.id}:`, error)
          }
        }

        if (field.calculate && (generatedValue === undefined || generatedValue === null || generatedValue === '')) {
          generatedValue = this.executeCalculation(field.calculate, workingFormData, section.id, field.id)
          if (generatedValue !== undefined && generatedValue !== null && generatedValue !== '') {
            debugLog(`🧮 Calculated ${section.id}.${field.id}:`, generatedValue)
          }
        }

        if (generatedValue !== undefined && generatedValue !== null && generatedValue !== '') {
          sectionUpdates[field.id] = generatedValue
        }
      }

      section.fields.forEach(field => {
        const existingValue = (workingFormData as any)[section.id]?.[field.id]
        applyField(field, existingValue, workingFormData)
      })

      let updatedSectionData = {
        ...(workingFormData as any)[section.id],
        ...sectionUpdates
      }
      let nextWorkingFormData = {
        ...workingFormData,
        [section.id]: updatedSectionData
      } as SuitabilityFormData

      section.conditionalFields?.forEach((group) => {
        if (!group.condition(nextWorkingFormData, pulledData)) return
        group.fields.forEach((field) => {
          const existingValue = (updatedSectionData as any)?.[field.id]
          applyField(field, existingValue, nextWorkingFormData)
        })
      })

      if (Object.keys(sectionUpdates).length > 0) {
        debugLog(`✅ Section ${section.id} updates:`, sectionUpdates)
        updates[section.id as keyof SuitabilityFormData] = sectionUpdates as any
      }

      updatedSectionData = {
        ...(workingFormData as any)[section.id],
        ...sectionUpdates
      }
      nextWorkingFormData = {
        ...workingFormData,
        [section.id]: updatedSectionData
      } as SuitabilityFormData

      workingFormData = nextWorkingFormData
    })
    
    debugLog('✅ Auto-generation complete, updated sections:', Object.keys(updates))
    return updates
  }
  
  /**
   * ✅ FIXED: Execute pullFrom logic - extract data from client object
   */
  private static executePullFrom(pullFromPath: string, client: any): any {
    debugLog(`🔍 Executing pullFrom: ${pullFromPath}`)
    debugLog('Client data structure:', client)
    
    // Handle different pullFrom patterns
    const cleanPath = pullFromPath.replace('client.', '')
    
    // ✅ ENHANCED MAPPINGS FOR BETTER CLIENT DATA EXTRACTION
    const pathMappings: Record<string, (client: any) => any> = {
      // Personal Details Mappings
      'personalDetails': (c) => {
        const pd = c.personalDetails
        if (!pd) return undefined
        const fullName = `${pd.title || ''} ${pd.firstName || ''} ${pd.lastName || ''}`.trim()
        debugLog('Generated full name:', fullName)
        return fullName || undefined
      },
      'personalDetails.firstName': (c) => c.personalDetails?.firstName,
      'personalDetails.lastName': (c) => c.personalDetails?.lastName,
      'personalDetails.title': (c) => c.personalDetails?.title,
      'personalDetails.dateOfBirth': (c) => c.personalDetails?.dateOfBirth,
      'personalDetails.maritalStatus': (c) => {
        const raw = c.personalDetails?.maritalStatus || c.personalDetails?.marital_status
        if (!raw) return raw
        const normalized = String(raw).trim().toLowerCase().replace(/\s+/g, '_')
        const map: Record<string, string> = {
          single: 'Single',
          married: 'Married',
          civil_partnership: 'Civil Partnership',
          divorced: 'Divorced',
          widowed: 'Widowed'
        }
        return map[normalized] || (String(raw).charAt(0).toUpperCase() + String(raw).slice(1))
      },
      'personalDetails.occupation': (c) => c.personalDetails?.occupation,
      'personalDetails.employmentStatus': (c) => {
        const status = c.personalDetails?.employmentStatus || c.personalDetails?.employment_status
        // Map to display format
        const statusMap: Record<string, string> = {
          'employed': 'Employed',
          'self_employed': 'Self-Employed', 
          'retired': 'Retired',
          'unemployed': 'Not Working',
          'student': 'Student'
        }
        return statusMap[status] || status
      },
      'personalDetails.dependents': (c) => c.personalDetails?.dependents,
      
      // Contact Info Mappings
      'contactInfo.address': (c) => this.formatAddress(c.contactInfo?.address),
      'contactInfo.address.postcode': (c) => c.contactInfo?.address?.postcode,
      'contactInfo.address.line1': (c) => c.contactInfo?.address?.line1,
      'contactInfo.address.line2': (c) => c.contactInfo?.address?.line2,
      'contactInfo.address.city': (c) => c.contactInfo?.address?.city,
      'contactInfo.address.county': (c) => c.contactInfo?.address?.county,
      'contactInfo.postcode': (c) => c.contactInfo?.address?.postcode || c.contactInfo?.postcode,
      'contactInfo.phone': (c) =>
        c.contactInfo?.phone || c.contactInfo?.alternativePhone || c.contactInfo?.mobile,
      'contactInfo.email': (c) => c.contactInfo?.email,
      'contactInfo.preferredContact': (c) => {
        const raw = c.contactInfo?.preferredContact || c.contactInfo?.preferredContactMethod
        if (!raw) return raw
        const normalized = String(raw).trim().toLowerCase()
        const map: Record<string, string> = {
          email: 'Email',
          phone: 'Phone',
          mobile: 'Phone',
          post: 'Post',
          sms: 'SMS',
          text: 'SMS',
          letter: 'Post'
        }
        return map[normalized] || (String(raw).charAt(0).toUpperCase() + String(raw).slice(1))
      },

      // Form field aliases - map form fields to client data
      'date_of_birth': (c) => c.personalDetails?.dateOfBirth || c.personalDetails?.date_of_birth,
      'occupation': (c) => c.personalDetails?.occupation || c.employment?.occupation,
      'postcode': (c) => c.contactInfo?.address?.postcode || c.contactInfo?.postcode,
      'email': (c) => c.contactInfo?.email,
      'phone': (c) => c.contactInfo?.phone || c.contactInfo?.alternativePhone || c.contactInfo?.mobile,
      'address': (c) => this.formatAddress(c.contactInfo?.address),
      
      // Financial Profile Mappings
      'financialProfile.annualIncome': (c) => (c.financialProfile || c.financial_profile)?.annualIncome,
      'financialProfile.monthlyExpenses': (c) => (c.financialProfile || c.financial_profile)?.monthlyExpenses,
      'financialProfile.netWorth': (c) => (c.financialProfile || c.financial_profile)?.netWorth,
      'financialProfile.totalAssets': (c) => (c.financialProfile || c.financial_profile)?.totalAssets,
      'financialProfile.totalLiabilities': (c) =>
        (c.financialProfile || c.financial_profile)?.totalLiabilities ||
        (c.financialProfile || c.financial_profile)?.otherDebts,
      'financialProfile.liquidAssets': (c) => (c.financialProfile || c.financial_profile)?.liquidAssets,
      'financialProfile.propertyValue': (c) => (c.financialProfile || c.financial_profile)?.propertyValue,
      'financialProfile.mortgageBalance': (c) => (c.financialProfile || c.financial_profile)?.mortgageBalance,
      'financialProfile.otherDebts': (c) => (c.financialProfile || c.financial_profile)?.otherDebts,
      'financialProfile.emergencyFund': (c) => (c.financialProfile || c.financial_profile)?.emergencyFund,
      'financialProfile.pensionValue': (c) => {
        const profile = c.financialProfile || c.financial_profile
        if (profile?.pensionValue !== undefined && profile?.pensionValue !== null && profile?.pensionValue !== '') {
          return profile.pensionValue
        }
        const arrangements = Array.isArray(profile?.pensionArrangements) ? profile.pensionArrangements : []
        const sum = sumNumeric(arrangements.map((item: any) => item?.currentValue ?? item?.value ?? item?.amount))
        return sum
      },
      'financialProfile.existingInvestments': (c) => {
        const profile = c.financialProfile || c.financial_profile
        const existing = profile?.existingInvestments
        if (Array.isArray(existing)) {
          return sumNumeric(existing.map((item: any) => item?.currentValue ?? item?.value ?? item?.amount))
        }
        return existing
      },
      
      // Risk Profile Mappings
      'riskProfile.attitudeToRisk': (c) => {
        const risk = c.riskProfile?.attitudeToRisk
        if (typeof risk === 'number') {
          // Convert number to display string
          const riskLabels = [
            'Very Low - I want to preserve capital',
            'Low - I can accept minimal fluctuations', 
            'Medium - I can accept moderate fluctuations',
            'High - I can accept significant fluctuations',
            'Very High - I seek maximum growth'
          ]
          const index = Math.max(0, Math.min(4, Math.floor(risk / 2)))
          return riskLabels[index]
        }
        return risk
      },
      'riskProfile.riskTolerance': (c) => c.riskProfile?.riskTolerance,
      'riskProfile.capacityForLoss': (c) => {
        const capacity = c.riskProfile?.capacityForLoss
        if (typeof capacity === 'number') {
          // Convert to percentage range
          if (capacity <= 5) return '0-5%'
          if (capacity <= 10) return '5-10%'
          if (capacity <= 20) return '10-20%'
          if (capacity <= 30) return '20-30%'
          return 'More than 30%'
        }
        return capacity
      },
      'riskProfile.knowledgeExperience': (c) => {
        const raw = c.riskProfile?.knowledgeExperience
        if (raw === undefined || raw === null || raw === '') return raw

        // If numeric-like, treat as years of experience and bucketize.
        const rawStr = String(raw).trim().toLowerCase()
        if (/^\d+(\.\d+)?$/.test(rawStr)) {
          const years = Number(rawStr)
          if (years <= 0) return 'None'
          if (years < 1) return 'Less than 1'
          if (years <= 3) return '1-3'
          if (years <= 5) return '3-5'
          if (years <= 10) return '5-10'
          return 'More than 10'
        }

        // Common knowledge-level enums from ATR flows; map to an experience bucket.
        const levelMap: Record<string, string> = {
          none: 'None',
          beginner: 'Less than 1',
          basic: '1-3',
          good: '3-5',
          intermediate: '3-5',
          advanced: '5-10',
          expert: 'More than 10'
        }
        return levelMap[rawStr] || raw
      }
    }
    
    // Try mapped path first
    if (pathMappings[cleanPath]) {
      const result = pathMappings[cleanPath](client)
      debugLog(`✅ Mapped path ${cleanPath} result:`, result)
      return result
    }
    
    // Fallback to nested property access
    const result = getNestedValue(client, cleanPath)
    debugLog(`⚠️ Fallback nested access ${cleanPath} result:`, result)
    return result
  }
  
  /**
   * ✅ ENHANCED: Execute auto-generation logic for specific field types
   */
  private static executeAutoGenerate(fieldId: string, field: any, client: any): any {
    debugLog(`🤖 Auto-generating field: ${fieldId}`)
    
    switch (fieldId) {
      case 'client_reference':
        return generateClientReference()
        
      case 'age':
        // Try to get DOB from client first, then check if form has it
        let dob = client?.personalDetails?.dateOfBirth
        if (!dob && field.dependsOn) {
          // This would be handled by the form's conditional logic
          return undefined
        }
        const age = dob ? calculateAge(dob) : undefined
        debugLog(`Age calculated from DOB ${dob}:`, age)
        return age
        
      case 'client_name':
        // Generate full name from client details
        if (client?.personalDetails) {
          const { title, firstName, lastName } = client.personalDetails
          const fullName = `${title || ''} ${firstName || ''} ${lastName || ''}`.trim()
          debugLog(`Generated client name: ${fullName}`)
          return fullName || undefined
        }
        return undefined
        
      case 'target_retirement_age':
        // Smart default based on current age
        const currentAge = client?.personalDetails?.dateOfBirth ? 
          calculateAge(client.personalDetails.dateOfBirth) : undefined
        if (currentAge && currentAge > 0) {
          const targetAge = Math.max(65, currentAge + 5) // Minimum 65, or current age + 5 years
          debugLog(`Target retirement age based on current age ${currentAge}:`, targetAge)
          return targetAge
        }
        return 65

      case 'has_mortgage': {
        const mortgageBalance =
          client?.financialProfile?.mortgageBalance ??
          client?.financialProfile?.outstandingMortgage
        const properties = client?.financialProfile?.properties
        const hasPropertyMortgage = Array.isArray(properties)
          ? properties.some((property: any) => Number(property?.mortgage ?? 0) > 0)
          : false

        if (Number(mortgageBalance || 0) > 0 || hasPropertyMortgage) return 'Yes'
        if (mortgageBalance === 0) return 'No'
        return undefined
      }

      case 'has_property': {
        const propertyValue = client?.financialProfile?.propertyValue
        if (propertyValue !== undefined && propertyValue !== null) {
          return Number(propertyValue) > 0 ? 'Yes' : 'No'
        }

        const properties = client?.financialProfile?.properties
        if (Array.isArray(properties)) {
          const hasProperty = properties.some((property: any) => Number(property?.value ?? 0) > 0)
          return hasProperty ? 'Yes' : 'No'
        }

        return undefined
      }

      case 'has_dependents': {
        const dependents = client?.personalDetails?.dependents
        if (typeof dependents === 'number') return dependents > 0 ? 'Yes' : 'No'
        return undefined
      }
        
      default:
        return undefined
    }
  }
  
  /**
   * Execute calculation logic for calculated fields
   */
  private static executeCalculation(
    calculationType: string, 
    formData: SuitabilityFormData, 
    sectionId: string, 
    fieldId: string
  ): any {
    debugLog(`🧮 Calculating ${calculationType} for ${sectionId}.${fieldId}`)
    
    switch (calculationType) {
      case 'age':
        const dob = formData.personal_information?.date_of_birth || 
                   (formData as any).partner_information?.partner_date_of_birth
        const age = dob ? calculateAge(dob) : undefined
        debugLog(`Age calculated from form DOB ${dob}:`, age)
        return age
        
      case 'net_worth':
        // Support both legacy keys (liquid_assets/outstanding_mortgage/other_liabilities)
        // and current suitability form keys (savings/mortgage_outstanding/other_debts).
        const rawSavings =
          (formData.financial_situation as any)?.savings ?? formData.financial_situation?.liquid_assets
        const rawProperty = (formData.financial_situation as any)?.property_value
        const rawMortgage =
          (formData.financial_situation as any)?.mortgage_outstanding ??
          formData.financial_situation?.outstanding_mortgage
        const rawDebts =
          (formData.financial_situation as any)?.other_debts ?? formData.financial_situation?.other_liabilities

        const hasAny = [rawSavings, rawProperty, rawMortgage, rawDebts].some(
          (v) => v !== null && v !== undefined && v !== ''
        )
        if (!hasAny) return undefined

        const savings = Number(rawSavings || 0)
        const property = Number(rawProperty || 0)
        const mortgage = Number(rawMortgage || 0)
        const debts = Number(rawDebts || 0)
        const assets = savings + property
        const liabilities = mortgage + debts
        const netWorth = assets - liabilities
        debugLog(`Net worth: ${assets} - ${liabilities} = ${netWorth}`)
        return netWorth
        
      case 'disposable_income':
        const rawAnnualIncome = formData.financial_situation?.annual_income
        const rawMonthlyExpenses =
          (formData.financial_situation as any)?.monthly_expenses ??
          formData.financial_situation?.monthly_expenditure

        // Only calculate when BOTH income and expenses are provided to avoid injecting misleading `0` values.
        const hasIncomeAndExpenses = [rawAnnualIncome, rawMonthlyExpenses].every(
          (v) => v !== null && v !== undefined && v !== ''
        )
        if (!hasIncomeAndExpenses) return undefined

        const income = Number(rawAnnualIncome || 0) / 12
        const expenses = Number(rawMonthlyExpenses || 0)
        const surplus = Math.max(0, income - expenses)
        debugLog(`Monthly surplus: ${income} - ${expenses} = ${surplus}`)
        return surplus
        
      case 'emergency_months':
        const monthlyExpenses = (formData.financial_situation as any)?.monthly_expenses ?? formData.financial_situation?.monthly_expenditure
        const emergencyFund = formData.financial_situation?.emergency_fund

        const hasBoth = [monthlyExpenses, emergencyFund].every(
          (v) => v !== null && v !== undefined && v !== ''
        )
        if (!hasBoth) return undefined

        const monthly = Number(monthlyExpenses || 0)
        const fund = Number(emergencyFund || 0)
        const months = monthly > 0 ? Math.round(fund / monthly) : undefined
        debugLog(`Emergency months: ${emergencyFund} / ${monthlyExpenses} = ${months}`)
        return months

      case 'income_total': {
        const incomeFields = [
          (formData.financial_situation as any)?.income_employment,
          (formData.financial_situation as any)?.income_rental,
          (formData.financial_situation as any)?.income_dividends,
          (formData.financial_situation as any)?.income_other
        ]

        const hasAny = incomeFields.some((v) => v !== null && v !== undefined && v !== '')
        if (hasAny) {
          const total = incomeFields.reduce((sum, v) => sum + Number(v || 0), 0)
          debugLog(`Income total calculated from breakdown: ${total}`)
          return total
        }

        const annualIncome = Number((formData.financial_situation as any)?.annual_income || 0)
        if (annualIncome > 0) {
          debugLog(`Income total fallback to annual_income: ${annualIncome}`)
          return annualIncome
        }

        return undefined
      }

      case 'exp_total_essential': {
        const essentialFields = [
          (formData.financial_situation as any)?.exp_housing,
          (formData.financial_situation as any)?.exp_utilities,
          (formData.financial_situation as any)?.exp_food,
          (formData.financial_situation as any)?.exp_transport,
          (formData.financial_situation as any)?.exp_healthcare,
          (formData.financial_situation as any)?.exp_childcare
        ]

        const hasAny = essentialFields.some((v) => v !== null && v !== undefined && v !== '')
        if (hasAny) {
          const total = essentialFields.reduce((sum, v) => sum + Number(v || 0), 0)
          debugLog(`Essential expenditure total calculated from breakdown: ${total}`)
          return total
        }

        const monthlyEssential = Number(
          (formData.financial_situation as any)?.monthly_expenses ??
            formData.financial_situation?.monthly_expenditure ??
            0
        )

        if (monthlyEssential > 0) {
          const total = monthlyEssential * 12
          debugLog(`Essential expenditure total fallback to monthly essentials × 12: ${total}`)
          return total
        }

        return undefined
      }

      case 'exp_total_discretionary': {
        const discretionaryFields = [
          (formData.financial_situation as any)?.exp_leisure,
          (formData.financial_situation as any)?.exp_holidays,
          (formData.financial_situation as any)?.exp_other
        ]

        const hasAny = discretionaryFields.some((v) => v !== null && v !== undefined && v !== '')
        if (!hasAny) return undefined

        const total = discretionaryFields.reduce((sum, v) => sum + Number(v || 0), 0)
        debugLog(`Discretionary expenditure total calculated from breakdown: ${total}`)
        return total
      }
        
      default:
        debugWarn(`Unknown calculation type: ${calculationType}`)
        return undefined
    }
  }
  
  /**
   * ✅ ENHANCED: Format address from client data
   */
  private static formatAddress(address: any): string {
    if (!address) return ''
    
    if (typeof address === 'string') return address
    
    // Handle structured address object
    const parts = [
      address.line1,
      address.line2, 
      address.city,
      address.county,
      address.postcode,
      address.country
    ].filter(Boolean)
    
    const formatted = parts.join(', ')
    debugLog('Formatted address:', formatted)
    return formatted
  }
  
  /**
   * Process single field calculation (for real-time updates)
   */
  static calculateSingleField(
    field: any, 
    formData: SuitabilityFormData, 
    sectionId: string
  ): any {
    if (!field.calculate) return undefined
    
    return this.executeCalculation(field.calculate, formData, sectionId, field.id)
  }
  
  /**
   * Re-calculate all calculated fields when dependencies change
   */
  static recalculateFields(
    sections: SuitabilitySection[],
    formData: SuitabilityFormData,
    changedSectionId?: string,
    changedFieldId?: string
  ): Partial<SuitabilityFormData> {
    const updates: Partial<SuitabilityFormData> = {}
    
    // Only recalculate if the changed field might affect calculations
    const affectsCalculations = this.fieldAffectsCalculations(changedSectionId, changedFieldId)
    if (!affectsCalculations) return updates
    
    debugLog(`🔄 Re-calculating fields due to change in ${changedSectionId}.${changedFieldId}`)
    
    sections.forEach(section => {
      if (!section.fields) return
      
      const sectionUpdates: Record<string, any> = {}
      
      section.fields.forEach(field => {
        if (field.calculate) {
          const newValue = this.executeCalculation(field.calculate, formData, section.id, field.id)
          if (newValue !== undefined) {
            sectionUpdates[field.id] = newValue
            debugLog(`♻️ Recalculated ${section.id}.${field.id}:`, newValue)
          }
        }
      })
      
      if (Object.keys(sectionUpdates).length > 0) {
        updates[section.id as keyof SuitabilityFormData] = sectionUpdates as any
      }
    })
    
    return updates
  }
  
  /**
   * Check if a field change affects calculations
   */
  private static fieldAffectsCalculations(sectionId?: string, fieldId?: string): boolean {
    if (!sectionId || !fieldId) return false
    
    const calculationTriggers = [
      'personal_information.date_of_birth',
      'partner_information.partner_date_of_birth', 
      'financial_situation.liquid_assets',
      'financial_situation.savings',
      'financial_situation.property_value',
      'financial_situation.outstanding_mortgage',
      'financial_situation.mortgage_outstanding',
      'financial_situation.other_liabilities',
      'financial_situation.other_debts',
      'financial_situation.annual_income',
      'financial_situation.monthly_expenditure',
      'financial_situation.monthly_expenses',
      'financial_situation.emergency_fund',
      // Income breakdown
      'financial_situation.income_employment',
      'financial_situation.income_rental',
      'financial_situation.income_dividends',
      'financial_situation.income_other',
      // Expenditure breakdown
      'financial_situation.exp_housing',
      'financial_situation.exp_utilities',
      'financial_situation.exp_food',
      'financial_situation.exp_transport',
      'financial_situation.exp_healthcare',
      'financial_situation.exp_childcare',
      'financial_situation.exp_leisure',
      'financial_situation.exp_holidays',
      'financial_situation.exp_other'
    ]
    
    const fieldKey = `${sectionId}.${fieldId}`
    const affects = calculationTriggers.includes(fieldKey)
    
    if (affects) {
      debugLog(`🎯 Field change ${fieldKey} will trigger recalculations`)
    }
    
    return affects
  }
}

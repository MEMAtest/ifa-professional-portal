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
    
    console.log('🔄 Processing auto-generation for', sections.length, 'sections')
    console.log('Client available:', !!client)
    
    if (client) {
      console.log('Client structure:', {
        personalDetails: !!client.personalDetails,
        contactInfo: !!client.contactInfo,
        financialProfile: !!client.financialProfile,
        riskProfile: !!client.riskProfile
      })
    }
    
    sections.forEach(section => {
      if (!section.fields) return
      
      const sectionUpdates: Record<string, any> = {}
      console.log(`\n📋 Processing section: ${section.id}`)
      
      section.fields.forEach(field => {
        const existingValue = (formData as any)[section.id]?.[field.id]
        
        // Skip if value exists and we're not overriding
        if (skipExistingValues && existingValue !== undefined && existingValue !== null && existingValue !== '') {
          console.log(`⏭️ Skipping ${field.id} - already has value:`, existingValue)
          return
        }
        
        let generatedValue: any = undefined
        
        // 1. PULL FROM CLIENT DATA
        if (field.pullFrom && client) {
          generatedValue = this.executePullFrom(field.pullFrom, client)
          if (generatedValue !== undefined && generatedValue !== null && generatedValue !== '') {
            console.log(`📥 Pulled ${section.id}.${field.id}:`, generatedValue)
          } else {
            console.log(`❌ Pull failed for ${field.pullFrom} - got:`, generatedValue)
          }
        }
        
        // 2. AUTO-GENERATE
        if (field.autoGenerate && (generatedValue === undefined || generatedValue === null || generatedValue === '')) {
          generatedValue = this.executeAutoGenerate(field.id, field, client)
          if (generatedValue !== undefined && generatedValue !== null && generatedValue !== '') {
            console.log(`🤖 Auto-generated ${section.id}.${field.id}:`, generatedValue)
          }
        }
        
        // 3. SMART DEFAULT
        if (field.smartDefault && (generatedValue === undefined || generatedValue === null || generatedValue === '')) {
          try {
            generatedValue = field.smartDefault(formData, pulledData)
            if (generatedValue !== undefined && generatedValue !== null && generatedValue !== '') {
              console.log(`🧠 Smart default ${section.id}.${field.id}:`, generatedValue)
            }
          } catch (error) {
            console.warn(`Smart default failed for ${section.id}.${field.id}:`, error)
          }
        }
        
        // 4. CALCULATE (depends on other fields)
        if (field.calculate && (generatedValue === undefined || generatedValue === null || generatedValue === '')) {
          generatedValue = this.executeCalculation(field.calculate, formData, section.id, field.id)
          if (generatedValue !== undefined && generatedValue !== null && generatedValue !== '') {
            console.log(`🧮 Calculated ${section.id}.${field.id}:`, generatedValue)
          }
        }
        
        // Apply the generated value
        if (generatedValue !== undefined && generatedValue !== null && generatedValue !== '') {
          sectionUpdates[field.id] = generatedValue
        }
      })
      
      // Add section updates if any
      if (Object.keys(sectionUpdates).length > 0) {
        console.log(`✅ Section ${section.id} updates:`, sectionUpdates)
        updates[section.id as keyof SuitabilityFormData] = sectionUpdates as any
      }
    })
    
    console.log('✅ Auto-generation complete, updated sections:', Object.keys(updates))
    return updates
  }
  
  /**
   * ✅ FIXED: Execute pullFrom logic - extract data from client object
   */
  private static executePullFrom(pullFromPath: string, client: any): any {
    console.log(`🔍 Executing pullFrom: ${pullFromPath}`)
    console.log('Client data structure:', client)
    
    // Handle different pullFrom patterns
    const cleanPath = pullFromPath.replace('client.', '')
    
    // ✅ ENHANCED MAPPINGS FOR BETTER CLIENT DATA EXTRACTION
    const pathMappings: Record<string, (client: any) => any> = {
      // Personal Details Mappings
      'personalDetails': (c) => {
        const pd = c.personalDetails
        if (!pd) return undefined
        const fullName = `${pd.title || ''} ${pd.firstName || ''} ${pd.lastName || ''}`.trim()
        console.log('Generated full name:', fullName)
        return fullName || undefined
      },
      'personalDetails.firstName': (c) => c.personalDetails?.firstName,
      'personalDetails.lastName': (c) => c.personalDetails?.lastName,
      'personalDetails.title': (c) => c.personalDetails?.title,
      'personalDetails.dateOfBirth': (c) => c.personalDetails?.dateOfBirth,
      'personalDetails.maritalStatus': (c) => c.personalDetails?.maritalStatus,
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
      'contactInfo.phone': (c) => c.contactInfo?.phone,
      'contactInfo.email': (c) => c.contactInfo?.email,
      'contactInfo.preferredContact': (c) => c.contactInfo?.preferredContact || c.contactInfo?.preferredContactMethod,
      
      // Financial Profile Mappings
      'financialProfile.annualIncome': (c) => c.financialProfile?.annualIncome,
      'financialProfile.monthlyExpenses': (c) => c.financialProfile?.monthlyExpenses,
      'financialProfile.netWorth': (c) => c.financialProfile?.netWorth,
      'financialProfile.totalAssets': (c) => c.financialProfile?.totalAssets,
      'financialProfile.totalLiabilities': (c) => c.financialProfile?.totalLiabilities || c.financialProfile?.otherDebts,
      'financialProfile.liquidAssets': (c) => c.financialProfile?.liquidAssets,
      'financialProfile.propertyValue': (c) => c.financialProfile?.propertyValue,
      'financialProfile.mortgageBalance': (c) => c.financialProfile?.mortgageBalance,
      'financialProfile.otherDebts': (c) => c.financialProfile?.otherDebts,
      'financialProfile.emergencyFund': (c) => c.financialProfile?.emergencyFund,
      'financialProfile.pensionValue': (c) => c.financialProfile?.pensionValue,
      'financialProfile.existingInvestments': (c) => c.financialProfile?.existingInvestments,
      
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
      'riskProfile.knowledgeExperience': (c) => c.riskProfile?.knowledgeExperience
    }
    
    // Try mapped path first
    if (pathMappings[cleanPath]) {
      const result = pathMappings[cleanPath](client)
      console.log(`✅ Mapped path ${cleanPath} result:`, result)
      return result
    }
    
    // Fallback to nested property access
    const result = getNestedValue(client, cleanPath)
    console.log(`⚠️ Fallback nested access ${cleanPath} result:`, result)
    return result
  }
  
  /**
   * ✅ ENHANCED: Execute auto-generation logic for specific field types
   */
  private static executeAutoGenerate(fieldId: string, field: any, client: any): any {
    console.log(`🤖 Auto-generating field: ${fieldId}`)
    
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
        console.log(`Age calculated from DOB ${dob}:`, age)
        return age
        
      case 'client_name':
        // Generate full name from client details
        if (client?.personalDetails) {
          const { title, firstName, lastName } = client.personalDetails
          const fullName = `${title || ''} ${firstName || ''} ${lastName || ''}`.trim()
          console.log(`Generated client name: ${fullName}`)
          return fullName || undefined
        }
        return undefined
        
      case 'target_retirement_age':
        // Smart default based on current age
        const currentAge = client?.personalDetails?.dateOfBirth ? 
          calculateAge(client.personalDetails.dateOfBirth) : undefined
        if (currentAge && currentAge > 0) {
          const targetAge = Math.max(65, currentAge + 5) // Minimum 65, or current age + 5 years
          console.log(`Target retirement age based on current age ${currentAge}:`, targetAge)
          return targetAge
        }
        return 65
        
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
    console.log(`🧮 Calculating ${calculationType} for ${sectionId}.${fieldId}`)
    
    switch (calculationType) {
      case 'age':
        const dob = formData.personal_information?.date_of_birth || 
                   (formData as any).partner_information?.partner_date_of_birth
        const age = dob ? calculateAge(dob) : undefined
        console.log(`Age calculated from form DOB ${dob}:`, age)
        return age
        
      case 'net_worth':
        const assets = Number(formData.financial_situation?.liquid_assets || 0) +
                      Number(formData.financial_situation?.property_value || 0)
        const liabilities = Number(formData.financial_situation?.outstanding_mortgage || 0) +
                           Number(formData.financial_situation?.other_liabilities || 0)
        const netWorth = assets - liabilities
        console.log(`Net worth: ${assets} - ${liabilities} = ${netWorth}`)
        return netWorth
        
      case 'disposable_income':
        const income = Number(formData.financial_situation?.annual_income || 0) / 12
        const expenses = Number(formData.financial_situation?.monthly_expenditure || 0)
        const surplus = Math.max(0, income - expenses)
        console.log(`Monthly surplus: ${income} - ${expenses} = ${surplus}`)
        return surplus
        
      case 'emergency_months':
        const monthlyExpenses = Number(formData.financial_situation?.monthly_expenditure || 0)
        const emergencyFund = Number(formData.financial_situation?.emergency_fund || 0)
        const months = monthlyExpenses > 0 ? Math.round(emergencyFund / monthlyExpenses) : 0
        console.log(`Emergency months: ${emergencyFund} / ${monthlyExpenses} = ${months}`)
        return months
        
      default:
        console.warn(`Unknown calculation type: ${calculationType}`)
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
    console.log('Formatted address:', formatted)
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
    
    console.log(`🔄 Re-calculating fields due to change in ${changedSectionId}.${changedFieldId}`)
    
    sections.forEach(section => {
      if (!section.fields) return
      
      const sectionUpdates: Record<string, any> = {}
      
      section.fields.forEach(field => {
        if (field.calculate) {
          const newValue = this.executeCalculation(field.calculate, formData, section.id, field.id)
          if (newValue !== undefined) {
            sectionUpdates[field.id] = newValue
            console.log(`♻️ Recalculated ${section.id}.${field.id}:`, newValue)
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
      'financial_situation.property_value',
      'financial_situation.outstanding_mortgage',
      'financial_situation.other_liabilities',
      'financial_situation.annual_income',
      'financial_situation.monthly_expenditure',
      'financial_situation.emergency_fund'
    ]
    
    const fieldKey = `${sectionId}.${fieldId}`
    const affects = calculationTriggers.includes(fieldKey)
    
    if (affects) {
      console.log(`🎯 Field change ${fieldKey} will trigger recalculations`)
    }
    
    return affects
  }
}
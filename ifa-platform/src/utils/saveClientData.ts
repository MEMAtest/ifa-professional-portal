// utils/saveClientData.ts
// Utility to save client data to your Supabase database with JSONB structure

import { supabase } from '@/lib/supabase'

interface SaveClientDataParams {
  clientId?: string  // If provided, update existing client
  formData: any      // Your form data from suitability assessment
  advisorId: string  // Current advisor ID
  firmId: string     // Current firm ID
}

export async function saveClientData({ clientId, formData, advisorId, firmId }: SaveClientDataParams) {
  try {
    // Structure the data according to your JSONB columns
    const clientData = {
      advisor_id: advisorId,
      firm_id: firmId,
      client_ref: formData.client_details?.client_reference,
      status: formData.assessmentStatus || 'draft',
      
      // Personal Details JSONB
      personal_details: {
        full_name: formData.client_details?.client_name,
        first_name: formData.client_details?.client_name?.split(' ')[0],
        last_name: formData.client_details?.client_name?.split(' ').slice(1).join(' '),
        date_of_birth: formData.client_details?.date_of_birth,
        age: formData.client_details?.age,
        national_insurance: formData.client_details?.national_insurance,
        occupation: formData.client_details?.occupation,
        employer: formData.client_details?.employer,
        marital_status: formData.client_details?.marital_status,
        dependents: formData.client_details?.dependents,
        target_retirement_age: formData.objectives?.target_retirement_age,
      },
      
      // Contact Info JSONB
      contact_info: {
        address: formData.client_details?.address,
        phone: formData.client_details?.phone,
        email: formData.client_details?.email,
        postcode: formData.client_details?.postcode,
      },
      
      // Financial Profile JSONB
      financial_profile: {
        investment_amount: formData.objectives?.investment_amount,
        fees: formData.costs_charges?.total_fees,
        monthly_savings: formData.objectives?.additional_contributions,
        annual_income: formData.financial_situation?.annual_income,
        monthly_expenditure: formData.financial_situation?.monthly_expenditure,
        liquid_assets: formData.financial_situation?.liquid_assets,
        property_value: formData.financial_situation?.property_value,
        outstanding_mortgage: formData.financial_situation?.outstanding_mortgage,
        other_liabilities: formData.financial_situation?.other_liabilities,
        emergency_fund: formData.financial_situation?.emergency_fund,
        pension_value: formData.financial_situation?.pension_value,
      },
      
      // Vulnerability Assessment JSONB
      vulnerability_assessment: {
        is_vulnerable: formData.regulation_compliance?.vulnerable_client !== 'None Identified',
        vulnerability_type: formData.regulation_compliance?.vulnerable_client,
        assessment_date: new Date().toISOString(),
      },
      
      // Risk Profile JSONB
      risk_profile: {
        atr_score: formData.riskMetrics?.atrScore,
        cfl_score: formData.riskMetrics?.cflScore,
        final_risk_profile: formData.riskMetrics?.finalRiskProfile,
        risk_level: formData.risk_assessment?.attitude_to_risk,
        suitability_score: formData.suitabilityScore || 0,
        atr_complete: formData.integrationStatus?.dataLinked || false,
        cfl_complete: formData.integrationStatus?.profileCalculated || false,
        persona_complete: formData.integrationStatus?.personaMatched || false,
        last_assessment_date: new Date().toISOString(),
        next_review_date: formData.documentation_compliance?.next_review_date,
      },
    }
    
    if (clientId) {
      // Update existing client
      const { data, error } = await supabase
        .from('clients')
        .update(clientData)
        .eq('id', clientId)
        .select()
        .single()
        
      if (error) throw error
      return { data, error: null }
    } else {
      // Insert new client
      const { data, error } = await supabase
        .from('clients')
        .insert(clientData)
        .select()
        .single()
        
      if (error) throw error
      return { data, error: null }
    }
  } catch (error) {
    console.error('Error saving client data:', error)
    return { data: null, error }
  }
}

// Example usage in your suitability assessment page:
/*
const saveAssessment = async () => {
  const storedClientId = sessionStorage.getItem('selectedClientId')
  
  const { data, error } = await saveClientData({
    clientId: storedClientId || undefined,
    formData: formData,
    advisorId: currentUser.id,  // Get from your auth context
    firmId: currentUser.firmId   // Get from your auth context
  })
  
  if (error) {
    alert('Error saving assessment')
  } else {
    alert('Assessment saved successfully!')
  }
}
*/
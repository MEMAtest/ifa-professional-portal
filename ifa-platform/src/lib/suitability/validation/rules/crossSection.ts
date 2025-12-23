import type { CrossSectionValidation, ValidationError, ValidationWarning } from '@/types/suitability'

import { ensureArray, ensureNumber, ensureString } from '../helpers'

export const crossSectionValidations: CrossSectionValidation[] = [
  {
    rule: 'income_expense_balance',
    sections: ['financial_situation'],
    validate: (formData) => {
      const income = ensureNumber(formData.financial_situation?.annual_income)
      const monthlyExpenditure = ensureNumber(formData.financial_situation?.monthly_expenditure)
      const expenses = monthlyExpenditure * 12

      const errors: ValidationError[] = []
      const warnings: ValidationWarning[] = []

      if (expenses > income) {
        errors.push({
          sectionId: 'financial_situation',
          fieldId: 'monthly_expenditure',
          message: 'Annual expenses exceed income - review before investing',
          severity: 'critical',
          code: 'NEGATIVE_CASHFLOW'
        })
      } else if (expenses > income * 0.9) {
        warnings.push({
          sectionId: 'financial_situation',
          fieldId: 'monthly_expenditure',
          message: 'Limited surplus for investment',
          type: 'bestPractice'
        })
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      }
    }
  },
  {
    rule: 'emergency_fund_adequacy',
    sections: ['financial_situation', 'objectives'],
    validate: (formData) => {
      const liquidAssets = ensureNumber(formData.financial_situation?.liquid_assets)
      const monthlyExpenses = ensureNumber(formData.financial_situation?.monthly_expenditure)
      const investmentAmount = ensureNumber(formData.objectives?.investment_amount)

      const emergencyFundNeeded = monthlyExpenses * 6
      const remainingAfterInvestment = liquidAssets - investmentAmount

      const warnings: ValidationWarning[] = []

      if (remainingAfterInvestment < emergencyFundNeeded) {
        warnings.push({
          sectionId: 'objectives',
          fieldId: 'investment_amount',
          message: `Investment would leave emergency fund below recommended 6 months (£${emergencyFundNeeded.toLocaleString()})`,
          type: 'bestPractice'
        })
      }

      return {
        isValid: true,
        errors: [],
        warnings,
        suggestions:
          remainingAfterInvestment < emergencyFundNeeded
            ? ['Consider retaining sufficient emergency reserves before investing']
            : []
      }
    }
  },
  {
    rule: 'atr_cfl_reconciliation',
    sections: ['risk_assessment'],
    validate: (formData, pulledData) => {
      const atr = ensureNumber(pulledData.atrScore)
      const cfl = ensureNumber(pulledData.cflScore)

      if (atr === 0 || cfl === 0 || atr === null || cfl === null) {
        return { isValid: true, errors: [], warnings: [], suggestions: [] }
      }

      const difference = Math.abs(atr - cfl)

      const errors: ValidationError[] = []
      const warnings: ValidationWarning[] = []

      if (difference >= 5) {
        errors.push({
          sectionId: 'risk_assessment',
          fieldId: 'attitude_to_risk',
          message: 'Significant discrepancy between risk tolerance and capacity (ATR vs CFL) - reconciliation required',
          severity: 'critical',
          code: 'RISK_MISMATCH'
        })
      } else if (difference >= 3) {
        warnings.push({
          sectionId: 'risk_assessment',
          fieldId: 'attitude_to_risk',
          message: 'Notable difference between ATR and CFL scores',
          type: 'compliance'
        })
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        suggestions: difference >= 3 ? ['Document rationale for any risk level adjustments'] : []
      }
    }
  },
  {
    rule: 'age_risk_appropriateness',
    sections: ['personal_information', 'risk_assessment'],
    validate: (formData) => {
      const age = ensureNumber(formData.personal_information?.age)
      const riskString = ensureString(formData.risk_assessment?.attitude_to_risk)
      const riskLevel = parseInt(riskString.match(/\\d/)?.[0] || '0')
      const timeHorizon = ensureNumber(formData.objectives?.time_horizon)

      const warnings: ValidationWarning[] = []

      if (age > 65 && riskLevel > 5) {
        warnings.push({
          sectionId: 'risk_assessment',
          fieldId: 'attitude_to_risk',
          message: 'High risk level may not be suitable given age',
          type: 'compliance'
        })
      }

      if (age > 70 && timeHorizon > 20) {
        warnings.push({
          sectionId: 'objectives',
          fieldId: 'time_horizon',
          message: 'Long investment horizon unusual for age',
          type: 'dataQuality'
        })
      }

      return {
        isValid: true,
        errors: [],
        warnings
      }
    }
  },
  {
    rule: 'knowledge_product_alignment',
    sections: ['knowledge_experience', 'recommendation'],
    validate: (formData) => {
      const knowledge = ensureString(formData.knowledge_experience?.investment_knowledge)
      const productSelection = ensureString(formData.recommendation?.product_selection)
      const complexProducts = productSelection.includes('Complex')

      const errors: ValidationError[] = []

      if (knowledge === 'Basic' && complexProducts) {
        errors.push({
          sectionId: 'recommendation',
          fieldId: 'product_selection',
          message: 'Complex products not suitable for basic knowledge level',
          severity: 'error',
          code: 'KNOWLEDGE_MISMATCH'
        })
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings: [],
        suggestions: knowledge === 'Basic' ? ['Consider simpler, managed investment solutions'] : []
      }
    }
  },
  {
    rule: 'pension_transfer_specialist',
    sections: ['existing_arrangements', 'regulatory_compliance'],
    validate: (formData) => {
      const dbTransfer = ensureString((formData.existing_arrangements as any)?.db_transfer_considered) === 'Yes'
      const ptsConfirmed = Boolean((formData.regulatory_compliance as any)?.pts_confirmation)

      const errors: ValidationError[] = []

      if (dbTransfer && !ptsConfirmed) {
        errors.push({
          sectionId: 'regulatory_compliance',
          fieldId: 'pts_confirmation',
          message: 'Pension Transfer Specialist (PTS) confirmation is required for DB transfer advice',
          severity: 'critical',
          code: 'PTS_CONFIRMATION_REQUIRED'
        })
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings: []
      }
    }
  },
  {
    rule: 'consumer_duty_value',
    sections: ['costs_charges', 'objectives'],
    validate: (formData) => {
      const totalCharges =
        ensureNumber(formData.costs_charges?.initial_adviser_charge) +
        ensureNumber(formData.costs_charges?.ongoing_adviser_charge) +
        ensureNumber(formData.costs_charges?.platform_charge) +
        ensureNumber(formData.costs_charges?.fund_charges)

      const investmentAmount = ensureNumber(formData.objectives?.investment_amount)
      const chargePercentage = investmentAmount > 0 ? (totalCharges / investmentAmount) * 100 : 0

      const warnings: ValidationWarning[] = []

      if (totalCharges > 3) {
        warnings.push({
          sectionId: 'costs_charges',
          fieldId: 'total_ongoing_charges',
          message: 'Total charges exceed 3% - ensure value for money',
          type: 'compliance'
        })
      }

      if (chargePercentage > 5 && investmentAmount < 50000) {
        warnings.push({
          sectionId: 'costs_charges',
          fieldId: 'initial_adviser_charge',
          message: 'High charges relative to investment size',
          type: 'bestPractice'
        })
      }

      return {
        isValid: true,
        errors: [],
        warnings,
        suggestions: totalCharges > 2 ? ['Document value justification for charges'] : []
      }
    }
  },
  {
    rule: 'allocation_total_100',
    sections: ['recommendation'],
    validate: (formData) => {
      const equities = ensureNumber((formData.recommendation as any)?.allocation_equities)
      const bonds = ensureNumber((formData.recommendation as any)?.allocation_bonds)
      const cash = ensureNumber((formData.recommendation as any)?.allocation_cash)
      const alternatives = ensureNumber((formData.recommendation as any)?.allocation_alternatives)
      const total = equities + bonds + cash + alternatives

      const errors: ValidationError[] = []
      const warnings: ValidationWarning[] = []

      if (total === 0) {
        errors.push({
          sectionId: 'recommendation',
          fieldId: 'allocation_equities',
          message: 'Asset allocation must be completed and total 100%',
          severity: 'critical',
          code: 'ALLOCATION_MISSING'
        })
      } else if (Math.round(total) !== 100) {
        errors.push({
          sectionId: 'recommendation',
          fieldId: 'allocation_equities',
          message: `Asset allocation must total 100% (currently ${total}%)`,
          severity: 'error',
          code: 'ALLOCATION_TOTAL_INVALID'
        })
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      }
    }
  },
  {
    rule: 'options_selection_required',
    sections: ['options_considered'],
    validate: (formData) => {
      const selected1 = ensureString((formData as any).options_considered?.option_1_selected)
      const selected2 = ensureString((formData as any).options_considered?.option_2_selected)
      const selected3 = ensureString((formData as any).options_considered?.option_3_selected)

      const yesCount = [selected1, selected2, selected3].filter((v) => v === 'Yes').length

      const errors: ValidationError[] = []
      const warnings: ValidationWarning[] = []

      if (yesCount === 0) {
        errors.push({
          sectionId: 'options_considered',
          fieldId: 'option_1_selected',
          message: 'Select at least one option as the recommended solution',
          severity: 'critical',
          code: 'NO_OPTION_SELECTED'
        })
      } else if (yesCount > 1) {
        warnings.push({
          sectionId: 'options_considered',
          fieldId: 'option_1_selected',
          message: 'Multiple options are marked as selected - confirm the final recommendation',
          type: 'dataQuality'
        })
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      }
    }
  },

  // FIX Issue 16: Product amounts vs investment amount mismatch
  {
    rule: 'product_amounts_match_investment',
    sections: ['recommendation', 'objectives'],
    validate: (formData) => {
      const rec = formData.recommendation as any
      const investmentAmount = ensureNumber(formData.objectives?.investment_amount)

      // Sum up all product amounts (up to 5 products)
      const productAmounts = [
        ensureNumber(rec?.product_1_amount),
        ensureNumber(rec?.product_2_amount),
        ensureNumber(rec?.product_3_amount),
        ensureNumber(rec?.product_4_amount),
        ensureNumber(rec?.product_5_amount)
      ]
      const totalProductAmount = productAmounts.reduce((sum, amt) => sum + amt, 0)

      const errors: ValidationError[] = []
      const warnings: ValidationWarning[] = []

      // Only validate if both values are set
      if (investmentAmount > 0 && totalProductAmount > 0) {
        const difference = Math.abs(totalProductAmount - investmentAmount)
        const percentDiff = (difference / investmentAmount) * 100

        if (totalProductAmount > investmentAmount * 1.05) {
          errors.push({
            sectionId: 'recommendation',
            fieldId: 'product_1_amount',
            message: `Product amounts total £${totalProductAmount.toLocaleString()} exceeds investment amount £${investmentAmount.toLocaleString()}`,
            severity: 'error',
            code: 'PRODUCT_AMOUNT_EXCEEDS_INVESTMENT'
          })
        } else if (percentDiff > 5 && totalProductAmount < investmentAmount) {
          warnings.push({
            sectionId: 'recommendation',
            fieldId: 'product_1_amount',
            message: `Product amounts (£${totalProductAmount.toLocaleString()}) differ from investment amount (£${investmentAmount.toLocaleString()}) by ${percentDiff.toFixed(1)}%`,
            type: 'dataQuality'
          })
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      }
    }
  },

  // FIX Issue 17: Negative financial figures should be rejected
  {
    rule: 'no_negative_financial_figures',
    sections: ['financial_situation'],
    validate: (formData) => {
      const fin = formData.financial_situation as any
      const errors: ValidationError[] = []

      const financialFields = [
        { field: 'annual_income', label: 'Annual Income', value: ensureNumber(fin?.annual_income) },
        { field: 'monthly_expenditure', label: 'Monthly Expenditure', value: ensureNumber(fin?.monthly_expenditure) },
        { field: 'liquid_assets', label: 'Liquid Assets', value: ensureNumber(fin?.liquid_assets) },
        { field: 'net_worth', label: 'Net Worth', value: ensureNumber(fin?.net_worth) },
        { field: 'savings', label: 'Savings', value: ensureNumber(fin?.savings) },
        { field: 'emergency_fund', label: 'Emergency Fund', value: ensureNumber(fin?.emergency_fund) }
      ]

      for (const { field, label, value } of financialFields) {
        // Only check if a value was actually provided (not just defaulting to 0)
        const rawValue = fin?.[field]
        if (rawValue !== undefined && rawValue !== null && rawValue !== '' && value < 0) {
          errors.push({
            sectionId: 'financial_situation',
            fieldId: field,
            message: `${label} cannot be negative`,
            severity: 'error',
            code: 'NEGATIVE_FINANCIAL_VALUE'
          })
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings: []
      }
    }
  },

  // FIX Issue 22: Financial breakdown should match stated total
  {
    rule: 'income_breakdown_matches_total',
    sections: ['financial_situation'],
    validate: (formData) => {
      const fin = formData.financial_situation as any
      const statedTotal = ensureNumber(fin?.annual_income)

      // Sum up income components if provided
      const incomeComponents = [
        ensureNumber(fin?.employment_income),
        ensureNumber(fin?.self_employment_income),
        ensureNumber(fin?.pension_income),
        ensureNumber(fin?.investment_income),
        ensureNumber(fin?.rental_income),
        ensureNumber(fin?.other_income)
      ]
      const componentTotal = incomeComponents.reduce((sum, amt) => sum + amt, 0)

      const errors: ValidationError[] = []
      const warnings: ValidationWarning[] = []

      // Only validate if both total and components are provided
      if (statedTotal > 0 && componentTotal > 0) {
        const difference = Math.abs(componentTotal - statedTotal)
        const percentDiff = (difference / statedTotal) * 100

        if (percentDiff > 10) {
          warnings.push({
            sectionId: 'financial_situation',
            fieldId: 'annual_income',
            message: `Income breakdown (£${componentTotal.toLocaleString()}) differs from total (£${statedTotal.toLocaleString()}) by ${percentDiff.toFixed(1)}%`,
            type: 'dataQuality'
          })
        }
      }

      return {
        isValid: true,
        errors,
        warnings
      }
    }
  },

  // FIX Issue 38: Empty scope should be a blocking error
  {
    rule: 'advice_scope_required',
    sections: ['objectives'],
    validate: (formData) => {
      const scope = ensureArray((formData.objectives as any)?.advice_scope)
      const errors: ValidationError[] = []

      if (scope.length === 0) {
        errors.push({
          sectionId: 'objectives',
          fieldId: 'advice_scope',
          message: 'Advice scope must be specified - select at least one area (e.g., Pension Planning, Investment Planning)',
          severity: 'critical',
          code: 'EMPTY_ADVICE_SCOPE'
        })
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings: []
      }
    }
  }
]


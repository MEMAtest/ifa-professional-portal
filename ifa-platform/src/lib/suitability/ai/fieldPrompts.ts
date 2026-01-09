import type { PulledPlatformData, SuitabilityFormData } from '@/types/suitability'

import { isAIGeneratableField, type AIGeneratableFieldId } from './fieldRegistry'

type FieldPrompt = {
  system: string
  user: string
}

const BASE_SYSTEM_PROMPT =
  'You are a senior UK financial adviser writing FCA-compliant suitability assessment text. ' +
  'Use clear, plain English, second person ("you"). Avoid guarantees. No markdown. ' +
  'Return JSON only with a single key "generatedText".'

const toNumber = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === '') return undefined
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

const asCurrency = (value: unknown): string | undefined => {
  const numeric = toNumber(value)
  if (numeric === undefined) return undefined
  return `GBP ${Math.round(numeric).toLocaleString()}`
}

const resolveTimeHorizon = (formData: SuitabilityFormData): string | undefined => {
  const numeric = toNumber(formData.objectives?.time_horizon)
  if (numeric) return `${numeric} years`
  const timeline = (formData.objectives as Record<string, any>)?.investment_timeline
  return timeline ? String(timeline) : undefined
}

const buildProductContext = (formData: SuitabilityFormData, index: number) => {
  const recommendation = formData.recommendation || {}
  return {
    name: recommendation[`product_${index}_name` as keyof typeof recommendation],
    provider: recommendation[`product_${index}_provider` as keyof typeof recommendation],
    amount: asCurrency(recommendation[`product_${index}_amount` as keyof typeof recommendation])
  }
}

const buildOptionContext = (formData: SuitabilityFormData, index: number) => {
  const options = formData.options_considered || {}
  return {
    name: options[`option_${index}_name` as keyof typeof options],
    selected: options[`option_${index}_selected` as keyof typeof options],
    pros: options[`option_${index}_pros` as keyof typeof options],
    cons: options[`option_${index}_cons` as keyof typeof options]
  }
}

const buildCommonContext = (formData: SuitabilityFormData, pulledData?: PulledPlatformData) => {
  const personal = formData.personal_information || {}
  const objectives = formData.objectives || {}
  const financial = formData.financial_situation || {}
  const risk = formData.risk_assessment || {}
  const recommendation = formData.recommendation || {}

  return {
    client: {
      name: personal.client_name,
      age: personal.age,
      employment_status: personal.employment_status,
      occupation: personal.occupation,
      dependents: personal.dependents
    },
    objectives: {
      primary: objectives.primary_objective,
      secondary: objectives.secondary_objectives,
      time_horizon: resolveTimeHorizon(formData),
      income_required: objectives.income_requirement ?? objectives.required_monthly_income,
      requires_investment_income: objectives.requires_investment_income
    },
    financial: {
      annual_income: asCurrency(financial.annual_income),
      monthly_expenditure: asCurrency(financial.monthly_expenditure ?? (financial as any).monthly_expenses),
      liquid_assets: asCurrency(financial.liquid_assets ?? (financial as any).savings),
      emergency_fund: asCurrency(financial.emergency_fund),
      investment_amount: asCurrency(financial.investment_amount ?? objectives.investment_amount)
    },
    risk_profile: {
      atr_score: pulledData?.atrScore,
      atr_category: pulledData?.atrCategory,
      cfl_score: pulledData?.cflScore,
      cfl_category: pulledData?.cflCategory,
      attitude_to_risk: risk.attitude_to_risk,
      max_acceptable_loss: risk.max_acceptable_loss
    },
    recommendation: {
      portfolio: recommendation.recommended_portfolio,
      allocation: {
        equities: recommendation.allocation_equities,
        bonds: recommendation.allocation_bonds,
        cash: recommendation.allocation_cash,
        alternatives: recommendation.allocation_alternatives
      }
    }
  }
}

const buildInstructions = (fieldId: AIGeneratableFieldId, formData: SuitabilityFormData) => {
  const productMatch = fieldId.match(/^product_(\d)_reason$/)
  if (productMatch) {
    return {
      instruction:
        'Write 2-3 sentences explaining why this specific product and provider are suitable for the client. ' +
        'Link to objectives, risk profile, and time horizon. If the product name implies a tax wrapper, mention the tax benefit.',
      product: buildProductContext(formData, Number(productMatch[1]))
    }
  }

  const optionDescriptionMatch = fieldId.match(/^option_(\d)_description$/)
  if (optionDescriptionMatch) {
    return {
      instruction: 'Write 1-2 sentences describing the option in neutral terms based on its name and context.',
      option: buildOptionContext(formData, Number(optionDescriptionMatch[1]))
    }
  }

  const optionReasonMatch = fieldId.match(/^option_(\d)_reason$/)
  if (optionReasonMatch) {
    return {
      instruction:
        'Write 1-2 sentences explaining why this option was selected or rejected. Use the pros/cons and risk profile if available.',
      option: buildOptionContext(formData, Number(optionReasonMatch[1]))
    }
  }

  switch (fieldId) {
    case 'recommendation_rationale':
      return {
        instruction:
          'Write 2-4 short paragraphs explaining why the overall recommendation is suitable. ' +
          'Reference objectives, risk profile, allocation, and affordability.'
      }
    case 'objectives_explanation':
      return {
        instruction: 'Write 2-3 sentences linking the recommendation to the client objectives and time horizon.'
      }
    case 'risk_explanation':
      return {
        instruction:
          'Explain how the recommendation aligns to ATR and CFL. If ATR and CFL differ, describe using the lower measure.'
      }
    case 'affordability_explanation':
      return {
        instruction:
          'Explain affordability using income, expenditure, surplus, emergency fund, and investment amount. Be cautious if data is missing.'
      }
    default:
      return { instruction: 'Write a concise, client-specific explanation.' }
  }
}

export function buildFieldPrompt(args: {
  fieldId: string
  formData: SuitabilityFormData
  pulledData?: PulledPlatformData
}): FieldPrompt {
  if (!isAIGeneratableField(args.fieldId)) {
    throw new Error(`Unsupported fieldId: ${args.fieldId}`)
  }

  const instructions = buildInstructions(args.fieldId, args.formData)
  const context = {
    field: args.fieldId,
    ...buildCommonContext(args.formData, args.pulledData),
    ...instructions
  }

  return {
    system: BASE_SYSTEM_PROMPT,
    user:
      `Generate suitability assessment text for field "${args.fieldId}".\n` +
      `Context:\n${JSON.stringify(context, null, 2)}`
  }
}

import type { ConditionalFieldGroup, PulledPlatformData, SuitabilityFormData } from '@/types/suitability'

import type { ConditionalAction, ConditionalRule } from './rules'
import { conditionalRules } from './rules'

export class ConditionalLogicEngine {
  private rules: ConditionalRule[]

  constructor(rules: ConditionalRule[] = conditionalRules) {
    this.rules = [...rules].sort((a, b) => a.priority - b.priority)
  }

  /**
   * Evaluates all conditional rules against the current form data.
   * FIX Issue 42: Added try-catch to prevent rule condition errors from crashing the entire form.
   */
  evaluateRules(formData: SuitabilityFormData, pulledData: PulledPlatformData): ConditionalAction[] {
    const applicableActions: ConditionalAction[] = []

    for (const rule of this.rules) {
      try {
        if (rule.condition(formData, pulledData)) {
          applicableActions.push(...rule.actions)
        }
      } catch (error) {
        console.error(`[ConditionalLogic] Error evaluating rule "${rule.id}":`, error)
      }
    }

    return applicableActions
  }

  getConditionalFields(
    sectionId: string,
    formData: SuitabilityFormData,
    pulledData: PulledPlatformData
  ): ConditionalFieldGroup[] {
    const groups: ConditionalFieldGroup[] = []
    const actions = this.evaluateRules(formData, pulledData)

    const fieldActions = actions.filter(
      (action) => (action.type === 'show_field' || action.type === 'show_section') && action.sectionId === sectionId
    )

    fieldActions.forEach((action) => {
      if (action.fields) {
        groups.push({
          condition: () => true,
          fields: action.fields,
          aiReason: action.message
        })
      }
    })

    return groups
  }

  getValidationMessages(formData: SuitabilityFormData, pulledData: PulledPlatformData): Record<string, string[]> {
    const messages: Record<string, string[]> = {}
    const actions = this.evaluateRules(formData, pulledData)

    actions
      .filter((action) => action.type === 'validate')
      .forEach((action) => {
        if (!messages[action.sectionId]) {
          messages[action.sectionId] = []
        }
        if (action.message) {
          messages[action.sectionId].push(action.message)
        }
      })

    return messages
  }

  /**
   * Executes calculated field functions and returns computed values.
   * FIX Issue 42: Added try-catch to prevent calculation errors from crashing.
   */
  getCalculatedValues(formData: SuitabilityFormData, pulledData: PulledPlatformData): Record<string, any> {
    const calculated: Record<string, any> = {}
    const actions = this.evaluateRules(formData, pulledData)

    actions
      .filter((action) => action.type === 'calculate')
      .forEach((action) => {
        if (action.fieldId && typeof action.value === 'function') {
          const key = `${action.sectionId}.${action.fieldId}`
          try {
            calculated[key] = action.value(formData, pulledData)
          } catch (error) {
            console.error(`[ConditionalLogic] Error calculating "${key}":`, error)
            calculated[key] = undefined
          }
        }
      })

    return calculated
  }
}

export const conditionalLogicEngine = new ConditionalLogicEngine()


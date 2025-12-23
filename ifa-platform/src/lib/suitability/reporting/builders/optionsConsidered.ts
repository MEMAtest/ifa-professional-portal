import type { SuitabilityFormData } from '@/types/suitability'

import type { SuitabilityOptionsConsidered } from '../types'
import { asObject, asTrimmedString, splitLines } from '../utils'

export function buildOptionsConsidered(formData: SuitabilityFormData): SuitabilityOptionsConsidered {
  const optionsSection = asObject((formData as any).options_considered)

  const optionCandidates = [
    {
      name: asTrimmedString(optionsSection.option_1_name),
      description: asTrimmedString(optionsSection.option_1_description),
      pros: splitLines(optionsSection.option_1_pros),
      cons: splitLines(optionsSection.option_1_cons),
      selected: asTrimmedString(optionsSection.option_1_selected) === 'Yes',
      reason: asTrimmedString(optionsSection.option_1_reason)
    },
    {
      name: asTrimmedString(optionsSection.option_2_name),
      description: asTrimmedString(optionsSection.option_2_description),
      pros: splitLines(optionsSection.option_2_pros),
      cons: splitLines(optionsSection.option_2_cons),
      selected: asTrimmedString(optionsSection.option_2_selected) === 'Yes',
      reason: asTrimmedString(optionsSection.option_2_reason)
    },
    {
      name: asTrimmedString(optionsSection.option_3_name),
      description: asTrimmedString(optionsSection.option_3_description),
      pros: splitLines(optionsSection.option_3_pros),
      cons: splitLines(optionsSection.option_3_cons),
      selected: asTrimmedString(optionsSection.option_3_selected) === 'Yes',
      reason: asTrimmedString(optionsSection.option_3_reason)
    }
  ].filter((o) => o.name || o.description || o.pros.length || o.cons.length)

  return {
    options: optionCandidates.map((o) => ({
      name: o.name || o.description || 'Option',
      description: o.description,
      pros: o.pros,
      cons: o.cons,
      selected: o.selected,
      reason: o.reason
    }))
  }
}


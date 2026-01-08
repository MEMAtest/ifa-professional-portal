import { FileText } from 'lucide-react'
import {
  OPTION_CONS_SUGGESTIONS,
  OPTION_PROS_SUGGESTIONS,
  OPTIONS_CONSIDERED_SUGGESTIONS
} from '@/lib/constants/recommendationOptions'

export const optionsConsideredSection = {
  id: 'options_considered',
  title: 'Options Considered',
  icon: FileText,
  status: 'incomplete',
  fields: [
    {
      id: 'option_1_name',
      label: 'Option 1 - Name',
      type: 'select',
      required: true,
      placeholder: 'e.g. Balanced Portfolio (Recommended)',
      options: OPTIONS_CONSIDERED_SUGGESTIONS,
      allowCustom: true,
      customOptionLabel: 'Add a new option...'
    },
    {
      id: 'option_1_description',
      label: 'Option 1 - Description',
      type: 'textarea',
      required: true,
      placeholder: 'Describe this option',
      rows: 3
    },
    {
      id: 'option_1_pros',
      label: 'Option 1 - Pros (select all that apply)',
      type: 'checkbox',
      required: true,
      options: OPTION_PROS_SUGGESTIONS,
      allowCustom: true,
      customOptionLabel: 'Add a custom pro...'
    },
    {
      id: 'option_1_cons',
      label: 'Option 1 - Cons (select all that apply)',
      type: 'checkbox',
      required: true,
      options: OPTION_CONS_SUGGESTIONS,
      allowCustom: true,
      customOptionLabel: 'Add a custom con...'
    },
    {
      id: 'option_1_score',
      label: 'Option 1 - Score',
      type: 'number',
      placeholder: '8',
      min: 0,
      max: 10,
      helpText: 'Score from 0-10 to compare options.'
    },
    {
      id: 'option_1_selected',
      label: 'Option 1 Selected?',
      type: 'select',
      required: true,
      options: ['Yes', 'No']
    },
    {
      id: 'option_1_reason',
      label: 'Option 1 - Selection Reason',
      type: 'textarea',
      placeholder: 'Why this option was selected / rejected',
      rows: 3
    },
    {
      id: 'option_2_name',
      label: 'Option 2 - Name',
      type: 'select',
      required: true,
      placeholder: 'e.g. Cash / Deposit-based approach',
      options: OPTIONS_CONSIDERED_SUGGESTIONS,
      allowCustom: true,
      customOptionLabel: 'Add a new option...'
    },
    {
      id: 'option_2_description',
      label: 'Option 2 - Description',
      type: 'textarea',
      required: true,
      placeholder: 'Describe this alternative option',
      rows: 3
    },
    {
      id: 'option_2_pros',
      label: 'Option 2 - Pros (select all that apply)',
      type: 'checkbox',
      required: true,
      options: OPTION_PROS_SUGGESTIONS,
      allowCustom: true,
      customOptionLabel: 'Add a custom pro...'
    },
    {
      id: 'option_2_cons',
      label: 'Option 2 - Cons (select all that apply)',
      type: 'checkbox',
      required: true,
      options: OPTION_CONS_SUGGESTIONS,
      allowCustom: true,
      customOptionLabel: 'Add a custom con...'
    },
    {
      id: 'option_2_score',
      label: 'Option 2 - Score',
      type: 'number',
      placeholder: '6',
      min: 0,
      max: 10,
      helpText: 'Score from 0-10 to compare options.'
    },
    {
      id: 'option_2_selected',
      label: 'Option 2 Selected?',
      type: 'select',
      required: true,
      options: ['Yes', 'No']
    },
    {
      id: 'option_2_reason',
      label: 'Option 2 - Selection Reason',
      type: 'textarea',
      placeholder: 'Why this option was selected / rejected',
      rows: 3
    },
    {
      id: 'option_3_name',
      label: 'Option 3 - Name (optional)',
      type: 'select',
      options: OPTIONS_CONSIDERED_SUGGESTIONS,
      allowCustom: true,
      customOptionLabel: 'Add a new option...'
    },
    {
      id: 'option_3_description',
      label: 'Option 3 - Description (optional)',
      type: 'textarea',
      rows: 3
    },
    {
      id: 'option_3_pros',
      label: 'Option 3 - Pros (select all that apply, optional)',
      type: 'checkbox',
      options: OPTION_PROS_SUGGESTIONS,
      allowCustom: true,
      customOptionLabel: 'Add a custom pro...'
    },
    {
      id: 'option_3_cons',
      label: 'Option 3 - Cons (select all that apply, optional)',
      type: 'checkbox',
      options: OPTION_CONS_SUGGESTIONS,
      allowCustom: true,
      customOptionLabel: 'Add a custom con...'
    },
    {
      id: 'option_3_score',
      label: 'Option 3 - Score (optional)',
      type: 'number',
      placeholder: '5',
      min: 0,
      max: 10,
      helpText: 'Score from 0-10 to compare options.'
    },
    {
      id: 'option_3_selected',
      label: 'Option 3 Selected? (optional)',
      type: 'select',
      options: ['Yes', 'No']
    },
    {
      id: 'option_3_reason',
      label: 'Option 3 - Selection Reason (optional)',
      type: 'textarea',
      rows: 3
    }
  ]
}

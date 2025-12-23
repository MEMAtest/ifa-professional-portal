import { FileText } from 'lucide-react'

export const optionsConsideredSection = {
  id: 'options_considered',
  title: 'Options Considered',
  icon: FileText,
  status: 'incomplete',
  fields: [
    {
      id: 'option_1_name',
      label: 'Option 1 - Name',
      type: 'text',
      required: true,
      placeholder: 'e.g. Balanced Portfolio (Recommended)'
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
      label: 'Option 1 - Pros (one per line)',
      type: 'textarea',
      required: true,
      placeholder: 'e.g.\\nAligned to objectives\\nDiversified',
      rows: 4
    },
    {
      id: 'option_1_cons',
      label: 'Option 1 - Cons (one per line)',
      type: 'textarea',
      required: true,
      placeholder: 'e.g.\\nMarket risk\\nValues can fall',
      rows: 4
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
      type: 'text',
      required: true,
      placeholder: 'e.g. Cash / Deposit-based approach'
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
      label: 'Option 2 - Pros (one per line)',
      type: 'textarea',
      required: true,
      rows: 4
    },
    {
      id: 'option_2_cons',
      label: 'Option 2 - Cons (one per line)',
      type: 'textarea',
      required: true,
      rows: 4
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
      type: 'text'
    },
    {
      id: 'option_3_description',
      label: 'Option 3 - Description (optional)',
      type: 'textarea',
      rows: 3
    },
    {
      id: 'option_3_pros',
      label: 'Option 3 - Pros (one per line, optional)',
      type: 'textarea',
      rows: 4
    },
    {
      id: 'option_3_cons',
      label: 'Option 3 - Cons (one per line, optional)',
      type: 'textarea',
      rows: 4
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


import { Target } from 'lucide-react'

export const objectivesSection = {
  id: 'objectives',
  title: 'Investment Objectives',
  icon: Target,
  status: 'incomplete',
  fields: [
    {
      id: 'primary_objective',
      label: 'Primary Investment Objective',
      type: 'select',
      required: true,
      options: [
        'Capital Growth',
        'Income Generation',
        'Capital Preservation',
        'Retirement Planning',
        'Tax Efficiency',
        'Estate Planning'
      ]
    },
    {
      id: 'advice_scope',
      label: 'Scope of Advice',
      type: 'checkbox',
      required: true,
      options: ['Pension Planning', 'Investment Planning', 'Protection Review', 'Estate Planning', 'Tax Planning'],
      helpText: 'Select all areas this advice covers. This controls which sections appear in reports.'
    },
    {
      id: 'investment_timeline',
      label: 'Investment Time Horizon (Years)',
      type: 'select',
      required: true,
      options: ['Less than 3', '3-5', '5-10', '10-15', 'More than 15']
    },
    {
      id: 'target_return',
      label: 'Target Annual Return (%)',
      type: 'number',
      placeholder: 'e.g., 7',
      min: 0,
      max: 30
    },
    {
      id: 'requires_investment_income',
      label: 'Do you require income from investments?',
      type: 'radio',
      required: true,
      options: ['Yes', 'No']
    },
    {
      id: 'income_frequency',
      label: 'Income Frequency Required',
      type: 'select',
      options: ['Monthly', 'Quarterly', 'Annually', 'Not Applicable']
    },
    {
      id: 'ethical_investing',
      label: 'Interest in Ethical/ESG Investing?',
      type: 'radio',
      options: ['Yes', 'No', 'Unsure']
    }
  ]
}


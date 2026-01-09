import type { ConditionalRule } from '../types'

export const knowledgeRules: ConditionalRule[] = [
  // ===== KNOWLEDGE & EXPERIENCE INTELLIGENCE (Rules 28-35) =====
  {
    id: 'no_experience_warning',
    name: 'Warn when investment experience is none',
    sections: ['knowledge_experience'],
    priority: 27,
    condition: (formData) => (formData.knowledge_experience as Record<string, any>)?.investment_experience === 'None',
    actions: [
      {
        type: 'validate',
        sectionId: 'knowledge_experience',
        message: 'Client reports no prior investment experience. Consider simpler products and additional education.'
      }
    ]
  },
  {
    id: 'novice_limitations',
    name: 'Limit products for novice investors',
    sections: ['knowledge_experience', 'recommendation'],
    priority: 28,
    condition: (formData) => formData.knowledge_experience?.investment_knowledge === 'Basic',
    actions: [
      {
        type: 'show_field',
        sectionId: 'knowledge_experience',
        fields: [
          {
            id: 'education_needs',
            label: 'Investment Education Needed',
            type: 'select',
            options: ['Basic Concepts', 'Risk Understanding', 'Product Knowledge', 'All Areas'],
            required: true
          },
          {
            id: 'prefer_managed_solutions',
            label: 'Prefer Professionally Managed Solutions?',
            type: 'radio',
            options: ['Yes', 'No'],
            required: true
          }
        ]
      }
    ]
  },

  {
    id: 'experienced_investor_options',
    name: 'Unlock options for experienced investors',
    sections: ['knowledge_experience', 'objectives'],
    priority: 29,
    condition: (formData) => {
      const knowledge = formData.knowledge_experience?.investment_knowledge
      return knowledge === 'Advanced' || knowledge === 'Expert'
    },
    actions: [
      {
        type: 'show_field',
        sectionId: 'objectives',
        fields: [
          {
            id: 'self_directed',
            label: 'Prefer Self-Directed Investment?',
            type: 'radio',
            options: ['Yes', 'No', 'Hybrid Approach']
          },
          {
            id: 'complex_products',
            label: 'Consider Complex Products?',
            type: 'radio',
            options: ['Yes', 'No']
          }
        ]
      }
    ]
  },

  {
    id: 'existing_portfolio_analysis',
    name: 'Analyze existing portfolio',
    sections: ['knowledge_experience', 'existing_arrangements'],
    priority: 30,
    condition: (formData) => formData.knowledge_experience?.current_investments === 'Yes',
    actions: [
      {
        type: 'show_field',
        sectionId: 'knowledge_experience',
        fields: [
          {
            id: 'portfolio_value',
            label: 'Current Portfolio Value (£)',
            type: 'number'
          },
          {
            id: 'portfolio_composition',
            label: 'Portfolio Composition',
            type: 'select',
            options: ['Mostly Cash', 'Bonds Heavy', 'Balanced', 'Equity Heavy', 'Alternative Assets']
          },
          {
            id: 'investment_performance',
            label: 'Performance vs Expectations',
            type: 'select',
            options: ['Exceeding', 'Meeting', 'Below', 'Unsure']
          },
          {
            id: 'current_adviser',
            label: 'Currently Using an Adviser?',
            type: 'radio',
            options: ['Yes', 'No', 'Previously']
          }
        ]
      }
    ]
  }
]

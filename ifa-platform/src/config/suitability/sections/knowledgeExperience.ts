import { GraduationCap } from 'lucide-react'

export const knowledgeExperienceSection = {
  id: 'knowledge_experience',
  title: 'Knowledge & Experience',
  icon: GraduationCap,
  status: 'incomplete',
  fields: [
    {
      id: 'investment_experience',
      label: 'Years of Investment Experience',
      type: 'select',
      required: true,
      options: ['None', 'Less than 1', '1-3', '3-5', '5-10', 'More than 10'],
      pullFrom: 'client.riskProfile.knowledgeExperience' // ✅ AUTO-GENERATION: Pull experience
    },
    {
      id: 'products_used',
      label: 'Investment Products Used Before',
      type: 'checkbox',
      options: [
        'ISAs',
        'Pensions',
        'Stocks & Shares',
        'Bonds',
        'Mutual Funds',
        'ETFs',
        'Options/Derivatives',
        'Property',
        'Cryptocurrency'
      ]
    },
    {
      id: 'investment_knowledge',
      label: 'Self-Rated Investment Knowledge',
      type: 'select',
      required: true,
      options: ['Beginner', 'Basic', 'Intermediate', 'Advanced', 'Expert']
    },
    {
      id: 'professional_qualifications',
      label: 'Financial/Investment Qualifications',
      type: 'radio',
      options: ['Yes', 'No']
    },
    {
      id: 'information_sources',
      label: 'How do you stay informed about investments?',
      type: 'checkbox',
      options: [
        'Financial News',
        'Investment Magazines',
        'Online Research',
        'Financial Advisor',
        'Friends/Family',
        'Social Media',
        "Don't actively follow"
      ]
    }
  ]
}


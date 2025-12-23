import { Shield } from 'lucide-react'

export const riskAssessmentSection = {
  id: 'risk_assessment',
  title: 'Risk Assessment',
  icon: Shield,
  status: 'incomplete',
  fields: [
    {
      id: 'attitude_to_risk',
      label: 'Attitude to Risk',
      type: 'select',
      required: true,
      options: [
        'Very Low - I want to preserve capital',
        'Low - I can accept minimal fluctuations',
        'Medium - I can accept moderate fluctuations',
        'High - I can accept significant fluctuations',
        'Very High - I seek maximum growth'
      ],
      pullFrom: 'client.riskProfile.attitudeToRisk' // ✅ AUTO-GENERATION: Pull risk attitude
    },
    {
      id: 'max_acceptable_loss',
      label: 'Maximum Acceptable Loss in Bad Year (%)',
      type: 'select',
      required: true,
      options: ['0-5%', '5-10%', '10-20%', '20-30%', 'More than 30%'],
      pullFrom: 'client.riskProfile.capacityForLoss' // ✅ AUTO-GENERATION: Pull loss capacity
    },
    {
      id: 'reaction_to_loss',
      label: 'If portfolio dropped 20%, I would...',
      type: 'select',
      required: true,
      options: [
        'Sell everything immediately',
        'Sell some investments',
        'Hold and wait for recovery',
        'Buy more at lower prices'
      ]
    },
    {
      id: 'capacity_for_loss',
      label: 'Financial Impact of Significant Loss',
      type: 'select',
      required: true,
      options: [
        'Devastating - would affect basic needs',
        'Significant - would affect lifestyle',
        'Moderate - would delay some goals',
        'Minor - would not materially affect me'
      ]
    },
    {
      id: 'investment_volatility',
      label: 'Comfort with Investment Volatility',
      type: 'select',
      required: true,
      options: ['Very Uncomfortable', 'Uncomfortable', 'Neutral', 'Comfortable', 'Very Comfortable']
    }
  ]
}


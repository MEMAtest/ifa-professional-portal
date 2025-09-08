// =====================================================
// FILE: /config/suitability/sections.ts
// COMPLETE CONFIGURATION WITH AUTO-GENERATION PROPERTIES
// =====================================================

import {
  User,
  Phone,
  Target,
  PoundSterling,
  Shield,
  GraduationCap,
  Briefcase,
  Heart,
  FileCheck,
  Calculator,
  FileText
} from 'lucide-react'

export const suitabilitySections = [
  {
    id: 'personal_information',
    title: 'Personal Information',
    icon: User,
    status: 'incomplete',
    fields: [
      {
        id: 'client_name',
        label: 'Full Name',
        type: 'text',
        required: true,
        placeholder: 'Enter client full name',
        pullFrom: 'client.personalDetails', // ✅ AUTO-GENERATION: Pull full name
        autoGenerate: true // ✅ Will generate if no client data
      },
      {
        id: 'date_of_birth',
        label: 'Date of Birth',
        type: 'date',
        required: true,
        pullFrom: 'client.personalDetails.dateOfBirth' // ✅ AUTO-GENERATION: Pull DOB
      },
      {
        id: 'age',
        label: 'Age',
        type: 'number',
        placeholder: 'Auto-calculated from date of birth',
        calculate: 'age', // ✅ AUTO-GENERATION: Calculate from DOB
        autoGenerate: true // ✅ Generate age field
      },
      {
        id: 'client_reference',
        label: 'Client Reference',
        type: 'text',
        placeholder: 'Auto-generated reference',
        autoGenerate: true // ✅ AUTO-GENERATION: Generate reference
      },
      {
        id: 'ni_number',
        label: 'National Insurance Number',
        type: 'text',
        required: true,
        placeholder: 'Format: AA 12 34 56 B'
      },
      {
        id: 'marital_status',
        label: 'Marital Status',
        type: 'select',
        required: true,
        options: ['Single', 'Married', 'Civil Partnership', 'Divorced', 'Widowed'],
        pullFrom: 'client.personalDetails.maritalStatus' // ✅ AUTO-GENERATION: Pull marital status
      },
      {
        id: 'employment_status',
        label: 'Employment Status',
        type: 'select',
        required: true,
        options: ['Employed', 'Self-Employed', 'Retired', 'Not Working', 'Student'],
        pullFrom: 'client.personalDetails.employmentStatus' // ✅ AUTO-GENERATION: Pull employment
      },
      {
        id: 'occupation',
        label: 'Current Occupation',
        type: 'text',
        placeholder: 'Enter occupation or profession',
        pullFrom: 'client.personalDetails.occupation' // ✅ AUTO-GENERATION: Pull occupation
      },
      {
        id: 'employer_name',
        label: 'Employer Name',
        type: 'text',
        placeholder: 'Enter employer name'
      },
      {
        id: 'years_with_employer',
        label: 'Years with Current Employer',
        type: 'number',
        min: 0,
        max: 50
      },
      {
        id: 'target_retirement_age',
        label: 'Target Retirement Age',
        type: 'number',
        required: true,
        min: 55,
        max: 75,
        placeholder: '65',
        autoGenerate: true, // ✅ AUTO-GENERATION: Smart default retirement age
        smartDefault: (formData, pulledData) => {
          const currentAge = formData.personal_information?.age || 30
          return Math.max(65, currentAge + 5) // Minimum 65 or current age + 5 years
        }
      },
      {
        id: 'health_status',
        label: 'Health Status',
        type: 'select',
        options: ['Excellent', 'Good', 'Fair', 'Poor']
      },
      {
        id: 'smoker',
        label: 'Smoker',
        type: 'select',
        options: ['Yes', 'No', 'Former']
      },
      {
        id: 'dependents',
        label: 'Number of Financial Dependents',
        type: 'number',
        min: 0,
        max: 10,
        pullFrom: 'client.personalDetails.dependents' // ✅ AUTO-GENERATION: Pull dependents
      }
    ]
  },
  {
    id: 'contact_details',
    title: 'Contact Details',
    icon: Phone,
    status: 'incomplete',
    fields: [
      {
        id: 'address',
        label: 'Home Address',
        type: 'address',
        required: true,
        placeholder: 'Start typing your address...',
        pullFrom: 'client.contactInfo.address' // ✅ AUTO-GENERATION: Pull address
      },
      {
        id: 'phone',
        label: 'Phone Number',
        type: 'tel',
        required: true,
        placeholder: '+44 7XXX XXXXXX',
        pullFrom: 'client.contactInfo.phone' // ✅ AUTO-GENERATION: Pull phone
      },
      {
        id: 'email',
        label: 'Email Address',
        type: 'email',
        required: true,
        placeholder: 'email@example.com',
        pullFrom: 'client.contactInfo.email' // ✅ AUTO-GENERATION: Pull email
      },
      {
        id: 'preferred_contact',
        label: 'Preferred Contact Method',
        type: 'select',
        required: true,
        options: ['Email', 'Phone', 'Post', 'SMS'],
        pullFrom: 'client.contactInfo.preferredContact' // ✅ AUTO-GENERATION: Pull preference
      },
      {
        id: 'best_contact_time',
        label: 'Best Time to Contact',
        type: 'select',
        options: ['Morning (9am-12pm)', 'Afternoon (12pm-5pm)', 'Evening (5pm-8pm)', 'Anytime'],
        smartDefault: (formData, pulledData) => {
          // Smart default based on employment status
          const employment = formData.personal_information?.employment_status
          if (employment === 'Retired') return 'Anytime'
          if (employment === 'Employed') return 'Evening (5pm-8pm)'
          return 'Afternoon (12pm-5pm)'
        }
      }
    ]
  },
  {
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
        id: 'income_requirement',
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
  },
  {
    id: 'financial_situation',
    title: 'Financial Situation',
    icon: PoundSterling,
    status: 'incomplete',
    fields: [
      {
        id: 'annual_income',
        label: 'Annual Gross Income (£)',
        type: 'number',
        required: true,
        placeholder: '50000',
        min: 0,
        pullFrom: 'client.financialProfile.annualIncome' // ✅ AUTO-GENERATION: Pull income
      },
      {
        id: 'monthly_expenses',
        label: 'Monthly Essential Expenses (£)',
        type: 'number',
        required: true,
        placeholder: '2500',
        min: 0,
        pullFrom: 'client.financialProfile.monthlyExpenses' // ✅ AUTO-GENERATION: Pull expenses
      },
      {
        id: 'savings',
        label: 'Total Savings (£)',
        type: 'number',
        required: true,
        placeholder: '10000',
        min: 0,
        pullFrom: 'client.financialProfile.liquidAssets' // ✅ AUTO-GENERATION: Pull savings
      },
      {
        id: 'property_value',
        label: 'Property Value (£)',
        type: 'number',
        placeholder: '300000',
        min: 0,
        pullFrom: 'client.financialProfile.propertyValue' // ✅ AUTO-GENERATION: Pull property
      },
      {
        id: 'mortgage_outstanding',
        label: 'Outstanding Mortgage (£)',
        type: 'number',
        placeholder: '150000',
        min: 0,
        pullFrom: 'client.financialProfile.mortgageBalance' // ✅ AUTO-GENERATION: Pull mortgage
      },
      {
        id: 'other_debts',
        label: 'Other Debts (£)',
        type: 'number',
        placeholder: '5000',
        min: 0,
        pullFrom: 'client.financialProfile.otherDebts' // ✅ AUTO-GENERATION: Pull debts
      },
      {
        id: 'emergency_fund',
        label: 'Emergency Fund (£)',
        type: 'number',
        required: true,
        placeholder: '10000',
        min: 0,
        pullFrom: 'client.financialProfile.emergencyFund', // ✅ AUTO-GENERATION: Pull emergency fund
        smartDefault: (formData, pulledData) => {
          // Smart default: 6 months of expenses
          const monthlyExpenses = formData.financial_situation?.monthly_expenses || 0
          return monthlyExpenses * 6
        }
      },
      {
        id: 'monthly_surplus',
        label: 'Monthly Surplus Income (£)',
        type: 'number',
        placeholder: '1000',
        min: 0,
        calculate: 'disposable_income' // ✅ AUTO-GENERATION: Calculate surplus
      },
      {
        id: 'investment_amount',
        label: 'Amount Available to Invest (£)',
        type: 'number',
        required: true,
        placeholder: '25000',
        min: 0
      },
      {
        id: 'net_worth',
        label: 'Total Net Worth (£)',
        type: 'number',
        placeholder: 'Auto-calculated',
        calculate: 'net_worth' // ✅ AUTO-GENERATION: Calculate net worth
      }
    ]
  },
  {
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
  },
  {
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
          'Don\'t actively follow'
        ]
      }
    ]
  },
  {
    id: 'existing_arrangements',
    title: 'Existing Financial Arrangements',
    icon: Briefcase,
    status: 'incomplete',
    fields: [
      {
        id: 'has_pension',
        label: 'Do you have existing pensions?',
        type: 'radio',
        required: true,
        options: ['Yes', 'No']
      },
      {
        id: 'pension_value',
        label: 'Total Pension Value (£)',
        type: 'number',
        placeholder: '100000',
        min: 0,
        pullFrom: 'client.financialProfile.pensionValue' // ✅ AUTO-GENERATION: Pull pension value
      },
      {
        id: 'pension_type',
        label: 'Pension Types',
        type: 'checkbox',
        options: ['Workplace', 'Personal', 'SIPP', 'Final Salary', 'State Pension']
      },
      {
        id: 'has_investments',
        label: 'Do you have other investments?',
        type: 'radio',
        required: true,
        options: ['Yes', 'No']
      },
      {
        id: 'investment_value',
        label: 'Total Investment Value (£)',
        type: 'number',
        placeholder: '50000',
        min: 0,
        pullFrom: 'client.financialProfile.existingInvestments' // ✅ AUTO-GENERATION: Pull investments
      },
      {
        id: 'has_protection',
        label: 'Life Insurance/Protection',
        type: 'checkbox',
        options: ['Life Insurance', 'Critical Illness', 'Income Protection', 'None']
      },
      {
        id: 'will_in_place',
        label: 'Do you have a will?',
        type: 'radio',
        options: ['Yes', 'No', 'In Progress']
      }
    ]
  },
  {
    id: 'vulnerability_assessment',
    title: 'Vulnerability & Support Needs',
    icon: Heart,
    status: 'incomplete',
    fields: [
      {
        id: 'health_conditions',
        label: 'Any health conditions affecting financial decisions?',
        type: 'radio',
        required: true,
        options: ['Yes', 'No', 'Prefer not to say']
      },
      {
        id: 'support_needed',
        label: 'Support Requirements',
        type: 'checkbox',
        options: [
          'Large Print Documents',
          'Audio Information',
          'Simple Language',
          'Extra Time for Decisions',
          'Third Party Support',
          'None'
        ]
      },
      {
        id: 'life_events',
        label: 'Recent Significant Life Events',
        type: 'checkbox',
        options: [
          'Bereavement',
          'Divorce/Separation',
          'Job Loss',
          'Health Diagnosis',
          'Retirement',
          'None'
        ]
      },
      {
        id: 'financial_confidence',
        label: 'Confidence in Financial Decisions',
        type: 'select',
        required: true,
        options: ['Very Low', 'Low', 'Moderate', 'High', 'Very High']
      },
      {
        id: 'third_party_authority',
        label: 'Anyone else involved in financial decisions?',
        type: 'radio',
        options: ['Yes', 'No']
      }
    ]
  },
  {
    id: 'regulatory_compliance',
    title: 'Regulatory & Compliance',
    icon: FileCheck,
    status: 'incomplete',
    fields: [
      {
        id: 'uk_resident',
        label: 'UK Resident for Tax',
        type: 'radio',
        required: true,
        options: ['Yes', 'No']
      },
      {
        id: 'us_person',
        label: 'US Person/Citizen',
        type: 'radio',
        required: true,
        options: ['Yes', 'No']
      },
      {
        id: 'pep',
        label: 'Politically Exposed Person',
        type: 'radio',
        required: true,
        options: ['Yes', 'No']
      },
      {
        id: 'source_of_wealth',
        label: 'Source of Wealth',
        type: 'select',
        required: true,
        options: [
          'Employment',
          'Business Ownership',
          'Inheritance',
          'Property Sale',
          'Investments',
          'Pension',
          'Other'
        ]
      },
      {
        id: 'source_of_funds',
        label: 'Source of Investment Funds',
        type: 'select',
        required: true,
        options: [
          'Savings',
          'Bonus',
          'Inheritance',
          'Property Sale',
          'Existing Investments',
          'Gift',
          'Other'
        ]
      },
      {
        id: 'data_protection_consent',
        label: 'Consent to process personal data',
        type: 'checkbox',
        required: true,
        options: ['I consent to data processing as per privacy policy']
      }
    ]
  },
  {
    id: 'costs_charges',
    title: 'Costs & Charges',
    icon: Calculator,
    status: 'incomplete',
    fields: [
      {
        id: 'fee_structure_preference',
        label: 'Preferred Fee Structure',
        type: 'select',
        required: true,
        options: [
          'Percentage of Assets',
          'Fixed Annual Fee',
          'Hourly Rate',
          'Project Based',
          'Performance Based'
        ]
      },
      {
        id: 'initial_fee_agreed',
        label: 'Initial Fee Agreed (%)',
        type: 'number',
        placeholder: '3',
        min: 0,
        max: 10,
        step: 0.5
      },
      {
        id: 'ongoing_fee_agreed',
        label: 'Ongoing Annual Fee (%)',
        type: 'number',
        placeholder: '1',
        min: 0,
        max: 5,
        step: 0.25
      },
      {
        id: 'fee_payment_method',
        label: 'Fee Payment Method',
        type: 'select',
        options: [
          'Deducted from Investment',
          'Direct Payment',
          'Monthly Direct Debit',
          'Annual Invoice'
        ]
      },
      {
        id: 'understands_charges',
        label: 'I understand all charges',
        type: 'checkbox',
        required: true,
        options: ['Yes, I understand and accept all charges']
      }
    ]
  },
  {
    id: 'recommendation',
    title: 'Recommendation',
    icon: FileText,
    status: 'incomplete',
    fields: [
      {
        id: 'recommended_portfolio',
        label: 'Recommended Portfolio',
        type: 'select',
        options: [
          'Conservative',
          'Cautious',
          'Balanced',
          'Growth',
          'Aggressive Growth'
        ]
      },
      {
        id: 'asset_allocation',
        label: 'Asset Allocation',
        type: 'textarea',
        placeholder: 'Equities: 60%, Bonds: 30%, Alternatives: 5%, Cash: 5%',
        rows: 3
      },
      {
        id: 'recommended_products',
        label: 'Recommended Products',
        type: 'textarea',
        placeholder: 'List recommended products and providers',
        rows: 4
      },
      {
        id: 'recommendation_rationale',
        label: 'Recommendation Rationale',
        type: 'textarea',
        required: true,
        placeholder: 'Explain why this recommendation is suitable',
        rows: 5
      },
      {
        id: 'next_review_date',
        label: 'Next Review Date',
        type: 'date',
        required: true
      },
      {
        id: 'advisor_declaration',
        label: 'Advisor Declaration',
        type: 'checkbox',
        required: true,
        options: ['I confirm this recommendation is suitable for the client']
      }
    ]
  }
]
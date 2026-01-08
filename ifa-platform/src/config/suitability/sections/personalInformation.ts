import { User } from 'lucide-react'
import { OCCUPATION_SUGGESTIONS } from '@/lib/constants/occupations'

export const personalInformationSection = {
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
      pullFrom: 'client.personalDetails.occupation', // ✅ AUTO-GENERATION: Pull occupation
      options: OCCUPATION_SUGGESTIONS,
      helpText: 'Start typing to see suggestions (you can still enter a custom occupation).'
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
      smartDefault: (formData: any, pulledData: any) => {
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
      id: 'has_dependents',
      label: 'Any financial dependents?',
      type: 'radio',
      options: ['Yes', 'No'],
      autoGenerate: true,
      smartDefault: (formData: any) => {
        const dependents = formData.personal_information?.dependents
        if (typeof dependents === 'number') return dependents > 0 ? 'Yes' : 'No'
        return undefined
      }
    }
  ],
  conditionalFields: [
    {
      condition: (formData) => {
        const value = formData.personal_information?.has_dependents
        if (typeof value === 'boolean') return value
        if (typeof value === 'string') return value.toLowerCase() === 'yes'
        const dependents = Number(formData.personal_information?.dependents ?? 0)
        return Number.isFinite(dependents) && dependents > 0
      },
      fields: [
        {
          id: 'dependents',
          label: 'Number of Financial Dependents',
          type: 'number',
          min: 0,
          max: 10,
          pullFrom: 'client.personalDetails.dependents' // ✅ AUTO-GENERATION: Pull dependents
        }
      ]
    }
  ]
}

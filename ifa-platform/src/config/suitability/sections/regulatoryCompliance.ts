import { FileCheck } from 'lucide-react'

export const regulatoryComplianceSection = {
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
      options: ['Employment', 'Business Ownership', 'Inheritance', 'Property Sale', 'Investments', 'Pension', 'Other']
    },
    {
      id: 'source_of_funds',
      label: 'Source of Investment Funds',
      type: 'select',
      required: true,
      options: ['Savings', 'Bonus', 'Inheritance', 'Property Sale', 'Existing Investments', 'Gift', 'Other']
    },
    {
      id: 'data_protection_consent',
      label: 'Consent to process personal data',
      type: 'checkbox',
      required: true,
      options: ['I consent to data processing as per privacy policy']
    }
  ]
}


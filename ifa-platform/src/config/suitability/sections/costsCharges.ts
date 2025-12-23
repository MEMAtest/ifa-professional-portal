import { Calculator } from 'lucide-react'

export const costsChargesSection = {
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
      options: ['Percentage of Assets', 'Fixed Annual Fee', 'Hourly Rate', 'Project Based', 'Performance Based']
    },
    {
      id: 'initial_fee_agreed',
      label: 'Initial Fee Agreed (%)',
      type: 'number',
      placeholder: '3',
      min: 0,
      max: 10,
      step: 0.5,
      helpText: 'For percentage-based fee structures'
    },
    {
      id: 'initial_flat_fee',
      label: 'Initial Flat Fee (£)',
      type: 'number',
      placeholder: '2500',
      min: 0,
      max: 50000,
      step: 100,
      helpText: 'For fixed fee structures - one-time initial charge'
    },
    {
      id: 'ongoing_fee_agreed',
      label: 'Ongoing Annual Fee (%)',
      type: 'number',
      placeholder: '1',
      min: 0,
      max: 5,
      step: 0.25,
      helpText: 'For percentage-based fee structures'
    },
    {
      id: 'ongoing_flat_fee',
      label: 'Ongoing Annual Flat Fee (£)',
      type: 'number',
      placeholder: '1500',
      min: 0,
      max: 25000,
      step: 50,
      helpText: 'For fixed fee structures - annual charge'
    },
    {
      id: 'hourly_rate',
      label: 'Hourly Rate (£)',
      type: 'number',
      placeholder: '250',
      min: 0,
      max: 1000,
      step: 25,
      helpText: 'For hourly rate fee structures'
    },
    {
      id: 'fee_payment_method',
      label: 'Fee Payment Method',
      type: 'select',
      options: ['Deducted from Investment', 'Direct Payment', 'Monthly Direct Debit', 'Annual Invoice']
    },
    {
      id: 'platform_charge',
      label: 'Platform Charge (%)',
      type: 'number',
      placeholder: '0.25',
      min: 0,
      max: 5,
      step: 0.01,
      helpText: 'Typical range 0.20% - 0.60% depending on platform'
    },
    {
      id: 'fund_charges',
      label: 'Underlying Fund Charges (%)',
      type: 'number',
      placeholder: '0.35',
      min: 0,
      max: 5,
      step: 0.01,
      helpText: 'Ongoing charges figure (OCF) / fund costs'
    },
    {
      id: 'understands_charges',
      label: 'I understand all charges',
      type: 'checkbox',
      required: true,
      options: ['Yes, I understand and accept all charges']
    }
  ]
}


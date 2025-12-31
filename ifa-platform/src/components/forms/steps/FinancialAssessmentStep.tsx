// src/components/forms/steps/FinancialAssessmentStep.tsx - Financial profile capture (FIXED)
'use client'
import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/Input'

interface FinancialProfile {
  investmentAmount: number;
  timeHorizon: number;
  primaryObjective: string;
  secondaryObjectives: string[];
  incomeRequirement: number;
  emergencyFund: number;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  monthlyIncome: number;
  monthlyExpenditure: number;
  disposableIncome: number;
  pensionValue: number;
  propertyValue: number;
}

interface FinancialAssessmentStepProps {
  financialProfile: FinancialProfile
  onChange: (updates: Partial<FinancialProfile>) => void
  errors: string[]
}

export const FinancialAssessmentStep = ({ financialProfile, onChange, errors }: FinancialAssessmentStepProps) => {
  const [localProfile, setLocalProfile] = useState(financialProfile)

  // Auto-calculate derived values
  useEffect(() => {
    const netWorth = localProfile.totalAssets - localProfile.totalLiabilities
    const disposableIncome = localProfile.monthlyIncome - localProfile.monthlyExpenditure
    
    if (netWorth !== localProfile.netWorth || disposableIncome !== localProfile.disposableIncome) {
      const updates = {
        ...localProfile,
        netWorth,
        disposableIncome
      }
      setLocalProfile(updates)
      onChange(updates)
    }
  }, [localProfile, localProfile.totalAssets, localProfile.totalLiabilities, localProfile.monthlyIncome, localProfile.monthlyExpenditure, localProfile.netWorth, localProfile.disposableIncome, onChange])

  const handleChange = (field: keyof FinancialProfile, value: number | string | string[]) => {
    const updates = { ...localProfile, [field]: value }
    setLocalProfile(updates)
    onChange(updates)
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value)
  }

  return (
    <div className="space-y-6">
      {/* Investment Objectives */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Investment Objectives</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Primary Objective <span className="text-red-500">*</span>
            </label>
            <textarea
              value={localProfile.primaryObjective}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleChange('primaryObjective', e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              placeholder="Describe the client's main financial goal..."
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Investment Amount"
              type="number"
              value={localProfile.investmentAmount || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('investmentAmount', parseFloat(e.target.value) || 0)}
              min="1000"
              placeholder="100000"
              required
            />
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Time Horizon <span className="text-red-500">*</span>
              </label>
              <select
                value={localProfile.timeHorizon}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleChange('timeHorizon', parseInt(e.target.value))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">Select Time Horizon</option>
                <option value="1">Short Term (1-3 years)</option>
                <option value="3">Medium Term (3-7 years)</option>
                <option value="7">Long Term (7+ years)</option>
              </select>
            </div>
          </div>

          <Input
            label="Income Requirement (Annual)"
            type="number"
            value={localProfile.incomeRequirement || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('incomeRequirement', parseFloat(e.target.value) || 0)}
            min="0"
            placeholder="20000"
          />
        </div>
      </div>

      {/* Financial Position */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Financial Position</h3>
        
        {/* Assets */}
        <div className="mb-6">
          <h4 className="text-md font-medium text-gray-800 mb-3">Assets</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Cash & Savings"
              type="number"
              value={localProfile.emergencyFund || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('emergencyFund', parseFloat(e.target.value) || 0)}
              min="0"
              placeholder="25000"
            />
            
            <Input
              label="Property Value"
              type="number"
              value={localProfile.propertyValue || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('propertyValue', parseFloat(e.target.value) || 0)}
              min="0"
              placeholder="350000"
            />
            
            <Input
              label="Pension Value"
              type="number"
              value={localProfile.pensionValue || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('pensionValue', parseFloat(e.target.value) || 0)}
              min="0"
              placeholder="150000"
            />
            
            <Input
              label="Total Assets"
              type="number"
              value={localProfile.totalAssets || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('totalAssets', parseFloat(e.target.value) || 0)}
              min="0"
              placeholder="525000"
            />
          </div>
        </div>

        {/* Liabilities */}
        <div className="mb-6">
          <h4 className="text-md font-medium text-gray-800 mb-3">Liabilities</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Total Liabilities"
              type="number"
              value={localProfile.totalLiabilities || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('totalLiabilities', parseFloat(e.target.value) || 0)}
              min="0"
              placeholder="200000"
            />
            
            <div className="flex items-center">
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Net Worth
                </label>
                <div className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-gray-900">
                  {formatCurrency(localProfile.netWorth || 0)}
                </div>
                <p className="text-xs text-gray-500 mt-1">Automatically calculated</p>
              </div>
            </div>
          </div>
        </div>

        {/* Income & Expenditure */}
        <div>
          <h4 className="text-md font-medium text-gray-800 mb-3">Monthly Income & Expenditure</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              label="Monthly Income"
              type="number"
              value={localProfile.monthlyIncome || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('monthlyIncome', parseFloat(e.target.value) || 0)}
              min="0"
              placeholder="5000"
            />
            
            <Input
              label="Monthly Expenditure"
              type="number"
              value={localProfile.monthlyExpenditure || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('monthlyExpenditure', parseFloat(e.target.value) || 0)}
              min="0"
              placeholder="3500"
            />
            
            <div className="flex items-center">
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Disposable Income
                </label>
                <div className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2.5 text-sm text-gray-900">
                  {formatCurrency(localProfile.disposableIncome || 0)}
                </div>
                <p className="text-xs text-gray-500 mt-1">Automatically calculated</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-red-800 mb-2">Please correct the following errors:</h4>
          <ul className="text-sm text-red-700 space-y-1">
            {errors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

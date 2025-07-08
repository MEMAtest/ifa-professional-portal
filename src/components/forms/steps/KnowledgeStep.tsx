// src/components/forms/steps/KnowledgeStep.tsx - Knowledge and experience assessment
'use client'
import { useState } from 'react'
import { Input } from '@/components/ui/Input'

interface KnowledgeExperience {
  investmentKnowledge: 'basic' | 'good' | 'advanced' | 'expert';
  investmentExperience: number;
  productKnowledge: {
    shares: boolean;
    bonds: boolean;
    funds: boolean;
    derivatives: boolean;
    alternatives: boolean;
  };
  advisorReliance: 'low' | 'medium' | 'high';
  educationRequired: boolean;
  notes: string;
}

interface KnowledgeStepProps {
  knowledgeExperience: KnowledgeExperience
  onChange: (updates: Partial<KnowledgeExperience>) => void
  errors: string[]
}

export const KnowledgeStep = ({ knowledgeExperience, onChange, errors }: KnowledgeStepProps) => {
  const [localKnowledge, setLocalKnowledge] = useState(knowledgeExperience)

  const handleChange = (field: keyof KnowledgeExperience, value: any) => {
    const updates = { ...localKnowledge, [field]: value }
    setLocalKnowledge(updates)
    onChange(updates)
  }

  const handleProductKnowledgeChange = (product: string, checked: boolean) => {
    const updates = {
      ...localKnowledge,
      productKnowledge: {
        ...localKnowledge.productKnowledge,
        [product]: checked
      }
    }
    setLocalKnowledge(updates)
    onChange(updates)
  }

  return (
    <div className="space-y-6">
      {/* Investment Knowledge */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Investment Knowledge Level</h3>
        <div className="space-y-4">
          {[
            { value: 'basic', label: 'Basic', description: 'Limited understanding of investments' },
            { value: 'good', label: 'Good', description: 'Sound understanding of basic investment concepts' },
            { value: 'advanced', label: 'Advanced', description: 'Comprehensive knowledge of investment strategies' },
            { value: 'expert', label: 'Expert', description: 'Professional-level investment expertise' }
          ].map((option) => (
            <div
              key={option.value}
              className={`border rounded-lg p-4 cursor-pointer transition-all ${
                localKnowledge.investmentKnowledge === option.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => handleChange('investmentKnowledge', option.value)}
            >
              <div className="flex items-start space-x-3">
                <input
                  type="radio"
                  checked={localKnowledge.investmentKnowledge === option.value}
                  onChange={() => {}}
                  className="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div>
                  <h4 className="text-sm font-medium text-gray-900">{option.label}</h4>
                  <p className="text-sm text-gray-600 mt-1">{option.description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Investment Experience */}
      <div>
        <Input
          label="Years of Investment Experience"
          type="number"
          value={localKnowledge.investmentExperience || ''}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
            handleChange('investmentExperience', parseInt(e.target.value) || 0)
          }
          min="0"
          max="50"
          placeholder="5"
        />
      </div>

      {/* Product Knowledge */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Product Knowledge</h3>
        <div className="space-y-3">
          {[
            { key: 'shares', label: 'Shares/Equities' },
            { key: 'bonds', label: 'Bonds/Fixed Income' },
            { key: 'funds', label: 'Investment Funds' },
            { key: 'derivatives', label: 'Derivatives' },
            { key: 'alternatives', label: 'Alternative Investments' }
          ].map((product) => (
            <div key={product.key} className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={localKnowledge.productKnowledge[product.key as keyof typeof localKnowledge.productKnowledge]}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
                  handleProductKnowledgeChange(product.key, e.target.checked)
                }
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label className="text-sm font-medium text-gray-700">
                {product.label}
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Advisor Reliance */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Reliance on Financial Advisor
        </label>
        <select
          value={localKnowledge.advisorReliance}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => 
            handleChange('advisorReliance', e.target.value)
          }
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
        >
          <option value="low">Low - Make own investment decisions</option>
          <option value="medium">Medium - Joint decision making</option>
          <option value="high">High - Rely heavily on advisor recommendations</option>
        </select>
      </div>

      {/* Education Required */}
      <div>
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={localKnowledge.educationRequired}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => 
              handleChange('educationRequired', e.target.checked)
            }
            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <label className="text-sm font-medium text-gray-700">
            Additional investment education required
          </label>
        </div>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Additional Notes
        </label>
        <textarea
          value={localKnowledge.notes}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => 
            handleChange('notes', e.target.value)
          }
          rows={3}
          className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
          placeholder="Any additional notes about client's investment knowledge..."
        />
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
// src/components/forms/steps/RiskProfileStep.tsx - Comprehensive risk assessment
'use client'
import { useState, useEffect } from 'react'
import { RiskProfile, FinancialProfile } from '@/types'
import { TrendingUp, Shield, AlertTriangle, Info } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'

interface RiskProfileStepProps {
  riskProfile: RiskProfile
  financialProfile: FinancialProfile
  onChange: (updates: Partial<RiskProfile>) => void
  errors: string[]
}

export const RiskProfileStep = ({ riskProfile, financialProfile, onChange, errors }: RiskProfileStepProps) => {
  const [localProfile, setLocalProfile] = useState(riskProfile)
  const [emergencyMonths, setEmergencyMonths] = useState(0)

  // Calculate emergency fund coverage
  useEffect(() => {
    if (financialProfile.emergencyFund && financialProfile.monthlyExpenditure) {
      const months = Math.floor(financialProfile.emergencyFund / financialProfile.monthlyExpenditure)
      setEmergencyMonths(months)
      
      const updates = { ...localProfile, emergencyMonths: months }
      setLocalProfile(updates)
      onChange(updates)
    }
  }, [financialProfile.emergencyFund, financialProfile.monthlyExpenditure, localProfile, onChange])

  const handleChange = (field: keyof RiskProfile, value: number | string) => {
    const updates = { ...localProfile, [field]: value }
    
    // Auto-calculate final risk profile when both ATR and CFL are set
    if (field === 'attitudeToRisk' || field === 'capacityForLoss') {
      if (updates.attitudeToRisk && updates.capacityForLoss) {
        // Conservative approach - take the lower of ATR and CFL
        const finalRisk = Math.min(updates.attitudeToRisk, updates.capacityForLoss)
        updates.finalRiskProfile = finalRisk
        updates.riskReconciliation = generateRiskReconciliation(
          updates.attitudeToRisk, 
          updates.capacityForLoss, 
          finalRisk
        )
      }
    }
    
    setLocalProfile(updates)
    onChange(updates)
  }

  const generateRiskReconciliation = (atr: number, cfl: number, final: number): string => {
    if (atr === cfl) {
      return `Risk profile aligned: ATR ${atr} matches CFL ${cfl}`
    }
    const difference = Math.abs(atr - cfl)
    if (difference === 1) {
      return `Minor difference reconciled: ATR ${atr}, CFL ${cfl}, Final ${final} (conservative approach)`
    }
    return `Significant difference: ATR ${atr}, CFL ${cfl}, Final ${final} (took lower value for client protection)`
  }

  const getRiskDescription = (level: number): string => {
    const descriptions = {
      1: 'Very Low Risk - Capital preservation priority',
      2: 'Low Risk - Minimal volatility tolerance',
      3: 'Low-Medium Risk - Some growth with stability',
      4: 'Medium Risk - Balanced approach',
      5: 'Medium-High Risk - Growth focus with volatility',
      6: 'High Risk - Aggressive growth strategy',
      7: 'Very High Risk - Maximum growth potential'
    }
    return descriptions[level as keyof typeof descriptions] || 'Please select a risk level'
  }

  const getRiskColor = (level: number): string => {
    if (level <= 2) return 'text-green-600'
    if (level <= 4) return 'text-yellow-600'
    if (level <= 6) return 'text-orange-600'
    return 'text-red-600'
  }

  const getEmergencyFundStatus = (months: number): { color: string; text: string; icon: any } => {
    if (months >= 6) return { color: 'text-green-600', text: 'Excellent', icon: Shield }
    if (months >= 3) return { color: 'text-yellow-600', text: 'Adequate', icon: Info }
    return { color: 'text-red-600', text: 'Insufficient', icon: AlertTriangle }
  }

  const riskLevels = Array.from({ length: 7 }, (_, i) => i + 1)
  const emergencyStatus = getEmergencyFundStatus(emergencyMonths)
  const EmergencyIcon = emergencyStatus.icon

  return (
    <div className="space-y-6">
      {/* Attitude to Risk */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-blue-600" />
            <span>Attitude to Risk Assessment</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Risk Tolerance Level <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {riskLevels.map(level => (
                  <div
                    key={level}
                    className={`border rounded-lg p-3 cursor-pointer transition-all ${
                      localProfile.attitudeToRisk === level
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleChange('attitudeToRisk', level)}
                  >
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        checked={localProfile.attitudeToRisk === level}
                        onChange={() => {}}
                        className="h-4 w-4 text-blue-600"
                      />
                      <span className="font-medium">{level}</span>
                    </div>
                    <p className={`text-xs mt-1 ${getRiskColor(level)}`}>
                      {getRiskDescription(level)}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {localProfile.attitudeToRisk && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-blue-800">Selected Risk Level: {localProfile.attitudeToRisk}</h4>
                <p className={`text-sm mt-1 ${getRiskColor(localProfile.attitudeToRisk)}`}>
                  {getRiskDescription(localProfile.attitudeToRisk)}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Capacity for Loss */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="h-5 w-5 text-green-600" />
            <span>Capacity for Loss Assessment</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Emergency Fund Analysis */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-gray-800">Emergency Fund Analysis</h4>
                <div className="flex items-center space-x-1">
                  <EmergencyIcon className={`h-4 w-4 ${emergencyStatus.color}`} />
                  <span className={`text-sm font-medium ${emergencyStatus.color}`}>
                    {emergencyStatus.text}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Emergency Fund</p>
                  <p className="font-medium">£{financialProfile.emergencyFund?.toLocaleString() || 0}</p>
                </div>
                <div>
                  <p className="text-gray-600">Monthly Expenses</p>
                  <p className="font-medium">£{financialProfile.monthlyExpenditure?.toLocaleString() || 0}</p>
                </div>
                <div>
                  <p className="text-gray-600">Coverage</p>
                  <p className="font-medium">{emergencyMonths} months</p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Capacity for Loss Level <span className="text-red-500">*</span>
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {riskLevels.map(level => (
                  <div
                    key={level}
                    className={`border rounded-lg p-3 cursor-pointer transition-all ${
                      localProfile.capacityForLoss === level
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => handleChange('capacityForLoss', level)}
                  >
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        checked={localProfile.capacityForLoss === level}
                        onChange={() => {}}
                        className="h-4 w-4 text-green-600"
                      />
                      <span className="font-medium">{level}</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      {level <= 2 ? 'Low capacity' : level <= 4 ? 'Moderate capacity' : 'High capacity'}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Maximum Acceptable Loss (%)
              </label>
              <select
                value={localProfile.maxAcceptableLoss || ''}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleChange('maxAcceptableLoss', parseFloat(e.target.value) || 0)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select maximum loss tolerance</option>
                <option value="5">5% - Very conservative</option>
                <option value="10">10% - Conservative</option>
                <option value="15">15% - Moderate</option>
                <option value="20">20% - Balanced</option>
                <option value="25">25% - Aggressive</option>
                <option value="30">30% - Very aggressive</option>
                <option value="40">40%+ - Speculative</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Risk Profile Reconciliation */}
      {localProfile.attitudeToRisk && localProfile.capacityForLoss && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <span>Risk Profile Reconciliation</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-blue-50 rounded-lg p-3">
                  <p className="text-sm text-gray-600">Attitude to Risk</p>
                  <p className="text-2xl font-bold text-blue-600">{localProfile.attitudeToRisk}</p>
                </div>
                <div className="bg-green-50 rounded-lg p-3">
                  <p className="text-sm text-gray-600">Capacity for Loss</p>
                  <p className="text-2xl font-bold text-green-600">{localProfile.capacityForLoss}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-600">Final Risk Profile</p>
                  <p className="text-2xl font-bold text-gray-900">{localProfile.finalRiskProfile}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Risk Reconciliation Notes
                </label>
                <textarea
                  value={localProfile.riskReconciliation}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleChange('riskReconciliation', e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  placeholder="Explain the final risk profile decision..."
                />
              </div>

              {Math.abs(localProfile.attitudeToRisk - localProfile.capacityForLoss) > 1 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-amber-800">Risk Mismatch Detected</h4>
                      <p className="text-sm text-amber-700 mt-1">
                        Significant difference between attitude to risk and capacity for loss. 
                        Consider additional client discussion and risk mitigation strategies.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

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

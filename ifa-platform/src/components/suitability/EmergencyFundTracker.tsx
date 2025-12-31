// =====================================================
// FILE: src/components/suitability/EmergencyFundTracker.tsx
// EMERGENCY FUND ANALYSIS AND RECOMMENDATIONS
// =====================================================

import React, { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Progress } from '@/components/ui/Progress'
import { Alert, AlertDescription } from '@/components/ui/Alert'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { 
  Shield, AlertTriangle, CheckCircle, TrendingUp, 
  Calculator, Info, Target, PiggyBank
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface EmergencyFundTrackerProps {
  currentFund: number
  monthlyExpenditure: number
  annualIncome: number
  dependents?: number
  employmentStatus?: string
  riskProfile?: string
  onUpdateFund?: (newAmount: number) => void
  className?: string
}

export const EmergencyFundTracker: React.FC<EmergencyFundTrackerProps> = ({
  currentFund,
  monthlyExpenditure,
  annualIncome,
  dependents = 0,
  employmentStatus = 'employed',
  riskProfile = 'medium',
  onUpdateFund,
  className
}) => {
  // Calculate recommended emergency fund based on circumstances
  const calculations = useMemo(() => {
    // Base recommendation
    let recommendedMonths = 6
    
    // Adjust based on employment stability
    if (employmentStatus === 'self_employed' || employmentStatus === 'contractor') {
      recommendedMonths += 3
    } else if (employmentStatus === 'retired') {
      recommendedMonths -= 2
    }
    
    // Adjust based on dependents
    recommendedMonths += Math.min(dependents, 3) // Add 1 month per dependent, max 3
    
    // Adjust based on risk profile
    if (riskProfile === 'high' || riskProfile === 'very_high') {
      recommendedMonths += 2
    } else if (riskProfile === 'low' || riskProfile === 'very_low') {
      recommendedMonths -= 1
    }
    
    // Ensure reasonable bounds
    recommendedMonths = Math.max(3, Math.min(12, recommendedMonths))
    
    const recommendedAmount = monthlyExpenditure * recommendedMonths
    const currentMonthsCovered = monthlyExpenditure > 0 
      ? Math.floor(currentFund / monthlyExpenditure) 
      : 0
    const shortfall = Math.max(0, recommendedAmount - currentFund)
    const surplus = Math.max(0, currentFund - recommendedAmount)
    const percentageComplete = recommendedAmount > 0 
      ? Math.min(100, Math.round((currentFund / recommendedAmount) * 100))
      : 0
    
    // Calculate monthly savings needed to reach target in 1 year
    const monthlySavingsNeeded = shortfall > 0 ? Math.ceil(shortfall / 12) : 0
    
    // Status determination
    let status: 'critical' | 'low' | 'adequate' | 'good' | 'excellent'
    if (currentMonthsCovered < 1) {
      status = 'critical'
    } else if (currentMonthsCovered < 3) {
      status = 'low'
    } else if (currentMonthsCovered < recommendedMonths) {
      status = 'adequate'
    } else if (currentMonthsCovered === recommendedMonths) {
      status = 'good'
    } else {
      status = 'excellent'
    }
    
    return {
      recommendedMonths,
      recommendedAmount,
      currentMonthsCovered,
      shortfall,
      surplus,
      percentageComplete,
      monthlySavingsNeeded,
      status
    }
  }, [currentFund, monthlyExpenditure, dependents, employmentStatus, riskProfile])
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'text-red-600 bg-red-50 border-red-200'
      case 'low': return 'text-orange-600 bg-orange-50 border-orange-200'
      case 'adequate': return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'good': return 'text-green-600 bg-green-50 border-green-200'
      case 'excellent': return 'text-blue-600 bg-blue-50 border-blue-200'
      default: return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }
  
  const getProgressColor = (percentage: number) => {
    if (percentage < 25) return 'bg-red-500'
    if (percentage < 50) return 'bg-orange-500'
    if (percentage < 75) return 'bg-yellow-500'
    if (percentage < 100) return 'bg-green-500'
    return 'bg-blue-500'
  }
  
  return (
    <div className={cn("space-y-4", className)}>
      {/* Main Status Card */}
      <Card className={cn("border-2", getStatusColor(calculations.status))}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Emergency Fund Status
            </span>
            <Badge 
              variant="outline" 
              className={cn("capitalize", getStatusColor(calculations.status))}
            >
              {calculations.status}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Progress Bar */}
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm">
              <span>Coverage: {calculations.currentMonthsCovered} months</span>
              <span>Target: {calculations.recommendedMonths} months</span>
            </div>
            <Progress 
              value={calculations.percentageComplete} 
              className="h-3"
              indicatorClassName={getProgressColor(calculations.percentageComplete)}
            />
            <p className="text-xs text-gray-600 text-center">
              {calculations.percentageComplete}% of recommended amount
            </p>
          </div>
          
          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div className="p-3 bg-white rounded-lg border">
              <p className="text-xs text-gray-500 mb-1">Current Fund</p>
              <p className="text-lg font-semibold">£{currentFund.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-white rounded-lg border">
              <p className="text-xs text-gray-500 mb-1">Recommended</p>
              <p className="text-lg font-semibold">£{calculations.recommendedAmount.toLocaleString()}</p>
            </div>
          </div>
          
          {/* Status Message */}
          {calculations.status === 'critical' && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription>
                <span className="font-medium text-red-800">
                  Critical: Less than 1 month of expenses covered. 
                  Building an emergency fund should be your top priority.
                </span>
              </AlertDescription>
            </Alert>
          )}
          
          {calculations.status === 'low' && (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription>
                <span className="font-medium text-orange-800">
                  Low Coverage: Only {calculations.currentMonthsCovered} months covered. 
                  Aim for at least 3 months before investing.
                </span>
              </AlertDescription>
            </Alert>
          )}
          
          {calculations.shortfall > 0 && (
            <Alert className="border-yellow-200 bg-yellow-50">
              <Info className="h-4 w-4 text-yellow-600" />
              <AlertDescription>
                <span className="text-yellow-800">
                  You need £{calculations.shortfall.toLocaleString()} more to reach your target. 
                  Save £{calculations.monthlySavingsNeeded.toLocaleString()}/month to achieve this in 1 year.
                </span>
              </AlertDescription>
            </Alert>
          )}
          
          {calculations.status === 'excellent' && calculations.surplus > 0 && (
            <Alert className="border-blue-200 bg-blue-50">
              <CheckCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription>
                <span className="text-blue-800">
                  Excellent! You have £{calculations.surplus.toLocaleString()} above the recommended amount. 
                  Consider investing the surplus.
                </span>
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
      
      {/* Recommendations Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="h-4 w-4" />
            Personalized Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Recommendation based on employment */}
            {employmentStatus === 'self_employed' && (
              <div className="flex items-start gap-2">
                <TrendingUp className="h-4 w-4 text-blue-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Self-Employment Buffer</p>
                  <p className="text-xs text-gray-600">
                    As self-employed, maintain {calculations.recommendedMonths} months 
                    to account for income variability
                  </p>
                </div>
              </div>
            )}
            
            {/* Recommendation based on dependents */}
            {dependents > 0 && (
              <div className="flex items-start gap-2">
                <Shield className="h-4 w-4 text-green-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Family Protection</p>
                  <p className="text-xs text-gray-600">
                    With {dependents} dependent{dependents > 1 ? 's' : ''}, 
                    your target includes additional months for family security
                  </p>
                </div>
              </div>
            )}
            
            {/* Savings strategy */}
            {calculations.monthlySavingsNeeded > 0 && (
              <div className="flex items-start gap-2">
                <PiggyBank className="h-4 w-4 text-purple-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium">Savings Plan</p>
                  <p className="text-xs text-gray-600">
                    Set up automatic transfer of £{calculations.monthlySavingsNeeded}/month 
                    to reach your target in 12 months
                  </p>
                </div>
              </div>
            )}
          </div>
          
          {/* Quick Actions */}
          {onUpdateFund && (
            <div className="mt-4 pt-4 border-t flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => onUpdateFund(calculations.recommendedAmount)}
                className="flex-1"
              >
                <Calculator className="h-4 w-4 mr-1" />
                Set to Target
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  const threeMonths = monthlyExpenditure * 3
                  onUpdateFund(threeMonths)
                }}
                className="flex-1"
              >
                Set to Minimum
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Educational Info */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Why Emergency Funds Matter</p>
              <ul className="space-y-1 text-xs">
                <li>• Protects against unexpected job loss or income reduction</li>
                <li>• Covers unforeseen expenses without debt or liquidating investments</li>
                <li>• Provides peace of mind and financial stability</li>
                <li>• Should be kept in instant-access savings, not invested</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default EmergencyFundTracker

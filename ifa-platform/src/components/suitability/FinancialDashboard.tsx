// =====================================================
// FILE: src/components/suitability/FinancialDashboard.tsx
// COMPLETE FINANCIAL DASHBOARD WITH ALL FEATURES
// =====================================================

import React, { useMemo, useState } from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Progress } from '@/components/ui/Progress'
import { Alert, AlertDescription } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { 
  PoundSterling, TrendingUp, TrendingDown, AlertTriangle, 
  PiggyBank, Calculator, Target, Shield, Activity,
  BarChart3, PieChart as PieChartIcon, Eye, EyeOff
} from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts'
import { SuitabilityFormData, PulledPlatformData } from '@/types/suitability'
import { cn } from '@/lib/utils'

// Import the new components
import { EmergencyFundTracker } from './EmergencyFundTracker'
import { ExpenseBreakdownTable } from './ExpenseBreakdownTable'

interface FinancialDashboardProps {
  formData: SuitabilityFormData
  pulledData: PulledPlatformData
  onUpdateField: (fieldId: string, value: any) => void
  className?: string
}

// Helper components
const MetricCard: React.FC<{
  title: string
  value: string
  icon: React.ElementType
  status?: 'positive' | 'negative' | 'warning'
  subtitle?: string
}> = ({ title, value, icon: Icon, status, subtitle }) => {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm text-gray-500">{title}</p>
            <p className={cn(
              "text-2xl font-bold mt-1",
              status === 'positive' && "text-green-600",
              status === 'negative' && "text-red-600",
              status === 'warning' && "text-yellow-600"
            )}>
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-gray-400 mt-1">{subtitle}</p>
            )}
          </div>
          <Icon className={cn(
            "h-5 w-5",
            status === 'positive' && "text-green-500",
            status === 'negative' && "text-red-500",
            status === 'warning' && "text-yellow-500",
            !status && "text-gray-400"
          )} />
        </div>
      </CardContent>
    </Card>
  )
}

const SummaryRow: React.FC<{
  label: string
  value: string
  status?: 'positive' | 'negative'
}> = ({ label, value, status }) => {
  return (
    <div className="flex justify-between items-center py-2 border-b last:border-0">
      <span className="text-sm text-gray-600">{label}</span>
      <span className={cn(
        "text-sm font-medium",
        status === 'positive' && "text-green-600",
        status === 'negative' && "text-red-600"
      )}>
        {value}
      </span>
    </div>
  )
}

export const FinancialDashboard: React.FC<FinancialDashboardProps> = ({
  formData,
  pulledData,
  onUpdateField,
  className
}) => {
  const [showDetails, setShowDetails] = useState(false)
  const [activeTab, setActiveTab] = useState('overview')
  
  // Extract expense categories from form data if available
  const expenseCategories = formData.financial_situation?.expense_categories || []
  
  // Real-time calculations
  const calculations = useMemo(() => {
    const financial = formData.financial_situation as any

    const num = (value: unknown): number | undefined => {
      if (value === null || value === undefined) return undefined
      if (typeof value === 'number') return Number.isNaN(value) ? undefined : value
      if (typeof value === 'string') {
        const trimmed = value.trim()
        if (!trimmed) return undefined
        const parsed = Number(trimmed.replace(/,/g, ''))
        return Number.isNaN(parsed) ? undefined : parsed
      }
      return undefined
    }

    const annualIncome =
      num(financial.income_total) ??
      num(financial.annual_income) ??
      0

    const essentialAnnual =
      num(financial.exp_total_essential) ??
      (num(financial.monthly_expenses) !== undefined ? (num(financial.monthly_expenses) as number) * 12 : undefined) ??
      0

    const discretionaryAnnual = num(financial.exp_total_discretionary) ?? 0
    const annualExpenditure = essentialAnnual + discretionaryAnnual

    const monthlyExpenditure =
      num(financial.monthly_expenses) ??
      (annualExpenditure > 0 ? Math.round(annualExpenditure / 12) : 0)

    const disposableIncome = annualIncome - annualExpenditure

    const liquidAssets =
      num(financial.savings) ??
      num(financial.liquid_assets) ??
      0

    const propertyValue = num(financial.property_value) ?? 0
    const mortgage = num(financial.mortgage_outstanding) ?? num(financial.outstanding_mortgage) ?? 0
    const otherLiabilities = num(financial.other_debts) ?? num(financial.other_liabilities) ?? 0
    const emergencyFund = num(financial.emergency_fund) ?? 0
    
    const totalAssets = liquidAssets + propertyValue
    const totalLiabilities = mortgage + otherLiabilities
    const netWorth = totalAssets - totalLiabilities
    
    const emergencyFundMonths = monthlyExpenditure > 0 
      ? Math.floor(emergencyFund / monthlyExpenditure) 
      : 0
    
    const recommendedEmergencyFund = monthlyExpenditure * 6
    const emergencyFundShortfall = Math.max(0, recommendedEmergencyFund - emergencyFund)
    
    const savingsRate = annualIncome > 0 
      ? Math.round((disposableIncome / annualIncome) * 100) 
      : 0
    
    const investmentCapacity = disposableIncome > 0 
      ? Math.round(disposableIncome * 0.8) 
      : 0
    
    return {
      annualIncome,
      monthlyIncome: Math.round(annualIncome / 12),
      monthlyExpenditure,
      annualExpenditure,
      disposableIncome,
      liquidAssets,
      propertyValue,
      mortgage,
      otherLiabilities,
      totalAssets,
      totalLiabilities,
      netWorth,
      emergencyFund,
      emergencyFundMonths,
      recommendedEmergencyFund,
      emergencyFundShortfall,
      savingsRate,
      investmentCapacity
    }
  }, [formData.financial_situation])
  
  // Status indicators
  const financialHealth = useMemo(() => {
    const { disposableIncome, emergencyFundMonths, savingsRate } = calculations
    
    let status: 'excellent' | 'good' | 'moderate' | 'poor' = 'moderate'
    let score = 0
    
    if (disposableIncome > 0) score += 25
    if (emergencyFundMonths >= 6) score += 25
    if (savingsRate >= 20) score += 25
    if (calculations.netWorth > 0) score += 25
    
    if (score >= 75) status = 'excellent'
    else if (score >= 50) status = 'good'
    else if (score >= 25) status = 'moderate'
    else status = 'poor'
    
    return { status, score }
  }, [calculations])
  
  // Chart data
  const incomeExpenseData = [
    { name: 'Income', value: calculations.annualIncome, fill: '#10B981' },
    { name: 'Expenses', value: calculations.annualExpenditure, fill: '#EF4444' },
    { name: 'Surplus', value: Math.max(0, calculations.disposableIncome), fill: '#3B82F6' }
  ]
  
  const netWorthData = [
    { name: 'Liquid', value: calculations.liquidAssets, fill: '#10B981' },
    { name: 'Property', value: Math.max(0, calculations.propertyValue - calculations.mortgage), fill: '#3B82F6' },
    { name: 'Liabilities', value: calculations.totalLiabilities, fill: '#EF4444' }
  ]
  
  const monthlyBudgetData = Array.from({ length: 12 }, (_, i) => ({
    month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i],
    income: calculations.monthlyIncome,
    expenses: calculations.monthlyExpenditure,
    surplus: Math.round(calculations.disposableIncome / 12)
  }))
  
  // Handle updating expense categories
  const handleUpdateCategories = (categories: any[]) => {
    onUpdateField('expense_categories', categories)
    // Calculate total from categories and update monthly expenses (legacy dashboard helper)
    const total = categories.reduce((sum, cat) => sum + cat.amount, 0)
    if (Number.isFinite(total) && total !== calculations.monthlyExpenditure) onUpdateField('monthly_expenses', total)
  }
  
  return (
    <div className={cn("space-y-6", className)}>
      {/* Financial Health Score */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Financial Health Score</h3>
            <Badge 
              variant={
                financialHealth.status === 'excellent' ? 'success' :
                financialHealth.status === 'good' ? 'default' :
                financialHealth.status === 'moderate' ? 'warning' : 'destructive'
              }
              className="text-lg px-3 py-1"
            >
              {financialHealth.score}/100
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Progress 
            value={financialHealth.score} 
            className={cn(
              "h-4",
              financialHealth.status === 'excellent' && "bg-green-100",
              financialHealth.status === 'good' && "bg-blue-100",
              financialHealth.status === 'moderate' && "bg-yellow-100",
              financialHealth.status === 'poor' && "bg-red-100"
            )}
          />
          <p className="text-sm text-gray-600 mt-2">
            Status: <span className="font-medium capitalize">{financialHealth.status}</span>
          </p>
          
          <div className="mt-4 flex justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
              {showDetails ? 'Hide' : 'Show'} Details
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="emergency">Emergency Fund</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="projections">Projections</TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Monthly Surplus"
              value={`£${Math.round(calculations.disposableIncome / 12).toLocaleString()}`}
              icon={calculations.disposableIncome >= 0 ? TrendingUp : TrendingDown}
              status={calculations.disposableIncome >= 0 ? 'positive' : 'negative'}
            />
            <MetricCard
              title="Net Worth"
              value={`£${calculations.netWorth.toLocaleString()}`}
              icon={Target}
              status={calculations.netWorth > 0 ? 'positive' : 'negative'}
            />
            <MetricCard
              title="Savings Rate"
              value={`${calculations.savingsRate}%`}
              icon={PiggyBank}
              status={calculations.savingsRate >= 20 ? 'positive' : calculations.savingsRate >= 10 ? 'warning' : 'negative'}
            />
            <MetricCard
              title="Investment Capacity"
              value={`£${calculations.investmentCapacity.toLocaleString()}`}
              icon={TrendingUp}
              status={calculations.investmentCapacity > 0 ? 'positive' : 'negative'}
              subtitle="Annual"
            />
          </div>
          
          {/* Warnings and Alerts */}
          {calculations.disposableIncome < 0 && (
            <Alert className="border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription>
                <span className="font-medium text-red-800">
                  Budget Deficit: Expenses exceed income by £{Math.abs(calculations.disposableIncome).toLocaleString()} annually.
                </span>
              </AlertDescription>
            </Alert>
          )}
          
          {calculations.emergencyFundMonths < 3 && (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription>
                <span className="font-medium text-orange-800">
                  Low Emergency Fund: Only {calculations.emergencyFundMonths} months covered. Build to 3-6 months before investing.
                </span>
              </AlertDescription>
            </Alert>
          )}
          
          {/* Charts */}
          {showDetails && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Income vs Expenses */}
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold">Annual Cash Flow</h3>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={incomeExpenseData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip formatter={(value: any) => `£${value.toLocaleString()}`} />
                      <Bar dataKey="value" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              
              {/* Net Worth Breakdown */}
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold">Net Worth Breakdown</h3>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={netWorthData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: £${value.toLocaleString()}`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {netWorthData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => `£${value.toLocaleString()}`} />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
        
        {/* Emergency Fund Tab */}
        <TabsContent value="emergency">
          <EmergencyFundTracker
            currentFund={calculations.emergencyFund}
            monthlyExpenditure={calculations.monthlyExpenditure}
            annualIncome={calculations.annualIncome}
            dependents={formData.personal_information?.dependents}
            employmentStatus={formData.personal_information?.employment_status}
            riskProfile={formData.risk_assessment?.attitude_to_risk}
            onUpdateFund={(newAmount) => onUpdateField('emergency_fund', newAmount)}
          />
        </TabsContent>
        
        {/* Expenses Tab */}
        <TabsContent value="expenses">
          <ExpenseBreakdownTable
            monthlyIncome={calculations.monthlyIncome}
            categories={expenseCategories}
            onUpdateCategories={handleUpdateCategories}
            showBenchmarks={true}
            editable={true}
          />
        </TabsContent>
        
        {/* Projections Tab */}
        <TabsContent value="projections" className="space-y-6">
          {/* Monthly Cash Flow Projection */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">12-Month Cash Flow Projection</h3>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={monthlyBudgetData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip formatter={(value: any) => `£${value.toLocaleString()}`} />
                  <Legend />
                  <Line type="monotone" dataKey="income" stroke="#10B981" name="Income" />
                  <Line type="monotone" dataKey="expenses" stroke="#EF4444" name="Expenses" />
                  <Line type="monotone" dataKey="surplus" stroke="#3B82F6" name="Surplus" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
          
          {/* Summary Table */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">Financial Summary</h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <SummaryRow label="Annual Income" value={`£${calculations.annualIncome.toLocaleString()}`} />
                <SummaryRow label="Annual Expenses" value={`£${calculations.annualExpenditure.toLocaleString()}`} />
                <SummaryRow 
                  label="Annual Surplus/Deficit" 
                  value={`£${Math.abs(calculations.disposableIncome).toLocaleString()}`}
                  status={calculations.disposableIncome >= 0 ? 'positive' : 'negative'}
                />
                <div className="border-t pt-2 mt-2">
                  <SummaryRow label="Total Assets" value={`£${calculations.totalAssets.toLocaleString()}`} />
                  <SummaryRow label="Total Liabilities" value={`£${calculations.totalLiabilities.toLocaleString()}`} />
                  <SummaryRow 
                    label="Net Worth" 
                    value={`£${calculations.netWorth.toLocaleString()}`}
                    status={calculations.netWorth >= 0 ? 'positive' : 'negative'}
                  />
                </div>
                <div className="border-t pt-2 mt-2">
                  <SummaryRow label="Emergency Fund" value={`£${calculations.emergencyFund.toLocaleString()}`} />
                  <SummaryRow label="Coverage" value={`${calculations.emergencyFundMonths} months`} />
                  <SummaryRow 
                    label="Shortfall/Surplus" 
                    value={`£${Math.abs(calculations.emergencyFundShortfall || 0).toLocaleString()}`}
                    status={calculations.emergencyFundShortfall <= 0 ? 'positive' : 'negative'}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* 5-Year Projection */}
          <Card>
            <CardHeader>
              <h3 className="text-lg font-semibold">5-Year Financial Projection</h3>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map(year => {
                  const projectedNetWorth = calculations.netWorth + (calculations.disposableIncome * year)
                  const projectedEmergency = calculations.emergencyFund + (calculations.disposableIncome * 0.1 * year)
                  
                  return (
                    <div key={year} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-medium">Year {year}</span>
                        <Badge variant="outline">{new Date().getFullYear() + year}</Badge>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500">Projected Net Worth:</span>
                          <p className="font-medium">£{projectedNetWorth.toLocaleString()}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">Emergency Fund:</span>
                          <p className="font-medium">£{Math.round(projectedEmergency).toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default FinancialDashboard

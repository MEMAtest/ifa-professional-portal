// =====================================================
// FILE: src/components/suitability/FinancialDashboard.tsx
// COMPLETE FINANCIAL DASHBOARD WITH ALL FEATURES
// =====================================================

import React, { useEffect, useMemo, useState } from 'react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Progress } from '@/components/ui/Progress'
import { Alert, AlertDescription } from '@/components/ui/Alert'
import { Button } from '@/components/ui/Button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { Skeleton } from '@/components/ui/Skeleton'
import { 
  PoundSterling, TrendingUp, TrendingDown, AlertTriangle, 
  PiggyBank, Calculator, Target, Shield, Activity,
  BarChart3, PieChart as PieChartIcon, Eye, EyeOff
} from 'lucide-react'
import {
  ComposedChart, Line, Area, LineChart, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine
} from 'recharts'
import { SuitabilityFormData, PulledPlatformData } from '@/types/suitability'
import { cn } from '@/lib/utils'

// Import the new components
import { EmergencyFundTracker } from './EmergencyFundTracker'
import { ExpenseBreakdownTable } from './ExpenseBreakdownTable'

const DEFAULT_PROJECTION_ASSUMPTIONS = {
  incomeGrowth: 2.5,
  expenseInflation: 2.0,
  investmentReturn: 5.0,
  savingsRate: 60
}

const PROJECTION_SCENARIOS = {
  conservative: { label: 'Conservative', returnOffset: -1.5, volatility: 6 },
  balanced: { label: 'Balanced', returnOffset: 0, volatility: 10 },
  aggressive: { label: 'Aggressive', returnOffset: 1.5, volatility: 14 }
} as const

const PROJECTION_HORIZONS = [10, 20, 30] as const
const DEFAULT_STATE_PENSION_AGE = 67
const MORTGAGE_PAYOFF_ASSUMED_YEARS = 25

const SCENARIO_COLORS = {
  conservative: '#3B82F6',
  balanced: '#10B981',
  aggressive: '#F59E0B'
} as const

type ProjectionScenarioKey = keyof typeof PROJECTION_SCENARIOS
type ProjectionHorizon = typeof PROJECTION_HORIZONS[number]

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

const parseNumber = (value: unknown): number | undefined => {
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

const formatCurrency = (value: number) => `£${Math.round(value).toLocaleString()}`

const resolveAge = (ageValue?: unknown, dob?: string) => {
  const parsedAge = parseNumber(ageValue)
  if (Number.isFinite(parsedAge)) return Math.max(0, Math.floor(parsedAge as number))
  if (!dob) return undefined
  const parsedDob = new Date(dob)
  if (Number.isNaN(parsedDob.getTime())) return undefined
  const today = new Date()
  let age = today.getFullYear() - parsedDob.getFullYear()
  const hasBirthday =
    today.getMonth() > parsedDob.getMonth() ||
    (today.getMonth() === parsedDob.getMonth() && today.getDate() >= parsedDob.getDate())
  if (!hasBirthday) age -= 1
  return age >= 0 ? age : undefined
}

const AssumptionField: React.FC<{
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  helperText?: string
  suffix?: string
}> = ({ id, label, value, onChange, helperText, suffix = '%' }) => {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          step="0.1"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={cn(
            'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            suffix ? 'pr-9' : undefined
          )}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">{suffix}</span>
        )}
      </div>
      {helperText && <p className="text-xs text-gray-500">{helperText}</p>}
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
  const [isCalculating, setIsCalculating] = useState(false)
  const financial = formData.financial_situation as any
  const resolveAssumptionInput = (value: unknown, fallback: number) => {
    const parsed = parseNumber(value)
    return Number.isFinite(parsed) ? String(parsed) : String(fallback)
  }
  const [assumptionInputs, setAssumptionInputs] = useState(() => ({
    incomeGrowth: resolveAssumptionInput(financial?.projection_income_growth, DEFAULT_PROJECTION_ASSUMPTIONS.incomeGrowth),
    expenseInflation: resolveAssumptionInput(financial?.projection_expense_inflation, DEFAULT_PROJECTION_ASSUMPTIONS.expenseInflation),
    investmentReturn: resolveAssumptionInput(financial?.projection_investment_return, DEFAULT_PROJECTION_ASSUMPTIONS.investmentReturn),
    savingsRate: resolveAssumptionInput(financial?.projection_surplus_savings_rate, DEFAULT_PROJECTION_ASSUMPTIONS.savingsRate)
  }))
  const [projectionScenario, setProjectionScenario] = useState<ProjectionScenarioKey>('balanced')
  const [projectionHorizon, setProjectionHorizon] = useState<ProjectionHorizon>(PROJECTION_HORIZONS[1])
  const [useRealTerms, setUseRealTerms] = useState(true)

  useEffect(() => {
    setAssumptionInputs({
      incomeGrowth: resolveAssumptionInput(financial?.projection_income_growth, DEFAULT_PROJECTION_ASSUMPTIONS.incomeGrowth),
      expenseInflation: resolveAssumptionInput(financial?.projection_expense_inflation, DEFAULT_PROJECTION_ASSUMPTIONS.expenseInflation),
      investmentReturn: resolveAssumptionInput(financial?.projection_investment_return, DEFAULT_PROJECTION_ASSUMPTIONS.investmentReturn),
      savingsRate: resolveAssumptionInput(financial?.projection_surplus_savings_rate, DEFAULT_PROJECTION_ASSUMPTIONS.savingsRate)
    })
  }, [financial?.projection_income_growth, financial?.projection_expense_inflation, financial?.projection_investment_return, financial?.projection_surplus_savings_rate])

  useEffect(() => {
    if (activeTab !== 'projections') {
      setIsCalculating(false)
      return
    }
    setIsCalculating(true)
    const timer = setTimeout(() => setIsCalculating(false), 450)
    return () => clearTimeout(timer)
  }, [activeTab])
  
  // Extract expense categories from form data if available
  const expenseCategories = financial?.expense_categories || []
  
  // Real-time calculations
  const calculations = useMemo(() => {
    const incomeBreakdown = [
      parseNumber(financial.income_employment),
      parseNumber(financial.income_rental),
      parseNumber(financial.income_dividends),
      parseNumber(financial.income_other)
    ].filter((value): value is number => value !== undefined)

    const incomeBreakdownTotal = incomeBreakdown.length > 0 ? incomeBreakdown.reduce((sum, value) => sum + value, 0) : undefined

    const annualIncome =
      incomeBreakdownTotal ??
      parseNumber(financial.income_total) ??
      parseNumber(financial.annual_income) ??
      0

    const essentialBreakdown = [
      parseNumber(financial.exp_housing),
      parseNumber(financial.exp_utilities),
      parseNumber(financial.exp_food),
      parseNumber(financial.exp_transport),
      parseNumber(financial.exp_healthcare),
      parseNumber(financial.exp_childcare)
    ].filter((value): value is number => value !== undefined)

    const essentialBreakdownTotal =
      essentialBreakdown.length > 0 ? essentialBreakdown.reduce((sum, value) => sum + value, 0) : undefined

    const essentialAnnual =
      essentialBreakdownTotal ??
      parseNumber(financial.exp_total_essential) ??
      (parseNumber(financial.monthly_expenses) !== undefined ? (parseNumber(financial.monthly_expenses) as number) * 12 : undefined) ??
      0

    const discretionaryBreakdown = [
      parseNumber(financial.exp_leisure),
      parseNumber(financial.exp_holidays),
      parseNumber(financial.exp_other)
    ].filter((value): value is number => value !== undefined)

    const discretionaryBreakdownTotal =
      discretionaryBreakdown.length > 0 ? discretionaryBreakdown.reduce((sum, value) => sum + value, 0) : undefined

    const discretionaryAnnual =
      discretionaryBreakdownTotal ??
      parseNumber(financial.exp_total_discretionary) ??
      0
    const annualExpenditure = essentialAnnual + discretionaryAnnual

    const monthlyExpenditure =
      parseNumber(financial.monthly_expenses) ??
      (annualExpenditure > 0 ? Math.round(annualExpenditure / 12) : 0)

    const disposableIncome = annualIncome - annualExpenditure

    const liquidAssets =
      parseNumber(financial.savings) ??
      parseNumber(financial.liquid_assets) ??
      0

    const propertyValue = parseNumber(financial.property_value) ?? 0
    const mortgage = parseNumber(financial.mortgage_outstanding) ?? parseNumber(financial.outstanding_mortgage) ?? 0
    const otherLiabilities = parseNumber(financial.other_debts) ?? parseNumber(financial.other_liabilities) ?? 0
    const emergencyFund = parseNumber(financial.emergency_fund) ?? 0
    
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
  }, [financial])

  const projectionAssumptions = useMemo(() => {
    const readPercent = (fieldId: string, fallback: number) => {
      const parsed = parseNumber(financial?.[fieldId])
      return Number.isFinite(parsed) ? (parsed as number) : fallback
    }

    return {
      incomeGrowth: readPercent('projection_income_growth', DEFAULT_PROJECTION_ASSUMPTIONS.incomeGrowth),
      expenseInflation: readPercent('projection_expense_inflation', DEFAULT_PROJECTION_ASSUMPTIONS.expenseInflation),
      investmentReturn: readPercent('projection_investment_return', DEFAULT_PROJECTION_ASSUMPTIONS.investmentReturn),
      savingsRate: Math.min(
        100,
        Math.max(0, readPercent('projection_surplus_savings_rate', DEFAULT_PROJECTION_ASSUMPTIONS.savingsRate))
      )
    }
  }, [financial])

  const inflationRate = projectionAssumptions.expenseInflation / 100
  
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
  
  const monthlyBudgetData = useMemo(() => {
    const incomeGrowthRate = projectionAssumptions.incomeGrowth / 100
    const expenseGrowthRate = projectionAssumptions.expenseInflation / 100
    const baseIncome = calculations.monthlyIncome
    const baseExpenses = calculations.monthlyExpenditure

    return Array.from({ length: 12 }, (_, i) => {
      const monthFactor = (value: number, rate: number) => value * Math.pow(1 + rate, i / 12)
      const income = monthFactor(baseIncome, incomeGrowthRate)
      const expenses = monthFactor(baseExpenses, expenseGrowthRate)
      const surplus = income - expenses

      return {
        month: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][i],
        income: Math.round(income),
        expenses: Math.round(expenses),
        surplus: Math.round(surplus)
      }
    })
  }, [calculations.monthlyExpenditure, calculations.monthlyIncome, projectionAssumptions.expenseInflation, projectionAssumptions.incomeGrowth])

  const projectionYears = useMemo(() => {
    const incomeGrowthRate = projectionAssumptions.incomeGrowth / 100
    const expenseGrowthRate = projectionAssumptions.expenseInflation / 100
    const returnRate = projectionAssumptions.investmentReturn / 100
    const savingsRate = projectionAssumptions.savingsRate / 100

    let investmentBalance = calculations.liquidAssets
    const baseNetWorthExLiquid = calculations.netWorth - calculations.liquidAssets

    return Array.from({ length: 5 }, (_, index) => {
      const year = index + 1
      const income = calculations.annualIncome * Math.pow(1 + incomeGrowthRate, year)
      const expenses = calculations.annualExpenditure * Math.pow(1 + expenseGrowthRate, year)
      const surplus = income - expenses
      const contribution = surplus >= 0 ? surplus * savingsRate : surplus
      investmentBalance = Math.max(0, investmentBalance * (1 + returnRate) + contribution)

      const projectedNetWorth = baseNetWorthExLiquid + investmentBalance
      const projectedEmergencyFund = calculations.emergencyFund + Math.max(0, surplus) * 0.1 * year
      const inflationFactor = useRealTerms ? Math.pow(1 + expenseGrowthRate, year) : 1

      return {
        year,
        income: income / inflationFactor,
        expenses: expenses / inflationFactor,
        surplus: surplus / inflationFactor,
        investmentBalance: investmentBalance / inflationFactor,
        projectedNetWorth: projectedNetWorth / inflationFactor,
        projectedEmergencyFund: projectedEmergencyFund / inflationFactor
      }
    })
  }, [
    calculations.annualExpenditure,
    calculations.annualIncome,
    calculations.emergencyFund,
    calculations.liquidAssets,
    calculations.netWorth,
    projectionAssumptions.expenseInflation,
    projectionAssumptions.incomeGrowth,
    projectionAssumptions.investmentReturn,
    projectionAssumptions.savingsRate,
    useRealTerms
  ])

  const currentYear = new Date().getFullYear()
  const currentAge = useMemo(
    () => resolveAge(formData.personal_information?.age, formData.personal_information?.date_of_birth),
    [formData.personal_information?.age, formData.personal_information?.date_of_birth]
  )
  const targetRetirementAge = useMemo(() => {
    const parsed = parseNumber(formData.personal_information?.target_retirement_age)
    return Number.isFinite(parsed) ? (parsed as number) : undefined
  }, [formData.personal_information?.target_retirement_age])

  const longTermCashFlows = useMemo(() => {
    const incomeGrowthRate = projectionAssumptions.incomeGrowth / 100
    const expenseGrowthRate = projectionAssumptions.expenseInflation / 100
    const savingsRate = projectionAssumptions.savingsRate / 100

    return Array.from({ length: projectionHorizon }, (_, index) => {
      const year = index + 1
      const income = calculations.annualIncome * Math.pow(1 + incomeGrowthRate, year)
      const expenses = calculations.annualExpenditure * Math.pow(1 + expenseGrowthRate, year)
      const surplus = income - expenses
      const contribution = surplus >= 0 ? surplus * savingsRate : surplus

      return {
        year,
        income,
        expenses,
        surplus,
        contribution
      }
    })
  }, [
    calculations.annualExpenditure,
    calculations.annualIncome,
    projectionAssumptions.expenseInflation,
    projectionAssumptions.incomeGrowth,
    projectionAssumptions.savingsRate,
    projectionHorizon
  ])

  const longTermProjections = useMemo(() => {
    const baseNetWorthExLiquid = calculations.netWorth - calculations.liquidAssets
    const projections = {} as Record<ProjectionScenarioKey, Array<{
      year: number
      calendarYear: number
      investmentBalance: number
      netWorth: number
      surplus: number
    }>>

    ;(Object.keys(PROJECTION_SCENARIOS) as ProjectionScenarioKey[]).forEach((key) => {
      const scenario = PROJECTION_SCENARIOS[key]
      const returnRate = (projectionAssumptions.investmentReturn + scenario.returnOffset) / 100
      let investmentBalance = calculations.liquidAssets

      projections[key] = longTermCashFlows.map((flow, index) => {
        investmentBalance = Math.max(0, investmentBalance * (1 + returnRate) + flow.contribution)
        const year = index + 1
        const inflationFactor = useRealTerms ? Math.pow(1 + inflationRate, year) : 1
        const netWorth = baseNetWorthExLiquid + investmentBalance

        return {
          year,
          calendarYear: currentYear + year,
          investmentBalance: investmentBalance / inflationFactor,
          netWorth: netWorth / inflationFactor,
          surplus: flow.surplus / inflationFactor
        }
      })
    })

    return projections
  }, [
    calculations.liquidAssets,
    calculations.netWorth,
    currentYear,
    inflationRate,
    longTermCashFlows,
    projectionAssumptions.investmentReturn,
    useRealTerms
  ])

  const scenarioComparisonData = useMemo(() => {
    return Array.from({ length: projectionHorizon }, (_, index) => ({
      year: index + 1,
      calendarYear: currentYear + index + 1,
      conservative: longTermProjections.conservative?.[index]?.netWorth ?? 0,
      balanced: longTermProjections.balanced?.[index]?.netWorth ?? 0,
      aggressive: longTermProjections.aggressive?.[index]?.netWorth ?? 0
    }))
  }, [currentYear, longTermProjections, projectionHorizon])

  const scenarioSummaries = useMemo(() => {
    return (Object.keys(PROJECTION_SCENARIOS) as ProjectionScenarioKey[]).map((key) => {
      const scenario = PROJECTION_SCENARIOS[key]
      const projection = longTermProjections[key] || []
      const finalYear = projection[projection.length - 1]

      return {
        key,
        label: scenario.label,
        expectedReturn: projectionAssumptions.investmentReturn + scenario.returnOffset,
        volatility: scenario.volatility,
        finalNetWorth: finalYear?.netWorth ?? 0,
        finalInvestment: finalYear?.investmentBalance ?? 0
      }
    })
  }, [longTermProjections, projectionAssumptions.investmentReturn])

  const milestoneMarkers = useMemo(() => {
    const markers: Array<{
      id: string
      year: number
      label: string
      shortLabel: string
      color: string
    }> = []

    if (currentAge !== undefined && targetRetirementAge && targetRetirementAge > currentAge) {
      const yearsToRetirement = targetRetirementAge - currentAge
      if (yearsToRetirement > 0 && yearsToRetirement <= projectionHorizon) {
        markers.push({
          id: 'retirement',
          year: yearsToRetirement,
          label: `Retirement (age ${targetRetirementAge})`,
          shortLabel: 'Retirement',
          color: '#6366F1'
        })
      }
    }

    if (currentAge !== undefined && DEFAULT_STATE_PENSION_AGE > currentAge) {
      const yearsToPension = DEFAULT_STATE_PENSION_AGE - currentAge
      if (yearsToPension > 0 && yearsToPension <= projectionHorizon) {
        markers.push({
          id: 'state-pension',
          year: yearsToPension,
          label: `State pension (age ${DEFAULT_STATE_PENSION_AGE})`,
          shortLabel: 'State pension',
          color: '#F97316'
        })
      }
    }

    if (calculations.mortgage > 0 && projectionHorizon >= MORTGAGE_PAYOFF_ASSUMED_YEARS) {
      markers.push({
        id: 'mortgage',
        year: MORTGAGE_PAYOFF_ASSUMED_YEARS,
        label: `Mortgage payoff (assumed ${MORTGAGE_PAYOFF_ASSUMED_YEARS}y)`,
        shortLabel: 'Mortgage payoff',
        color: '#0EA5E9'
      })
    }

    return markers
  }, [calculations.mortgage, currentAge, projectionHorizon, targetRetirementAge])
  
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
          {isCalculating ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-4">
                <div className="flex items-center justify-between text-xs text-blue-700">
                  <span>Calculating projections</span>
                  <span>Updating...</span>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-blue-100">
                  <div className="h-2 w-1/2 animate-pulse rounded-full bg-blue-600" />
                </div>
              </div>
              <Skeleton className="h-36 w-full" />
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-72 w-full" />
              <Skeleton className="h-80 w-full" />
            </div>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold">Projection Assumptions</h3>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <AssumptionField
                      id="projection-income-growth"
                      label="Income growth (annual)"
                      value={assumptionInputs.incomeGrowth}
                      onChange={(value) => {
                        setAssumptionInputs((prev) => ({ ...prev, incomeGrowth: value }))
                        const parsed = Number(value)
                        if (!value.trim()) {
                          onUpdateField('projection_income_growth', null)
                          return
                        }
                        if (Number.isFinite(parsed)) {
                          onUpdateField('projection_income_growth', parsed)
                        }
                      }}
                      helperText="Applied to income trend over time."
                    />
                    <AssumptionField
                      id="projection-expense-inflation"
                      label="Expense inflation (annual)"
                      value={assumptionInputs.expenseInflation}
                      onChange={(value) => {
                        setAssumptionInputs((prev) => ({ ...prev, expenseInflation: value }))
                        const parsed = Number(value)
                        if (!value.trim()) {
                          onUpdateField('projection_expense_inflation', null)
                          return
                        }
                        if (Number.isFinite(parsed)) {
                          onUpdateField('projection_expense_inflation', parsed)
                        }
                      }}
                      helperText="Applied to expense trend over time."
                    />
                    <AssumptionField
                      id="projection-investment-return"
                      label="Investment return (annual)"
                      value={assumptionInputs.investmentReturn}
                      onChange={(value) => {
                        setAssumptionInputs((prev) => ({ ...prev, investmentReturn: value }))
                        const parsed = Number(value)
                        if (!value.trim()) {
                          onUpdateField('projection_investment_return', null)
                          return
                        }
                        if (Number.isFinite(parsed)) {
                          onUpdateField('projection_investment_return', parsed)
                        }
                      }}
                      helperText="Projected return on liquid assets."
                    />
                    <AssumptionField
                      id="projection-savings-rate"
                      label="Surplus saved/invested"
                      value={assumptionInputs.savingsRate}
                      onChange={(value) => {
                        setAssumptionInputs((prev) => ({ ...prev, savingsRate: value }))
                        const parsed = Number(value)
                        if (!value.trim()) {
                          onUpdateField('projection_surplus_savings_rate', null)
                          return
                        }
                        if (Number.isFinite(parsed)) {
                          onUpdateField('projection_surplus_savings_rate', parsed)
                        }
                      }}
                      helperText="Percent of annual surplus saved or invested."
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-3">
                    These assumptions drive the charts below and can be adjusted per client.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold">Projection Controls</h3>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">Scenario</p>
                      <div className="flex flex-wrap gap-2">
                        {(Object.keys(PROJECTION_SCENARIOS) as ProjectionScenarioKey[]).map((key) => (
                          <Button
                            key={key}
                            size="sm"
                            variant={projectionScenario === key ? 'default' : 'outline'}
                            onClick={() => setProjectionScenario(key)}
                          >
                            {PROJECTION_SCENARIOS[key].label}
                          </Button>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500">
                        Expected return: {(projectionAssumptions.investmentReturn + PROJECTION_SCENARIOS[projectionScenario].returnOffset).toFixed(1)}%
                        {' '}| Volatility: {PROJECTION_SCENARIOS[projectionScenario].volatility}%
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">Time horizon</p>
                      <div className="flex flex-wrap gap-2">
                        {PROJECTION_HORIZONS.map((years) => (
                          <Button
                            key={years}
                            size="sm"
                            variant={projectionHorizon === years ? 'default' : 'outline'}
                            onClick={() => setProjectionHorizon(years)}
                          >
                            {years} years
                          </Button>
                        ))}
                      </div>
                      <p className="text-xs text-gray-500">
                        Long-term projections run through year {projectionHorizon}.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">Inflation view</p>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          variant={useRealTerms ? 'default' : 'outline'}
                          onClick={() => setUseRealTerms(true)}
                        >
                          Real terms
                        </Button>
                        <Button
                          size="sm"
                          variant={!useRealTerms ? 'default' : 'outline'}
                          onClick={() => setUseRealTerms(false)}
                        >
                          Nominal
                        </Button>
                      </div>
                      <p className="text-xs text-gray-500">
                        Real terms deflate values using {projectionAssumptions.expenseInflation}% annual inflation.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Monthly Cash Flow Projection */}
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-semibold">12-Month Cash Flow Projection</h3>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={monthlyBudgetData}>
                      <defs>
                        <linearGradient id="surplusGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(value: number) => `£${value.toLocaleString()}`} />
                      <Tooltip formatter={(value: any) => `£${value.toLocaleString()}`} />
                      <Legend />
                      <ReferenceLine y={0} stroke="#e5e7eb" />
                      <Area type="monotone" dataKey="surplus" stroke="#3B82F6" fill="url(#surplusGradient)" name="Surplus" />
                      <Line type="monotone" dataKey="income" stroke="#10B981" strokeWidth={2} dot={false} name="Income" />
                      <Line type="monotone" dataKey="expenses" stroke="#EF4444" strokeWidth={2} dot={false} name="Expenses" />
                    </ComposedChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">Long-Term Projection</h3>
                      <p className="text-sm text-gray-500">
                        Scenario-based net worth outlook over {projectionHorizon} years.
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="outline">{useRealTerms ? 'Real terms' : 'Nominal'}</Badge>
                      <Badge variant="outline">{PROJECTION_SCENARIOS[projectionScenario].label} scenario</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
                    {scenarioSummaries.map((scenario) => (
                      <div
                        key={scenario.key}
                        className={cn(
                          'rounded-lg border p-4',
                          projectionScenario === scenario.key ? 'border-blue-200 bg-blue-50/40' : 'border-gray-200'
                        )}
                      >
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold uppercase text-gray-500">{scenario.label}</p>
                          {projectionScenario === scenario.key && <Badge variant="default">Selected</Badge>}
                        </div>
                        <p className="mt-2 text-lg font-semibold">{formatCurrency(scenario.finalNetWorth)}</p>
                        <p className="text-xs text-gray-500">Net worth in year {projectionHorizon}</p>
                        <p className="mt-2 text-xs text-gray-500">
                          Return: {scenario.expectedReturn.toFixed(1)}% | Volatility: {scenario.volatility}%
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-lg border border-gray-200 p-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-gray-700">Net Worth Trajectory</h4>
                      <Badge variant="outline">Scenario comparison</Badge>
                    </div>
                    <div className="mt-4 h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={scenarioComparisonData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="year" tickFormatter={(value: number) => String(currentYear + value)} />
                          <YAxis tickFormatter={(value: number) => `£${Math.round(value).toLocaleString()}`} />
                          <Tooltip
                            formatter={(value: any) => formatCurrency(Number(value) || 0)}
                            labelFormatter={(value: any) => `Year ${value} (${currentYear + Number(value)})`}
                          />
                          <Legend />
                          {milestoneMarkers.map((marker) => (
                            <ReferenceLine
                              key={marker.id}
                              x={marker.year}
                              stroke={marker.color}
                              strokeDasharray="4 4"
                              label={{ value: marker.shortLabel, position: 'insideTopRight', fill: marker.color, fontSize: 10 }}
                            />
                          ))}
                          <Line
                            type="monotone"
                            dataKey="conservative"
                            stroke={SCENARIO_COLORS.conservative}
                            strokeWidth={projectionScenario === 'conservative' ? 3 : 2}
                            dot={false}
                            name="Conservative"
                          />
                          <Line
                            type="monotone"
                            dataKey="balanced"
                            stroke={SCENARIO_COLORS.balanced}
                            strokeWidth={projectionScenario === 'balanced' ? 3 : 2}
                            dot={false}
                            name="Balanced"
                          />
                          <Line
                            type="monotone"
                            dataKey="aggressive"
                            stroke={SCENARIO_COLORS.aggressive}
                            strokeWidth={projectionScenario === 'aggressive' ? 3 : 2}
                            dot={false}
                            name="Aggressive"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                    {milestoneMarkers.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-500">
                        {milestoneMarkers.map((marker) => (
                          <div key={marker.id} className="flex items-center gap-2">
                            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: marker.color }} />
                            <span>{marker.label} (Year {marker.year})</span>
                          </div>
                        ))}
                      </div>
                    )}
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
                    {projectionYears.map((year) => (
                      <div key={year.year} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-medium">Year {year.year}</span>
                          <Badge variant="outline">{new Date().getFullYear() + year.year}</Badge>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Projected Net Worth:</span>
                            <p className="font-medium">£{Math.round(year.projectedNetWorth).toLocaleString()}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Projected Surplus:</span>
                            <p className="font-medium">£{Math.round(year.surplus).toLocaleString()}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Investment Balance:</span>
                            <p className="font-medium">£{Math.round(year.investmentBalance).toLocaleString()}</p>
                          </div>
                          <div>
                            <span className="text-gray-500">Emergency Fund:</span>
                            <p className="font-medium">£{Math.round(year.projectedEmergencyFund).toLocaleString()}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
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
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default FinancialDashboard

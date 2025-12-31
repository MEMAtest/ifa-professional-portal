// =====================================================
// FILE: src/components/suitability/ExpenseBreakdownTable.tsx
// DETAILED EXPENSE CATEGORIZATION AND ANALYSIS
// =====================================================

import React, { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Badge } from '@/components/ui/Badge'
import { Progress } from '@/components/ui/Progress'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/Table'
import { 
  Home, Car, ShoppingCart, Heart, GraduationCap, 
  Sparkles, Shield, CreditCard, TrendingUp, 
  TrendingDown, Edit2, Save, X, Plus, Trash2,
  PieChart, BarChart3
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ExpenseCategory {
  id: string
  name: string
  icon: React.ElementType
  amount: number
  percentage?: number
  isFixed: boolean
  benchmark?: number
  editable?: boolean
}

interface ExpenseBreakdownTableProps {
  monthlyIncome: number
  categories?: ExpenseCategory[]
  onUpdateCategories?: (categories: ExpenseCategory[]) => void
  showBenchmarks?: boolean
  editable?: boolean
  className?: string
}

const DEFAULT_CATEGORIES: Omit<ExpenseCategory, 'amount'>[] = [
  { id: 'housing', name: 'Housing & Utilities', icon: Home, isFixed: true, benchmark: 30 },
  { id: 'transport', name: 'Transport', icon: Car, isFixed: false, benchmark: 15 },
  { id: 'food', name: 'Food & Groceries', icon: ShoppingCart, isFixed: false, benchmark: 12 },
  { id: 'insurance', name: 'Insurance', icon: Shield, isFixed: true, benchmark: 10 },
  { id: 'debt', name: 'Debt Payments', icon: CreditCard, isFixed: true, benchmark: 5 },
  { id: 'healthcare', name: 'Healthcare', icon: Heart, isFixed: false, benchmark: 5 },
  { id: 'education', name: 'Education', icon: GraduationCap, isFixed: false, benchmark: 5 },
  { id: 'entertainment', name: 'Entertainment', icon: Sparkles, isFixed: false, benchmark: 8 },
  { id: 'savings', name: 'Savings & Investment', icon: TrendingUp, isFixed: false, benchmark: 10 }
]

export const ExpenseBreakdownTable: React.FC<ExpenseBreakdownTableProps> = ({
  monthlyIncome,
  categories: propCategories,
  onUpdateCategories,
  showBenchmarks = true,
  editable = false,
  className
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [editingCategories, setEditingCategories] = useState<ExpenseCategory[]>([])
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryAmount, setNewCategoryAmount] = useState('')
  
  // Initialize categories with defaults if not provided
  const categories = useMemo(() => {
    if (propCategories && propCategories.length > 0) {
      return propCategories.map(cat => ({
        ...cat,
        percentage: monthlyIncome > 0 ? (cat.amount / monthlyIncome) * 100 : 0
      }))
    }
    return DEFAULT_CATEGORIES.map(cat => ({
      ...cat,
      amount: 0,
      percentage: 0
    }))
  }, [propCategories, monthlyIncome])
  
  // Calculate totals and analysis
  const analysis = useMemo(() => {
    const totalExpenses = categories.reduce((sum, cat) => sum + cat.amount, 0)
    const fixedExpenses = categories.filter(c => c.isFixed).reduce((sum, cat) => sum + cat.amount, 0)
    const variableExpenses = totalExpenses - fixedExpenses
    const surplus = monthlyIncome - totalExpenses
    const savingsRate = monthlyIncome > 0 ? (surplus / monthlyIncome) * 100 : 0
    
    // Identify problem areas
    const overBudgetCategories = categories.filter(cat => {
      if (!cat.benchmark) return false
      const actualPercentage = monthlyIncome > 0 ? (cat.amount / monthlyIncome) * 100 : 0
      return actualPercentage > cat.benchmark
    })
    
    // Calculate annual projections
    const annualIncome = monthlyIncome * 12
    const annualExpenses = totalExpenses * 12
    const annualSurplus = surplus * 12
    
    return {
      totalExpenses,
      fixedExpenses,
      variableExpenses,
      surplus,
      savingsRate,
      overBudgetCategories,
      annualIncome,
      annualExpenses,
      annualSurplus,
      expenseRatio: monthlyIncome > 0 ? (totalExpenses / monthlyIncome) * 100 : 0
    }
  }, [categories, monthlyIncome])
  
  const handleStartEdit = () => {
    setIsEditing(true)
    setEditingCategories([...categories])
  }
  
  const handleCancelEdit = () => {
    setIsEditing(false)
    setEditingCategories([])
  }
  
  const handleSaveEdit = () => {
    if (onUpdateCategories) {
      onUpdateCategories(editingCategories)
    }
    setIsEditing(false)
  }
  
  const handleCategoryAmountChange = (categoryId: string, newAmount: string) => {
    const amount = parseFloat(newAmount) || 0
    setEditingCategories(prev => 
      prev.map(cat => 
        cat.id === categoryId 
          ? { ...cat, amount, percentage: monthlyIncome > 0 ? (amount / monthlyIncome) * 100 : 0 }
          : cat
      )
    )
  }
  
  const handleAddCategory = () => {
    if (newCategoryName && newCategoryAmount) {
      const amount = parseFloat(newCategoryAmount) || 0
      const newCategory: ExpenseCategory = {
        id: `custom_${Date.now()}`,
        name: newCategoryName,
        icon: Sparkles,
        amount,
        percentage: monthlyIncome > 0 ? (amount / monthlyIncome) * 100 : 0,
        isFixed: false,
        editable: true
      }
      setEditingCategories([...editingCategories, newCategory])
      setNewCategoryName('')
      setNewCategoryAmount('')
    }
  }
  
  const handleDeleteCategory = (categoryId: string) => {
    setEditingCategories(prev => prev.filter(cat => cat.id !== categoryId))
  }
  
  const getStatusColor = (percentage: number, benchmark?: number) => {
    if (!benchmark) return ''
    if (percentage <= benchmark) return 'text-green-600'
    if (percentage <= benchmark * 1.2) return 'text-yellow-600'
    return 'text-red-600'
  }
  
  const displayCategories = isEditing ? editingCategories : categories
  
  return (
    <div className={cn("space-y-4", className)}>
      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Monthly Expense Breakdown</span>
            <div className="flex items-center gap-2">
              {editable && !isEditing && (
                <Button size="sm" variant="outline" onClick={handleStartEdit}>
                  <Edit2 className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              )}
              {isEditing && (
                <>
                  <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleSaveEdit}>
                    <Save className="h-4 w-4 mr-1" />
                    Save
                  </Button>
                </>
              )}
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Key Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">Monthly Income</p>
              <p className="text-lg font-semibold">£{monthlyIncome.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-red-50 rounded-lg">
              <p className="text-xs text-gray-500">Total Expenses</p>
              <p className="text-lg font-semibold text-red-600">
                £{analysis.totalExpenses.toLocaleString()}
              </p>
            </div>
            <div className={cn(
              "p-3 rounded-lg",
              analysis.surplus >= 0 ? "bg-green-50" : "bg-red-50"
            )}>
              <p className="text-xs text-gray-500">Monthly Surplus</p>
              <p className={cn(
                "text-lg font-semibold",
                analysis.surplus >= 0 ? "text-green-600" : "text-red-600"
              )}>
                £{Math.abs(analysis.surplus).toLocaleString()}
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-xs text-gray-500">Savings Rate</p>
              <p className="text-lg font-semibold text-blue-600">
                {Math.max(0, analysis.savingsRate).toFixed(1)}%
              </p>
            </div>
          </div>
          
          {/* Expense Ratio Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span>Expense Ratio</span>
              <span className={cn(
                "font-medium",
                analysis.expenseRatio > 100 ? "text-red-600" :
                analysis.expenseRatio > 80 ? "text-yellow-600" :
                "text-green-600"
              )}>
                {analysis.expenseRatio.toFixed(1)}%
              </span>
            </div>
            <Progress 
              value={Math.min(100, analysis.expenseRatio)} 
              className="h-3"
              indicatorClassName={
                analysis.expenseRatio > 100 ? "bg-red-500" :
                analysis.expenseRatio > 80 ? "bg-yellow-500" :
                "bg-green-500"
              }
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>Fixed: £{analysis.fixedExpenses.toLocaleString()}</span>
              <span>Variable: £{analysis.variableExpenses.toLocaleString()}</span>
            </div>
          </div>
          
          {/* Categories Table */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead className="text-right">% of Income</TableHead>
                {showBenchmarks && <TableHead className="text-right">Benchmark</TableHead>}
                <TableHead className="text-center">Type</TableHead>
                {isEditing && <TableHead className="text-center">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayCategories.map(category => {
                const Icon = category.icon
                return (
                  <TableRow key={category.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-gray-500" />
                        <span>{category.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {isEditing ? (
                        <Input
                          type="number"
                          value={category.amount}
                          onChange={(e) => handleCategoryAmountChange(category.id, e.target.value)}
                          className="w-24 text-right ml-auto"
                        />
                      ) : (
                        `£${category.amount.toLocaleString()}`
                      )}
                    </TableCell>
                    <TableCell className={cn(
                      "text-right font-medium",
                      getStatusColor(category.percentage || 0, category.benchmark)
                    )}>
                      {category.percentage?.toFixed(1)}%
                    </TableCell>
                    {showBenchmarks && (
                      <TableCell className="text-right text-gray-500">
                        {category.benchmark}%
                      </TableCell>
                    )}
                    <TableCell className="text-center">
                      <Badge variant={category.isFixed ? "secondary" : "outline"} className="text-xs">
                        {category.isFixed ? 'Fixed' : 'Variable'}
                      </Badge>
                    </TableCell>
                    {isEditing && (
                      <TableCell className="text-center">
                        {category.editable && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteCategory(category.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                )
              })}
              
              {/* Add New Category Row */}
              {isEditing && (
                <TableRow>
                  <TableCell>
                    <Input
                      placeholder="New category..."
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      placeholder="Amount"
                      value={newCategoryAmount}
                      onChange={(e) => setNewCategoryAmount(e.target.value)}
                      className="w-24 ml-auto"
                    />
                  </TableCell>
                  <TableCell colSpan={showBenchmarks ? 3 : 2} />
                  <TableCell className="text-center">
                    <Button
                      size="sm"
                      onClick={handleAddCategory}
                      disabled={!newCategoryName || !newCategoryAmount}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              )}
              
              {/* Total Row */}
              <TableRow className="font-semibold bg-gray-50">
                <TableCell>Total</TableCell>
                <TableCell className="text-right">
                  £{analysis.totalExpenses.toLocaleString()}
                </TableCell>
                <TableCell className="text-right">
                  {analysis.expenseRatio.toFixed(1)}%
                </TableCell>
                {showBenchmarks && <TableCell />}
                <TableCell />
                {isEditing && <TableCell />}
              </TableRow>
            </TableBody>
          </Table>
          
          {/* Warnings */}
          {analysis.overBudgetCategories.length > 0 && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm font-medium text-yellow-800 mb-1">
                Over Budget Categories:
              </p>
              <div className="space-y-1">
                {analysis.overBudgetCategories.map(cat => (
                  <p key={cat.id} className="text-xs text-yellow-700">
                    • {cat.name}: {cat.percentage?.toFixed(1)}% (benchmark: {cat.benchmark}%)
                  </p>
                ))}
              </div>
            </div>
          )}
          
          {/* Annual Projection */}
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Annual Projection</h4>
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div>
                <p className="text-blue-600">Annual Income</p>
                <p className="font-semibold text-blue-900">
                  £{analysis.annualIncome.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-blue-600">Annual Expenses</p>
                <p className="font-semibold text-blue-900">
                  £{analysis.annualExpenses.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-blue-600">Annual Surplus</p>
                <p className={cn(
                  "font-semibold",
                  analysis.annualSurplus >= 0 ? "text-green-700" : "text-red-700"
                )}>
                  £{Math.abs(analysis.annualSurplus).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ExpenseBreakdownTable

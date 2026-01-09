'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs'
import { ArrowLeft, RefreshCw } from 'lucide-react'

import type { Client } from '@/types/client'
import { calculateClientAUM, calculateFinancialHealth } from '@/lib/financials/aumCalculator'

import { FinancialSummaryCards } from './FinancialSummaryCards'
import { FinancialAtAGlance } from './FinancialAtAGlance'
import { InvestmentHoldings } from './InvestmentHoldings'
import { PensionArrangements } from './PensionArrangements'
import { InsurancePolicies } from './InsurancePolicies'
import { IncomeBreakdown } from './IncomeBreakdown'
import { ExpenseBreakdown } from './ExpenseBreakdown'
import { FinancialHealthScore } from './FinancialHealthScore'

interface ClientFinancialsPageProps {
  client: Client
  onBack?: () => void
  onRefresh?: () => void
}

export function ClientFinancialsPage({
  client,
  onBack,
  onRefresh
}: ClientFinancialsPageProps) {
  const [activeTab, setActiveTab] = useState('overview')

  const fp = client.financialProfile || {}
  const aum = calculateClientAUM(client)
  const health = calculateFinancialHealth(client)

  const clientName = `${client.personalDetails?.firstName || ''} ${client.personalDetails?.lastName || ''}`.trim()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBack && (
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {clientName ? `${clientName}'s Financials` : 'Client Financials'}
            </h1>
            <p className="text-sm text-gray-500">
              Comprehensive financial overview and asset management
            </p>
          </div>
        </div>
        {onRefresh && (
          <Button variant="outline" size="sm" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <FinancialSummaryCards
        aum={aum}
        annualIncome={fp.annualIncome || 0}
        monthlyExpenses={fp.monthlyExpenses || 0}
        netWorth={fp.netWorth || 0}
      />

      <FinancialAtAGlance financialProfile={fp} aum={aum} />

      {/* Tabbed Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="investments">Investments</TabsTrigger>
          <TabsTrigger value="pensions">Pensions</TabsTrigger>
          <TabsTrigger value="insurance">Insurance</TabsTrigger>
          <TabsTrigger value="income-expenses">Income & Expenses</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Quick overview with all sections */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <FinancialHealthScore
              savingsRate={health.savingsRate}
              liquidityRatio={health.liquidityRatio}
              wealthRatio={health.wealthRatio}
              debtToIncomeRatio={health.debtToIncomeRatio}
            />
            <IncomeBreakdown annualIncome={fp.annualIncome || 0} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <InvestmentHoldings
              investments={fp.existingInvestments || []}
              totalValue={aum.investments}
            />
            <PensionArrangements pensions={fp.pensionArrangements || []} />
          </div>

          <InsurancePolicies policies={fp.insurancePolicies || []} />
        </TabsContent>

        <TabsContent value="investments" className="space-y-6">
          <InvestmentHoldings
            investments={fp.existingInvestments || []}
            totalValue={aum.investments}
          />
        </TabsContent>

        <TabsContent value="pensions" className="space-y-6">
          <PensionArrangements pensions={fp.pensionArrangements || []} />
        </TabsContent>

        <TabsContent value="insurance" className="space-y-6">
          <InsurancePolicies policies={fp.insurancePolicies || []} />
        </TabsContent>

        <TabsContent value="income-expenses" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <IncomeBreakdown annualIncome={fp.annualIncome || 0} />
            <ExpenseBreakdown monthlyExpenses={fp.monthlyExpenses || 0} />
          </div>

          <FinancialHealthScore
            savingsRate={health.savingsRate}
            liquidityRatio={health.liquidityRatio}
            wealthRatio={health.wealthRatio}
            debtToIncomeRatio={health.debtToIncomeRatio}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

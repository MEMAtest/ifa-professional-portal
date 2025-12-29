'use client'

import React from 'react'
import { Target } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import type { ClientDashboardData, ExtendedClientProfile } from '@/services/integratedClientService'

import { calculateClientAUM, calculateFinancialHealth } from '@/lib/financials/aumCalculator'
import { FinancialSummaryCards } from '@/components/clients/financials/FinancialSummaryCards'
import { InvestmentHoldings } from '@/components/clients/financials/InvestmentHoldings'
import { PensionArrangements } from '@/components/clients/financials/PensionArrangements'
import { InsurancePolicies } from '@/components/clients/financials/InsurancePolicies'
import { FinancialHealthScore } from '@/components/clients/financials/FinancialHealthScore'
import { WealthBreakdownChart } from '@/components/clients/financials/WealthBreakdownChart'
import { KeyDatesCard } from '@/components/clients/financials/KeyDatesCard'

export function ClientFinancialTab(props: {
  client: ExtendedClientProfile
  dashboardData?: ClientDashboardData | null
}) {
  const { client } = props

  const fp = client.financialProfile || {}
  const aum = calculateClientAUM(client as any)
  const health = calculateFinancialHealth(client as any)

  return (
    <div className="space-y-6">
      {/* Summary Cards - AUM, Net Worth, Income, Expenses */}
      <FinancialSummaryCards
        aum={aum}
        annualIncome={fp.annualIncome || 0}
        monthlyExpenses={fp.monthlyExpenses || 0}
        netWorth={fp.netWorth || 0}
      />

      {/* Wealth Breakdown and Financial Health Score */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <WealthBreakdownChart financialProfile={fp} showLiabilities={true} />
        <FinancialHealthScore
          savingsRate={health.savingsRate}
          liquidityRatio={health.liquidityRatio}
          wealthRatio={health.wealthRatio}
          debtToIncomeRatio={health.debtToIncomeRatio}
        />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Income vs Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Income Bar */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-gray-600">Annual Income</span>
                  <span className="text-sm font-medium text-green-600">
                    £{fp.annualIncome?.toLocaleString() || '0'}
                  </span>
                </div>
                <div className="w-full bg-green-100 rounded-full h-6 relative overflow-hidden">
                  <div className="bg-green-500 h-6 rounded-full w-full flex items-center justify-center">
                    <span className="text-xs text-white font-medium">Income</span>
                  </div>
                </div>
              </div>

              {/* Expenses Bar */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-sm text-gray-600">Annual Expenses</span>
                  <span className="text-sm font-medium text-orange-600">
                    £{((fp.monthlyExpenses || 0) * 12).toLocaleString()}
                  </span>
                </div>
                <div className="w-full bg-orange-100 rounded-full h-6 relative overflow-hidden">
                  <div
                    className="bg-orange-500 h-6 rounded-full flex items-center justify-center transition-all duration-500"
                    style={{
                      width: `${Math.min(100, fp.annualIncome ? ((fp.monthlyExpenses || 0) * 12 / fp.annualIncome) * 100 : 0)}%`
                    }}
                  >
                    <span className="text-xs text-white font-medium">Expenses</span>
                  </div>
                </div>
              </div>

              {/* Surplus/Deficit */}
              <div className="pt-4 border-t">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Annual Surplus</span>
                  <span
                    className={`text-lg font-bold ${
                      (fp.annualIncome || 0) - (fp.monthlyExpenses || 0) * 12 >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    £{((fp.annualIncome || 0) - (fp.monthlyExpenses || 0) * 12).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <KeyDatesCard client={client} nextReviewDate={props.dashboardData?.nextReviewDate} />
      </div>

      {/* Investment Holdings and Pensions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <InvestmentHoldings
          investments={fp.existingInvestments || []}
          totalValue={aum.investments}
        />
        <PensionArrangements pensions={fp.pensionArrangements || []} />
      </div>

      {/* Insurance Policies */}
      <InsurancePolicies policies={fp.insurancePolicies || []} />
    </div>
  )
}

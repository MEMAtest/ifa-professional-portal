import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Target, TrendingDown, TrendingUp } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { Client } from '@/types/client';

interface FinancialTabProps {
  client: Client;
  investmentObjectives: string[];
}

export function FinancialTab({ client, investmentObjectives }: FinancialTabProps) {
  const annualIncome = client.financialProfile?.annualIncome || 0;
  const monthlyExpenses = client.financialProfile?.monthlyExpenses || 0;
  const savingsRate = annualIncome
    ? Math.round(((annualIncome - monthlyExpenses * 12) / annualIncome) * 100)
    : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Income & Assets</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-500">Annual Income</span>
                <span className="text-lg font-bold">{formatCurrency(annualIncome)}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full" style={{ width: '75%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-500">Net Worth</span>
                <span className="text-lg font-bold">
                  {formatCurrency(client.financialProfile?.netWorth || 0)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-blue-600 h-2 rounded-full" style={{ width: '60%' }}></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-500">Liquid Assets</span>
                <span className="text-lg font-bold">
                  {formatCurrency(client.financialProfile?.liquidAssets || 0)}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-purple-600 h-2 rounded-full" style={{ width: '40%' }}></div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingDown className="h-5 w-5" />
            <span>Expenses & Liabilities</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Monthly Expenses</span>
              <span className="font-medium">{formatCurrency(monthlyExpenses)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">Total Debt</span>
              <span className="font-medium">
                {formatCurrency((client.financialProfile as any)?.totalDebt || 0)}
              </span>
            </div>
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-blue-900">Savings Rate</span>
                <span className="text-lg font-bold text-blue-600">{savingsRate}%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Target className="h-5 w-5" />
            <span>Investment Objectives</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-500 mb-2">Primary Objectives</p>
              {investmentObjectives.length > 0 ? (
                <ul className="space-y-2">
                  {investmentObjectives.map((objective, index) => (
                    <li key={index} className="flex items-center space-x-2">
                      <div className="h-2 w-2 bg-blue-600 rounded-full"></div>
                      <span className="text-sm">{objective}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-400">No objectives set</p>
              )}
            </div>
            <div>
              <p className="text-sm text-gray-500 mb-2">Investment Timeframe</p>
              <p className="text-lg font-medium">
                {client.financialProfile?.investmentTimeframe || 'Not specified'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

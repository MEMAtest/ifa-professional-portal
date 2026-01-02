import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { parseNumericValue } from '@/components/clients/form/utils';
import type { ClientFormData, FinancialProfile } from '@/types/client';

interface FinancialProfileStepProps {
  formData: ClientFormData;
  onUpdateFinancialProfile: (updates: Partial<FinancialProfile>) => void;
}

export function FinancialProfileStep({
  formData,
  onUpdateFinancialProfile
}: FinancialProfileStepProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Financial Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 sm:space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Annual Income (£)</label>
            <input
              type="number"
              min="0"
              step="1000"
              value={formData.financialProfile?.annualIncome || ''}
              onChange={(e) =>
                onUpdateFinancialProfile({
                  annualIncome: parseNumericValue(e.target.value)
                })
              }
              inputMode="numeric"
              className="w-full p-2 border border-gray-300 rounded-md text-base sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="50000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Net Worth (£)</label>
            <input
              type="number"
              min="0"
              step="10000"
              value={formData.financialProfile?.netWorth || ''}
              onChange={(e) =>
                onUpdateFinancialProfile({
                  netWorth: parseNumericValue(e.target.value)
                })
              }
              inputMode="numeric"
              className="w-full p-2 border border-gray-300 rounded-md text-base sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="100000"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Liquid Assets (£)</label>
            <input
              type="number"
              min="0"
              step="1000"
              value={formData.financialProfile?.liquidAssets || ''}
              onChange={(e) =>
                onUpdateFinancialProfile({
                  liquidAssets: parseNumericValue(e.target.value)
                })
              }
              inputMode="numeric"
              className="w-full p-2 border border-gray-300 rounded-md text-base sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="25000"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Expenses (£)</label>
            <input
              type="number"
              min="0"
              step="100"
              value={formData.financialProfile?.monthlyExpenses || ''}
              onChange={(e) =>
                onUpdateFinancialProfile({
                  monthlyExpenses: parseNumericValue(e.target.value)
                })
              }
              inputMode="numeric"
              className="w-full p-2 border border-gray-300 rounded-md text-base sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="3000"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Investment Timeframe</label>
          <select
            value={formData.financialProfile?.investmentTimeframe || ''}
            onChange={(e) => onUpdateFinancialProfile({ investmentTimeframe: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded-md text-base sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Select timeframe</option>
            <option value="short_term">Short term (1-3 years)</option>
            <option value="medium_term">Medium term (3-7 years)</option>
            <option value="long_term">Long term (7+ years)</option>
          </select>
        </div>
      </CardContent>
    </Card>
  );
}

import type { Client } from '@/types/client'
import { getClientAge } from '@/lib/stress-testing/formatters'

export const buildClientProfile = (client: Client) => {
  const financialProfile = client.financialProfile
  const monthlyExpenses = financialProfile?.monthlyExpenses || 3000
  const annualExpenses = monthlyExpenses * 12
  const pensionValue =
    financialProfile?.pensionArrangements?.reduce(
      (sum, pension) => sum + (pension.currentValue || 0),
      0
    ) || 100000

  return {
    clientId: client.id,
    clientName:
      `${client.personalDetails?.firstName || ''} ${client.personalDetails?.lastName || ''}`.trim() ||
      'Client',
    clientRef: client.clientRef,
    portfolioValue: financialProfile?.liquidAssets || financialProfile?.netWorth || 500000,
    annualIncome: financialProfile?.annualIncome || 50000,
    annualExpenses,
    pensionValue,
    savings: financialProfile?.emergencyFund || financialProfile?.liquidAssets || 20000,
    age: getClientAge(client),
    retirementAge: 65,
    riskScore: client.riskProfile?.attitudeToRisk || 5
  }
}

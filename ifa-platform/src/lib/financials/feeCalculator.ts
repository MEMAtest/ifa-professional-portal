// ===================================================================
// FILE: src/lib/financials/feeCalculator.ts
// Fee revenue calculator for firm financials
// ===================================================================

export interface FeeSchedule {
  initialFeePercent: number     // e.g., 1.5 = 1.5%
  ongoingFeePercent: number     // e.g., 0.75 = 0.75% per annum
  platformFeePercent: number    // e.g., 0.25 = 0.25% per annum
}

export interface ClientFeeProjection {
  clientId: string
  clientName: string
  aum: number
  initialFee: number
  annualOngoingFee: number
  monthlyOngoingFee: number
  platformFee: number
  totalAnnualRevenue: number
}

export interface FirmFeeProjection {
  totalAUM: number
  totalInitialFees: number
  totalAnnualOngoingFees: number
  totalMonthlyOngoingFees: number
  totalPlatformFees: number
  totalAnnualRevenue: number
  averageRevenuePerClient: number
  clientCount: number
  byClient: ClientFeeProjection[]
}

export interface AUMBand {
  label: string
  min: number
  max: number
  clientCount: number
  totalAUM: number
  percentageOfAUM: number
  percentageOfClients: number
  averageAUM: number
  projectedRevenue: number
}

export const DEFAULT_FEE_SCHEDULE: FeeSchedule = {
  initialFeePercent: 1.5,
  ongoingFeePercent: 0.75,
  platformFeePercent: 0.25
}

export const AUM_BAND_DEFINITIONS = [
  { label: '<£50k', min: 0, max: 50000 },
  { label: '£50k-250k', min: 50000, max: 250000 },
  { label: '£250k-500k', min: 250000, max: 500000 },
  { label: '£500k-1M', min: 500000, max: 1000000 },
  { label: '£1M+', min: 1000000, max: Infinity }
]

/**
 * Calculate fee projections for a single client
 */
export function calculateClientFees(
  clientId: string,
  clientName: string,
  aum: number,
  feeSchedule: FeeSchedule = DEFAULT_FEE_SCHEDULE,
  includeInitialFee: boolean = false
): ClientFeeProjection {
  const initialFee = includeInitialFee ? aum * (feeSchedule.initialFeePercent / 100) : 0
  const annualOngoingFee = aum * (feeSchedule.ongoingFeePercent / 100)
  const monthlyOngoingFee = annualOngoingFee / 12
  const platformFee = aum * (feeSchedule.platformFeePercent / 100)
  const totalAnnualRevenue = initialFee + annualOngoingFee

  return {
    clientId,
    clientName,
    aum,
    initialFee,
    annualOngoingFee,
    monthlyOngoingFee,
    platformFee,
    totalAnnualRevenue
  }
}

/**
 * Calculate fee projections for entire firm
 */
export function calculateFirmFees(
  clients: Array<{ clientId: string; clientName: string; aum: number }>,
  feeSchedule: FeeSchedule = DEFAULT_FEE_SCHEDULE,
  includeInitialFees: boolean = false
): FirmFeeProjection {
  const byClient = clients.map(c =>
    calculateClientFees(c.clientId, c.clientName, c.aum, feeSchedule, includeInitialFees)
  )

  const totalAUM = byClient.reduce((sum, c) => sum + c.aum, 0)
  const totalInitialFees = byClient.reduce((sum, c) => sum + c.initialFee, 0)
  const totalAnnualOngoingFees = byClient.reduce((sum, c) => sum + c.annualOngoingFee, 0)
  const totalMonthlyOngoingFees = byClient.reduce((sum, c) => sum + c.monthlyOngoingFee, 0)
  const totalPlatformFees = byClient.reduce((sum, c) => sum + c.platformFee, 0)
  const totalAnnualRevenue = byClient.reduce((sum, c) => sum + c.totalAnnualRevenue, 0)

  return {
    totalAUM,
    totalInitialFees,
    totalAnnualOngoingFees,
    totalMonthlyOngoingFees,
    totalPlatformFees,
    totalAnnualRevenue,
    averageRevenuePerClient: byClient.length > 0 ? totalAnnualRevenue / byClient.length : 0,
    clientCount: byClient.length,
    byClient
  }
}

/**
 * Segment clients by AUM bands
 */
export function segmentByAUMBands(
  clients: Array<{ clientId: string; clientName: string; aum: number }>,
  feeSchedule: FeeSchedule = DEFAULT_FEE_SCHEDULE
): AUMBand[] {
  const totalAUM = clients.reduce((sum, c) => sum + c.aum, 0)
  const totalClients = clients.length

  return AUM_BAND_DEFINITIONS.map(band => {
    const bandClients = clients.filter(c => c.aum >= band.min && c.aum < band.max)
    const bandAUM = bandClients.reduce((sum, c) => sum + c.aum, 0)
    const projectedRevenue = bandAUM * (feeSchedule.ongoingFeePercent / 100)

    return {
      label: band.label,
      min: band.min,
      max: band.max,
      clientCount: bandClients.length,
      totalAUM: bandAUM,
      percentageOfAUM: totalAUM > 0 ? (bandAUM / totalAUM) * 100 : 0,
      percentageOfClients: totalClients > 0 ? (bandClients.length / totalClients) * 100 : 0,
      averageAUM: bandClients.length > 0 ? bandAUM / bandClients.length : 0,
      projectedRevenue
    }
  })
}

/**
 * Format currency for display
 */
export function formatFeeAmount(value: number): string {
  if (value >= 1000000) {
    return `£${(value / 1000000).toFixed(2)}M`
  }
  if (value >= 1000) {
    return `£${(value / 1000).toFixed(1)}K`
  }
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

/**
 * Get color for AUM band based on index
 */
export function getBandColor(index: number): string {
  const colors = [
    'bg-slate-100 border-slate-300 text-slate-700',
    'bg-blue-100 border-blue-300 text-blue-700',
    'bg-purple-100 border-purple-300 text-purple-700',
    'bg-amber-100 border-amber-300 text-amber-700',
    'bg-emerald-100 border-emerald-300 text-emerald-700'
  ]
  return colors[index % colors.length]
}

/**
 * Get bar color for AUM band chart
 */
export function getBandBarColor(index: number): string {
  const colors = [
    'bg-slate-400',
    'bg-blue-500',
    'bg-purple-500',
    'bg-amber-500',
    'bg-emerald-500'
  ]
  return colors[index % colors.length]
}

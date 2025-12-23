import type { SuitabilityCostsCharges } from '../types'
import { parseOptionalNumber } from '../utils'

export function buildCostsCharges(args: {
  formCosts: Record<string, unknown>
  investmentAmount?: number
}): SuitabilityCostsCharges {
  const formCosts = args.formCosts
  const investmentAmount = args.investmentAmount

  const initialFeePercent = parseOptionalNumber((formCosts as any).initial_fee_agreed ?? (formCosts as any).initial_adviser_charge)
  const initialFeeFixed = parseOptionalNumber((formCosts as any).initial_flat_fee ?? (formCosts as any).initial_adviser_charge_amount)
  const ongoingFeePercent = parseOptionalNumber((formCosts as any).ongoing_fee_agreed ?? (formCosts as any).ongoing_adviser_charge)
  const ongoingFeeFixed = parseOptionalNumber((formCosts as any).ongoing_flat_fee)

  const initialFeeType =
    initialFeePercent !== undefined ? 'percentage' : initialFeeFixed !== undefined ? 'fixed' : undefined
  const ongoingFeeType =
    ongoingFeePercent !== undefined ? 'percentage' : ongoingFeeFixed !== undefined ? 'fixed' : undefined

  const platformFeePercent = parseOptionalNumber((formCosts as any).platform_charge)
  const fundChargesPercent = parseOptionalNumber((formCosts as any).fund_charges)

  const pctToCost = (pct: number | undefined): number | undefined => {
    if (investmentAmount === undefined) return undefined
    if (pct === undefined) return undefined
    return (investmentAmount * pct) / 100
  }

  const initialFeeCost = initialFeeType === 'percentage' ? pctToCost(initialFeePercent) : initialFeeFixed
  const ongoingFeeAnnualCost = ongoingFeeType === 'percentage' ? pctToCost(ongoingFeePercent) : ongoingFeeFixed
  const platformFeeAnnualCost = pctToCost(platformFeePercent)
  const fundChargesAnnualCost = pctToCost(fundChargesPercent)

  const annualChargesCandidates = [ongoingFeeAnnualCost, platformFeeAnnualCost, fundChargesAnnualCost].filter(
    (n): n is number => typeof n === 'number' && Number.isFinite(n)
  )
  const annualChargesTotal = annualChargesCandidates.length > 0 ? annualChargesCandidates.reduce((sum, n) => sum + n, 0) : undefined

  const totalFirstYearCost =
    initialFeeCost !== undefined || annualChargesTotal !== undefined
      ? (initialFeeCost || 0) + (annualChargesTotal || 0)
      : undefined

  const projectedCosts5Years =
    annualChargesTotal !== undefined ? (initialFeeCost || 0) + annualChargesTotal * 5 : undefined
  const projectedCosts10Years =
    annualChargesTotal !== undefined ? (initialFeeCost || 0) + annualChargesTotal * 10 : undefined

  return {
    initialFee: initialFeeType === 'percentage' ? initialFeePercent : initialFeeFixed,
    initialFeeType,
    ongoingFee: ongoingFeeType === 'percentage' ? ongoingFeePercent : ongoingFeeFixed,
    ongoingFeeType,
    platformFee: platformFeePercent,
    fundCharges: fundChargesPercent,
    totalFirstYearCost,
    projectedCosts5Years,
    projectedCosts10Years
  }
}


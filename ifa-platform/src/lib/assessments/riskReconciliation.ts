export type RiskAlignment = 'aligned' | 'minor_mismatch' | 'significant_mismatch'

export type RiskFlagType =
  | 'capacity_below_tolerance'
  | 'tolerance_below_capacity'
  | 'extreme_mismatch'

export interface RiskFlag {
  type: RiskFlagType
  severity: 'warning' | 'critical'
  message: string
  fcaReference?: string
}

export interface RiskReconciliationResult {
  atrScore?: number
  atrCategory?: string
  cflScore?: number
  cflCategory?: string

  finalRiskScore?: number
  finalRiskCategory: string
  alignment: RiskAlignment

  flags: RiskFlag[]
  explanation: string
}

function scoreToCategory(score: number | undefined): string {
  if (score === undefined || score === null || !Number.isFinite(score)) return 'Not assessed'
  if (score <= 2) return 'Very Low'
  if (score <= 3) return 'Low'
  if (score <= 4) return 'Low-Medium'
  if (score <= 6) return 'Medium'
  if (score <= 7) return 'Medium-High'
  if (score <= 8) return 'High'
  return 'Very High'
}

function determineAlignment(atrScore?: number, cflScore?: number): RiskAlignment {
  if (atrScore === undefined || cflScore === undefined) return 'aligned'
  const diff = Math.abs(atrScore - cflScore)
  if (diff <= 2) return 'aligned'
  if (diff <= 4) return 'minor_mismatch'
  return 'significant_mismatch'
}

export function calculateReconciledRisk(params: {
  atrScore?: number
  atrCategory?: string
  cflScore?: number
  cflCategory?: string
  atrWeight?: number
  cflWeight?: number
}): RiskReconciliationResult {
  const atrWeight = params.atrWeight ?? 0.4
  const cflWeight = params.cflWeight ?? 0.6

  const atrScore = params.atrScore
  const cflScore = params.cflScore
  const atrCategory = params.atrCategory || scoreToCategory(atrScore)
  const cflCategory = params.cflCategory || scoreToCategory(cflScore)

  const flags: RiskFlag[] = []

  if (atrScore !== undefined && cflScore !== undefined) {
    if (atrScore >= 7 && cflScore <= 4) {
      flags.push({
        type: 'capacity_below_tolerance',
        severity: 'critical',
        message: 'High risk tolerance but limited capacity to absorb losses.',
        fcaReference: 'COBS 9.2.2R'
      })
    }

    if (atrScore <= 3 && cflScore >= 7) {
      flags.push({
        type: 'tolerance_below_capacity',
        severity: 'warning',
        message: 'Conservative risk tolerance despite higher capacity for loss.'
      })
    }

    if (Math.abs(atrScore - cflScore) >= 5) {
      flags.push({
        type: 'extreme_mismatch',
        severity: 'critical',
        message: 'Significant mismatch between Attitude to Risk and Capacity for Loss.'
      })
    }
  }

  const finalRiskScore =
    atrScore !== undefined && cflScore !== undefined
      ? Math.round(atrScore * atrWeight + cflScore * cflWeight)
      : atrScore ?? cflScore

  const alignment = determineAlignment(atrScore, cflScore)
  const finalRiskCategory = scoreToCategory(finalRiskScore)

  const explanation =
    atrScore !== undefined && cflScore !== undefined
      ? `Final score uses a weighted approach: ATR × ${atrWeight} + CFL × ${cflWeight}.`
      : 'Final score uses the available risk assessment (ATR or CFL).'

  return {
    atrScore,
    atrCategory,
    cflScore,
    cflCategory,
    finalRiskScore,
    finalRiskCategory,
    alignment,
    flags,
    explanation
  }
}


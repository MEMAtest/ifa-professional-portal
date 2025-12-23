import type { RiskCategory } from './types'

export function normalizeRiskLevelFromPulledScore(score: number | undefined): number | undefined {
  if (score === undefined || score === null) return undefined
  if (!Number.isFinite(score)) return undefined

  // Some parts of the app store ATR/CFL as `level * 15`. Convert back if needed.
  if (score > 10) {
    const scaled = score / 15
    if (scaled >= 1 && scaled <= 10) return Math.round(scaled)
  }

  if (score >= 1 && score <= 10) return Math.round(score)
  return undefined
}

export function scoreToRiskCategory(score: number | undefined): RiskCategory {
  if (!score) return 'Not assessed'
  if (score <= 2) return 'Very Low'
  if (score <= 3) return 'Low'
  if (score <= 4) return 'Low-Medium'
  if (score <= 6) return 'Medium'
  if (score <= 7) return 'Medium-High'
  if (score <= 8) return 'High'
  return 'Very High'
}

export function mapAttitudeToRiskToScore(attitude?: string): number | undefined {
  const normalized = (attitude || '').toLowerCase()
  if (!normalized) return undefined
  if (normalized.includes('very low')) return 2
  if (normalized.includes('low')) return 4
  if (normalized.includes('medium')) return 6
  if (normalized.includes('high') && !normalized.includes('very high')) return 8
  if (normalized.includes('very high')) return 10
  return undefined
}

export function mapMaxLossToCapacityScore(maxLoss?: string): number | undefined {
  const normalized = (maxLoss || '').toLowerCase()
  if (!normalized) return undefined
  if (normalized.includes('0-5')) return 2
  if (normalized.includes('5-10')) return 4
  if (normalized.includes('10-20')) return 6
  if (normalized.includes('20-30')) return 8
  if (normalized.includes('more than 30')) return 10
  return undefined
}

export function parseInvestmentTimelineToYears(timeline: string | undefined): number | undefined {
  const normalized = (timeline || '').toLowerCase()
  if (!normalized) return undefined
  if (normalized.includes('less than 3')) return 2
  if (normalized.includes('3-5')) return 4
  if (normalized.includes('5-10')) return 7
  if (normalized.includes('10-15')) return 12
  if (normalized.includes('more than 15')) return 20
  return undefined
}

export function parseSimpleAllocation(
  text: string
): { equities: number; bonds: number; cash: number; alternatives: number } | undefined {
  const lower = text.toLowerCase()
  const parse = (label: string) => {
    const match = lower.match(new RegExp(`${label}\\s*:\\s*(\\d{1,3})\\s*%`))
    return match ? Number(match[1]) : 0
  }

  const equities = parse('equities')
  const bonds = parse('bonds')
  const cash = parse('cash')
  const alternatives = parse('alternatives')
  const total = equities + bonds + cash + alternatives
  if (total <= 0) return undefined
  return { equities, bonds, cash, alternatives }
}


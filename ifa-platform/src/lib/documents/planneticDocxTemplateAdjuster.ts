export interface PlanneticAdjustmentResult {
  html: string
  applied: Record<string, number>
  warnings: string[]
}

function applyReplace(
  input: string,
  regex: RegExp,
  replacement: string
): { output: string; count: number } {
  let count = 0
  const output = input.replace(regex, () => {
    count += 1
    return replacement
  })
  return { output, count }
}

/**
 * Plannetic-provided templates use bracket placeholders like `[FIRM NAME]`.
 * We normalize them into our canonical `{{UPPER_SNAKE_CASE}}` placeholders.
 */
export function adjustPlanneticDocxTemplateHtml(html: string): PlanneticAdjustmentResult {
  let out = html
  const applied: Record<string, number> = {}
  const warnings: string[] = []

  const r1 = applyReplace(out, /\[\s*FIRM\s+NAME\s*\]/gi, '{{FIRM_NAME}}')
  out = r1.output
  applied.FIRM_NAME = r1.count

  const r2 = applyReplace(out, /\[\s*FRN\s*\]/gi, '{{FIRM_FCA_NUMBER}}')
  out = r2.output
  applied.FIRM_FCA_NUMBER = r2.count

  const r3 = applyReplace(
    out,
    /\[\s*independent\s*\/\s*restricted\s*\]/gi,
    '{{ADVICE_TYPE}}'
  )
  out = r3.output
  applied.ADVICE_TYPE = r3.count

  // The "About Our Services" doc uses two identical fee placeholders: `[£ / %]`.
  // Map occurrence 1 -> INITIAL_ADVICE_FEE, occurrence 2 -> ONGOING_ADVICE_FEE.
  const feeRegex = /\[\s*\u00A3\s*\/\s*%\s*\]/g
  let feeIndex = 0
  out = out.replace(feeRegex, () => {
    feeIndex += 1
    if (feeIndex === 1) return '{{INITIAL_ADVICE_FEE}}'
    if (feeIndex === 2) return '{{ONGOING_ADVICE_FEE}}'
    return '{{ADVICE_FEE}}'
  })
  applied.FEE_PLACEHOLDER = feeIndex

  if (feeIndex > 2) {
    warnings.push('More than two fee placeholders found; extra occurrences mapped to {{ADVICE_FEE}}.')
  }

  return { html: out, applied, warnings }
}

export function inferRequiresSignatureFromText(rawText: string): boolean {
  const text = (rawText || '').toLowerCase()
  if (!text.trim()) return false

  if (text.includes('no signature is required')) return false
  if (text.includes('client signature')) return true
  if (text.includes('signed by client')) return true

  return false
}

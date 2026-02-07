import { describe, it, expect } from 'vitest'
import { adjustPlanneticDocxTemplateHtml, inferRequiresSignatureFromText } from './planneticDocxTemplateAdjuster'

describe('planneticDocxTemplateAdjuster', () => {
  it('normalizes known bracket placeholders', () => {
    const input = [
      '<p>[FIRM NAME] is authorised.</p>',
      '<p>FCA Firm Reference Number: [FRN]</p>',
      '<p>We provide [independent / restricted] advice.</p>',
    ].join('')

    const { html, applied, warnings } = adjustPlanneticDocxTemplateHtml(input)

    expect(html).toContain('{{FIRM_NAME}}')
    expect(html).toContain('{{FIRM_FCA_NUMBER}}')
    expect(html).toContain('{{ADVICE_TYPE}}')
    expect(applied.FIRM_NAME).toBe(1)
    expect(applied.FIRM_FCA_NUMBER).toBe(1)
    expect(applied.ADVICE_TYPE).toBe(1)
    expect(warnings).toEqual([])
  })

  it('maps fee placeholders by occurrence', () => {
    const pound = '\u00A3'
    const input = `<p>Initial advice fee: [${pound} / %]</p><p>Ongoing advice fee: [${pound} / %]</p>`
    const { html, applied } = adjustPlanneticDocxTemplateHtml(input)
    expect(html).toContain('{{INITIAL_ADVICE_FEE}}')
    expect(html).toContain('{{ONGOING_ADVICE_FEE}}')
    expect(applied.FEE_PLACEHOLDER).toBe(2)
  })

  it('infers signature requirement from text', () => {
    expect(inferRequiresSignatureFromText('No signature is required.')).toBe(false)
    expect(inferRequiresSignatureFromText('Client Signature: ____ Date: ____')).toBe(true)
    expect(inferRequiresSignatureFromText('Signed by Client: ____ Date: ____')).toBe(true)
  })
})

import { describe, it, expect } from 'vitest'
import { extractTemplateVariableKeys, buildTemplateVariablesPayload } from './templateVariables'

describe('templateVariables', () => {
  it('extracts keys from {{KEY}} and helpers', () => {
    const tpl = [
      '<p>{{CLIENT_NAME}}</p>',
      '{{#if HAS_WARNINGS}}<p>{{WARNING}}</p>{{/if}}',
      '{{#each ITEMS}}<p>{{this.name}} - {{this.value}}</p>{{/each}}'
    ].join('\n')

    const keys = extractTemplateVariableKeys(tpl)
    expect(keys).toHaveLength(6)
    expect(keys).toEqual(
      expect.arrayContaining(['CLIENT_NAME', 'HAS_WARNINGS', 'ITEMS', 'WARNING', 'name', 'value'])
    )
  })

  it('builds a payload compatible with document_templates.template_variables', () => {
    const keys = ['CLIENT_NAME', 'FIRM_NAME']
    const payload = buildTemplateVariablesPayload(keys)

    expect(payload.variables.map(v => v.key)).toEqual(keys)
    expect(payload.merge_fields).toEqual({
      CLIENT_NAME: 'Client Name',
      FIRM_NAME: 'Firm Name'
    })
  })
})

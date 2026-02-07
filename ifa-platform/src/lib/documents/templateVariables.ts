export type TemplateVariableType = 'text' | 'number' | 'date' | 'boolean'

export interface TemplateVariableDefinition {
  key: string
  label: string
  type: TemplateVariableType
  required: boolean
  defaultValue?: string
}

function keyToLabel(key: string): string {
  return key
    .trim()
    .split('_')
    .filter(Boolean)
    .map((part) => part.slice(0, 1).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
    .trim()
}

/**
 * Extracts all variable keys used by our simple template syntax:
 * - `{{KEY}}`
 * - `{{#if KEY}} ... {{/if}}`
 * - `{{#each KEY}} ... {{/each}}`
 *
 * Notes:
 * - Keys are returned as-is (case preserved), sorted, unique.
 * - This intentionally does not try to parse nested expressions.
 */
export function extractTemplateVariableKeys(template: string): string[] {
  const keys = new Set<string>()

  const add = (value: unknown) => {
    if (typeof value !== 'string') return
    const trimmed = value.trim()
    if (!trimmed) return
    keys.add(trimmed)
  }

  for (const match of template.matchAll(/{{\s*([A-Za-z0-9_]+)\s*}}/g)) {
    add(match[1])
  }

  for (const match of template.matchAll(/{{#if\s+([A-Za-z0-9_]+)\s*}}/g)) {
    add(match[1])
  }

  for (const match of template.matchAll(/{{#each\s+([A-Za-z0-9_]+)\s*}}/g)) {
    add(match[1])
  }

  // `{{this.KEY}}` inside loops
  for (const match of template.matchAll(/{{\s*this\.([A-Za-z0-9_]+)\s*}}/g)) {
    add(match[1])
  }

  return Array.from(keys).sort((a, b) => a.localeCompare(b))
}

export function buildTemplateVariablesPayload(
  keys: string[],
  overrides?: Partial<Record<string, Partial<TemplateVariableDefinition>>>
): { variables: TemplateVariableDefinition[]; merge_fields: Record<string, string> } {
  const variables: TemplateVariableDefinition[] = []
  const merge_fields: Record<string, string> = {}

  for (const key of keys) {
    const base: TemplateVariableDefinition = {
      key,
      label: keyToLabel(key),
      type: 'text',
      required: false
    }

    const merged = { ...base, ...(overrides?.[key] || {}) } as TemplateVariableDefinition
    variables.push(merged)
    merge_fields[merged.key] = merged.label
  }

  return { variables, merge_fields }
}


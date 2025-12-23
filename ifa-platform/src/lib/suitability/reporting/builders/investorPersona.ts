import type { Database } from '@/types/database.types'

import type { SuitabilityInvestorPersona } from '../types'
import { asTrimmedString, pickFirstString, safeArray } from '../utils'

type PersonaRow = Database['public']['Tables']['persona_assessments']['Row']

export function buildInvestorPersona(persona?: PersonaRow | null): SuitabilityInvestorPersona | undefined {
  if (!persona?.client_id) return undefined

  return {
    personaType: asTrimmedString(persona.persona_type),
    personaLevel: asTrimmedString(persona.persona_level),
    confidence: typeof persona.confidence === 'number' && Number.isFinite(persona.confidence) ? persona.confidence : undefined,
    motivations: safeArray<string>(persona.motivations),
    fears: safeArray<string>(persona.fears),
    assessedAtISO: pickFirstString(persona.assessment_date, persona.created_at)
  }
}


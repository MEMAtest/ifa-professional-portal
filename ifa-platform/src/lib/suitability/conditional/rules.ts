// =====================================================
// FILE: src/lib/suitability/conditional/rules.ts
// CONDITIONAL RULESET AGGREGATOR (behavior preserved, split into rulesets)
// =====================================================

import type { ConditionalRule } from './types'

import { arrangementsRules } from './rulesets/arrangements'
import { financialRules } from './rulesets/financial'
import { knowledgeRules } from './rulesets/knowledge'
import { objectiveRules } from './rulesets/objectives'
import { personalRules } from './rulesets/personal'
import { regulatoryRules } from './rulesets/regulatory'
import { riskRules } from './rulesets/risk'
import { vulnerabilityRules } from './rulesets/vulnerability'

export type { ConditionalAction, ConditionalRule } from './types'

export const conditionalRules: ConditionalRule[] = [
  ...personalRules,
  ...objectiveRules,
  ...financialRules,
  ...riskRules,
  ...knowledgeRules,
  ...arrangementsRules,
  ...vulnerabilityRules,
  ...regulatoryRules
]


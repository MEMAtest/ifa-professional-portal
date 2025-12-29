import { OTHER_OPTION } from './constants'
import type { FirmService, ProdDetails } from './types'

export const resolveDetail = (value: string, otherValue: string) => {
  if (value === OTHER_OPTION) {
    return otherValue.trim() || OTHER_OPTION
  }
  return value
}

export const buildProdSummary = (details: ProdDetails, services: FirmService[]) => {
  const governanceOwner = resolveDetail(details.governanceOwner, details.governanceOwnerOther)
  const oversightBody = resolveDetail(details.oversightBody, details.oversightBodyOther)
  const reviewFrequency = resolveDetail(details.reviewFrequency, details.reviewFrequencyOther)
  const monitoringCadence = resolveDetail(details.monitoringCadence, details.monitoringCadenceOther)
  const escalationProcess = resolveDetail(details.escalationProcess, details.escalationProcessOther)
  const targetMarket = resolveDetail(details.targetMarketDefinition, details.targetMarketDefinitionOther)
  const vulnerabilityApproach = resolveDetail(details.vulnerabilityApproach, details.vulnerabilityApproachOther)
  const fairValue = resolveDetail(details.fairValueAssessment, details.fairValueAssessmentOther)
  const distributionChannels = details.distributionChannels.length > 0
    ? details.distributionChannels
      .map((channel) =>
        channel === OTHER_OPTION ? details.distributionOther.trim() || OTHER_OPTION : channel
      )
      .filter(Boolean)
    : ['Not specified']

  const activeServices = services
    .filter((service) => service.active)
    .map((service) => service.name)
    .filter(Boolean)
  const totalChecks = services
    .filter((service) => service.active)
    .reduce((sum, service) => sum + service.targetMarketChecks.length, 0)

  const summaryLines = [
    `Governance: PROD overseen by ${governanceOwner} with ${oversightBody} oversight; reviews ${reviewFrequency}.`,
    `Monitoring: ${monitoringCadence}; escalation and remediation via ${escalationProcess}.`,
    `Target market: ${targetMarket}. Distribution: ${distributionChannels.join(', ')}.`,
    `Vulnerability approach: ${vulnerabilityApproach}. Fair value assessment: ${fairValue}.`
  ]

  if (activeServices.length > 0) {
    summaryLines.push(`Services in scope: ${activeServices.join(', ')}.`)
  } else {
    summaryLines.push('Services in scope: none configured yet.')
  }

  if (totalChecks > 0) {
    summaryLines.push(`Target market checks: ${totalChecks} checks across ${activeServices.length} services.`)
  }

  if (details.additionalNotes.trim()) {
    summaryLines.push(`Additional notes: ${details.additionalNotes.trim()}`)
  }

  return summaryLines.join('\n')
}

export const getNextProdReviewDate = (frequency: string, frequencyOther: string) => {
  const resolved = resolveDetail(frequency, frequencyOther)
  const now = new Date()
  const next = new Date(now)

  if (resolved === 'Quarterly') {
    next.setMonth(next.getMonth() + 3)
  } else if (resolved === 'Bi-annual') {
    next.setMonth(next.getMonth() + 6)
  } else if (resolved === 'Annual') {
    next.setFullYear(next.getFullYear() + 1)
  } else if (resolved === 'Ad-hoc') {
    next.setDate(next.getDate() + 30)
  } else {
    next.setDate(next.getDate() + 90)
  }

  return next.toISOString()
}

export const resolveDistributionChannels = (details: ProdDetails) => {
  const channels = details.distributionChannels.length > 0 ? details.distributionChannels : []
  const resolved = channels
    .map((channel) =>
      channel === OTHER_OPTION ? details.distributionOther.trim() || OTHER_OPTION : channel
    )
    .filter(Boolean)
  return resolved.length > 0 ? resolved : ['Not specified']
}

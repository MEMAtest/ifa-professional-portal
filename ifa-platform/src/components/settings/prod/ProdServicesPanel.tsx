'use client'

import React from 'react'
import Link from 'next/link'
import { Save } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { DEFAULT_PROD_SERVICES } from '@/lib/prod/serviceCatalog'
import {
  OTHER_OPTION,
  GOVERNANCE_OWNER_OPTIONS,
  OVERSIGHT_BODY_OPTIONS,
  REVIEW_FREQUENCY_OPTIONS,
  TARGET_MARKET_OPTIONS,
  DISTRIBUTION_CHANNEL_OPTIONS,
  FAIR_VALUE_OPTIONS,
  MONITORING_OPTIONS,
  ESCALATION_OPTIONS,
  VULNERABILITY_OPTIONS
} from '@/components/settings/prod/constants'
import { prodServiceSteps } from '@/components/settings/prod/steps'
import type {
  FirmServicesState,
  LatestProdDocument,
  ProdDetails,
  ProdReviewTask,
  ProdVersion,
  ServicesSaveStatus
} from '@/components/settings/prod/types'

interface ProdServicesPanelProps {
  servicesStep: number
  onStepChange: (step: number) => void
  prodDetails: ProdDetails
  onUpdateProdDetails: (updates: Partial<ProdDetails>) => void
  onToggleDistributionChannel: (channel: string) => void
  firmServices: FirmServicesState
  onAddService: () => void
  onUpdateService: (serviceId: string, updates: Partial<FirmServicesState['services'][number]>) => void
  onRemoveService: (serviceId: string) => void
  onApplyServiceTemplate: (serviceId: string, templateId: string) => void
  onAddTargetMarketCheck: (serviceId: string, checkLabel: string) => void
  onRemoveTargetMarketCheck: (serviceId: string, checkLabel: string) => void
  customCheckInputs: Record<string, string>
  onCustomCheckInputChange: (serviceId: string, value: string) => void
  onAddCustomCheck: (serviceId: string) => void
  prodSummary: string
  servicesSaveStatus: ServicesSaveStatus
  saving: boolean
  onSave: () => void
  onOpenStoredDocument: () => void
  onCopySummary: () => void
  prodReviewTask: ProdReviewTask | null
  prodVersions: ProdVersion[]
  onRestoreVersion: (version: ProdVersion) => void
  latestProdDocument: LatestProdDocument | null
}

export function ProdServicesPanel({
  servicesStep,
  onStepChange,
  prodDetails,
  onUpdateProdDetails,
  onToggleDistributionChannel,
  firmServices,
  onAddService,
  onUpdateService,
  onRemoveService,
  onApplyServiceTemplate,
  onAddTargetMarketCheck,
  onRemoveTargetMarketCheck,
  customCheckInputs,
  onCustomCheckInputChange,
  onAddCustomCheck,
  prodSummary,
  servicesSaveStatus,
  saving,
  onSave,
  onOpenStoredDocument,
  onCopySummary,
  prodReviewTask,
  prodVersions,
  onRestoreVersion,
  latestProdDocument
}: ProdServicesPanelProps) {
  const currentServiceStep = prodServiceSteps[servicesStep] ?? prodServiceSteps[0]
  const servicesStepIndex = Math.max(0, prodServiceSteps.findIndex((step) => step.id === 'services'))

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle>Services &amp; PROD</CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Guided setup aligned to FCA PROD expectations for governance, target market and monitoring.
            </p>
          </div>
          <div className="text-sm text-gray-500">
            Step {servicesStep + 1} of {prodServiceSteps.length}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          These settings feed the Compliance Hub&#8217;s PROD &amp; Services view.{' '}
          <Link href="/compliance?tab=prod-services" className="font-medium underline">
            View in Compliance Hub
          </Link>
          .
        </div>
        <div className="flex flex-wrap gap-2">
          {prodServiceSteps.map((step, index) => (
            <button
              key={step.id}
              type="button"
              onClick={() => onStepChange(index)}
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${
                index === servicesStep
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <span className="text-xs font-semibold">{index + 1}</span>
              <span>{step.label}</span>
            </button>
          ))}
        </div>

        {currentServiceStep.id === 'governance' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Governance owner
                </label>
                <select
                  value={prodDetails.governanceOwner}
                  onChange={(e) => onUpdateProdDetails({ governanceOwner: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  {GOVERNANCE_OWNER_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {prodDetails.governanceOwner === OTHER_OPTION && (
                  <input
                    type="text"
                    value={prodDetails.governanceOwnerOther}
                    onChange={(e) => onUpdateProdDetails({ governanceOwnerOther: e.target.value })}
                    className="mt-2 w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    placeholder="Describe governance owner"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Oversight body
                </label>
                <select
                  value={prodDetails.oversightBody}
                  onChange={(e) => onUpdateProdDetails({ oversightBody: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  {OVERSIGHT_BODY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {prodDetails.oversightBody === OTHER_OPTION && (
                  <input
                    type="text"
                    value={prodDetails.oversightBodyOther}
                    onChange={(e) => onUpdateProdDetails({ oversightBodyOther: e.target.value })}
                    className="mt-2 w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    placeholder="Describe oversight body"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Review frequency
                </label>
                <select
                  value={prodDetails.reviewFrequency}
                  onChange={(e) => onUpdateProdDetails({ reviewFrequency: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  {REVIEW_FREQUENCY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {prodDetails.reviewFrequency === OTHER_OPTION && (
                  <input
                    type="text"
                    value={prodDetails.reviewFrequencyOther}
                    onChange={(e) => onUpdateProdDetails({ reviewFrequencyOther: e.target.value })}
                    className="mt-2 w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    placeholder="Describe review cadence"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monitoring cadence
                </label>
                <select
                  value={prodDetails.monitoringCadence}
                  onChange={(e) => onUpdateProdDetails({ monitoringCadence: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  {MONITORING_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {prodDetails.monitoringCadence === OTHER_OPTION && (
                  <input
                    type="text"
                    value={prodDetails.monitoringCadenceOther}
                    onChange={(e) => onUpdateProdDetails({ monitoringCadenceOther: e.target.value })}
                    className="mt-2 w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    placeholder="Describe monitoring cadence"
                  />
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Escalation and remediation
              </label>
              <select
                value={prodDetails.escalationProcess}
                onChange={(e) => onUpdateProdDetails({ escalationProcess: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                {ESCALATION_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {prodDetails.escalationProcess === OTHER_OPTION && (
                <input
                  type="text"
                  value={prodDetails.escalationProcessOther}
                  onChange={(e) => onUpdateProdDetails({ escalationProcessOther: e.target.value })}
                  className="mt-2 w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe escalation process"
                />
              )}
            </div>
          </div>
        )}

        {currentServiceStep.id === 'target-market' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Target market definition
              </label>
              <select
                value={prodDetails.targetMarketDefinition}
                onChange={(e) => onUpdateProdDetails({ targetMarketDefinition: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                {TARGET_MARKET_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
              {prodDetails.targetMarketDefinition === OTHER_OPTION && (
                <input
                  type="text"
                  value={prodDetails.targetMarketDefinitionOther}
                  onChange={(e) => onUpdateProdDetails({ targetMarketDefinitionOther: e.target.value })}
                  className="mt-2 w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe target market definition"
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Distribution channels
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {DISTRIBUTION_CHANNEL_OPTIONS.map((channel) => (
                  <label key={channel} className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={prodDetails.distributionChannels.includes(channel)}
                      onChange={() => onToggleDistributionChannel(channel)}
                      className="rounded border-gray-300"
                    />
                    {channel}
                  </label>
                ))}
              </div>
              {prodDetails.distributionChannels.includes(OTHER_OPTION) && (
                <input
                  type="text"
                  value={prodDetails.distributionOther}
                  onChange={(e) => onUpdateProdDetails({ distributionOther: e.target.value })}
                  className="mt-2 w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="Describe other distribution channel"
                />
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Vulnerability approach
                </label>
                <select
                  value={prodDetails.vulnerabilityApproach}
                  onChange={(e) => onUpdateProdDetails({ vulnerabilityApproach: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  {VULNERABILITY_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {prodDetails.vulnerabilityApproach === OTHER_OPTION && (
                  <input
                    type="text"
                    value={prodDetails.vulnerabilityApproachOther}
                    onChange={(e) => onUpdateProdDetails({ vulnerabilityApproachOther: e.target.value })}
                    className="mt-2 w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    placeholder="Describe vulnerability approach"
                  />
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fair value assessment
                </label>
                <select
                  value={prodDetails.fairValueAssessment}
                  onChange={(e) => onUpdateProdDetails({ fairValueAssessment: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  {FAIR_VALUE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {prodDetails.fairValueAssessment === OTHER_OPTION && (
                  <input
                    type="text"
                    value={prodDetails.fairValueAssessmentOther}
                    onChange={(e) => onUpdateProdDetails({ fairValueAssessmentOther: e.target.value })}
                    className="mt-2 w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                    placeholder="Describe fair value assessment"
                  />
                )}
              </div>
            </div>
          </div>
        )}

        {currentServiceStep.id === 'services' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Firm services catalog</h3>
                <p className="text-sm text-gray-600">
                  These services populate client service selection and target market checks.
                </p>
              </div>
              <Button variant="outline" onClick={onAddService}>
                Add Service
              </Button>
            </div>

            {firmServices.services.length === 0 ? (
              <div className="border border-dashed rounded-lg p-6 text-center text-sm text-gray-500">
                No services added yet. Add a service to start defining target market checks.
              </div>
            ) : (
              <div className="space-y-4">
                {firmServices.services.map((service) => (
                  <div key={service.id} className="border rounded-lg p-4 space-y-3">
                    {(() => {
                      const matchedTemplate = DEFAULT_PROD_SERVICES.find((template) => template.label === service.name)
                      const templateId = matchedTemplate?.id || 'custom'
                      const suggestedChecks = matchedTemplate?.targetMarketChecks || []

                      return (
                        <>
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                            <div className="flex-1">
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Service template
                              </label>
                              <select
                                value={templateId}
                                onChange={(e) => onApplyServiceTemplate(service.id, e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
                              >
                                <option value="custom">Custom</option>
                                {DEFAULT_PROD_SERVICES.map((template) => (
                                  <option key={template.id} value={template.id}>
                                    {template.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div className="flex-1">
                              <label className="block text-xs font-medium text-gray-600 mb-1">
                                Service name (editable)
                              </label>
                              <input
                                type="text"
                                value={service.name}
                                onChange={(e) => onUpdateService(service.id, { name: e.target.value })}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                                placeholder="Service name"
                              />
                            </div>
                            <div className="flex items-center gap-3">
                              <label className="flex items-center gap-2 text-xs text-gray-600">
                                <input
                                  type="checkbox"
                                  checked={service.active}
                                  onChange={(e) => onUpdateService(service.id, { active: e.target.checked })}
                                  className="rounded border-gray-300"
                                />
                                Active
                              </label>
                              <Button variant="ghost" onClick={() => onRemoveService(service.id)}>
                                Remove
                              </Button>
                            </div>
                          </div>

                          <textarea
                            rows={2}
                            value={service.description}
                            onChange={(e) => onUpdateService(service.id, { description: e.target.value })}
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                            placeholder="Service description"
                          />

                          <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                              Target market checks
                            </label>
                            <div className="flex flex-wrap gap-2">
                              {service.targetMarketChecks.length > 0 ? (
                                service.targetMarketChecks.map((check) => (
                                  <span
                                    key={check}
                                    className="inline-flex items-center gap-2 text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full"
                                  >
                                    {check}
                                    <button
                                      type="button"
                                      onClick={() => onRemoveTargetMarketCheck(service.id, check)}
                                      className="text-gray-500 hover:text-gray-700"
                                    >
                                      ×
                                    </button>
                                  </span>
                                ))
                              ) : (
                                <span className="text-xs text-gray-500">No checks added yet.</span>
                              )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                  Add from suggested list
                                </label>
                                <select
                                  value=""
                                  onChange={(e) => {
                                    onAddTargetMarketCheck(service.id, e.target.value)
                                  }}
                                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
                                  disabled={suggestedChecks.length === 0}
                                >
                                  <option value="">
                                    {suggestedChecks.length > 0 ? 'Select a check' : 'No suggested checks'}
                                  </option>
                                  {suggestedChecks.map((check) => (
                                    <option key={check.id} value={check.label}>
                                      {check.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                  Add custom check
                                </label>
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={customCheckInputs[service.id] || ''}
                                    onChange={(e) => onCustomCheckInputChange(service.id, e.target.value)}
                                    className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
                                    placeholder="Enter check"
                                  />
                                  <Button
                                    variant="outline"
                                    onClick={() => onAddCustomCheck(service.id)}
                                  >
                                    Add
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              PROD notes
                            </label>
                            <textarea
                              rows={2}
                              value={service.prodNotes}
                              onChange={(e) => onUpdateService(service.id, { prodNotes: e.target.value })}
                              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                              placeholder="Any PROD considerations specific to this service."
                            />
                          </div>
                        </>
                      )
                    })()}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {currentServiceStep.id === 'summary' && (
          <div className="space-y-4">
            {servicesSaveStatus.state === 'success' && (
              <div className="rounded-lg border border-green-200 bg-green-50/60 p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-700">
                      Your PROD settings are saved and ready to use.
                    </p>
                    <p className="text-xs text-green-700/80">
                      Choose your next action below.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={onOpenStoredDocument} disabled={!latestProdDocument?.path}>
                      Open Saved PDF
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => window.location.assign('/compliance?tab=prod-services')}
                    >
                      Compliance Hub
                    </Button>
                    <Button variant="outline" onClick={() => window.location.assign('/documents?type=prod_policy')}>
                      View Documents
                    </Button>
                    <Button variant="outline" onClick={() => window.location.assign('/reviews')}>
                      View Reviews
                    </Button>
                    <Button
                      variant="outline"
                      onClick={onCopySummary}
                    >
                      Copy Summary
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => onStepChange(servicesStepIndex)}
                    >
                      Review Services
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {prodReviewTask && (
              <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-4">
                <p className="text-sm font-medium text-blue-700">PROD review task scheduled</p>
                <p className="text-xs text-blue-700/80">
                  Next review due on{' '}
                  {new Date(prodReviewTask.due_date).toLocaleDateString('en-GB', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })}
                  .
                </p>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Additional notes (optional)
              </label>
              <textarea
                rows={3}
                value={prodDetails.additionalNotes}
                onChange={(e) => onUpdateProdDetails({ additionalNotes: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                placeholder="Add any firm-specific notes to include in the FCA PROD summary."
              />
            </div>

            <div className="rounded-lg border border-blue-100 bg-blue-50/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">
                FCA PROD Summary (auto-generated)
              </p>
              <p className="mt-2 text-sm text-gray-700 whitespace-pre-line">
                {prodSummary}
              </p>
            </div>

            <div className="text-xs text-gray-500">
              This summary is generated from your governance, target market and service configuration.
            </div>

            {prodVersions.length > 0 && (
              <div className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Version history</p>
                    <p className="text-xs text-gray-500">Last {prodVersions.length} saved versions</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {prodVersions.map((version) => (
                    <div
                      key={version.id}
                      className="flex flex-col gap-2 rounded-md border border-gray-100 bg-gray-50/60 p-3 md:flex-row md:items-center md:justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          Version {version.version}
                        </p>
                        <p className="text-xs text-gray-500">
                          Saved {new Date(version.saved_at).toLocaleDateString('en-GB', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                      <Button variant="outline" onClick={() => onRestoreVersion(version)}>
                        Restore
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between border-t pt-4">
          <Button
            variant="outline"
            onClick={() => onStepChange(Math.max(0, servicesStep - 1))}
            disabled={servicesStep === 0}
          >
            Back
          </Button>
          {servicesSaveStatus.state !== 'idle' && (
            <div
              className={`text-sm ${
                servicesSaveStatus.state === 'success'
                  ? 'text-green-600'
                  : servicesSaveStatus.state === 'error'
                    ? 'text-red-600'
                    : 'text-gray-500'
              }`}
            >
              {servicesSaveStatus.message}
            </div>
          )}
          {servicesStep < prodServiceSteps.length - 1 ? (
            <Button onClick={() => onStepChange(Math.min(prodServiceSteps.length - 1, servicesStep + 1))}>
              Next
            </Button>
          ) : (
            <Button onClick={onSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Services & PROD'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

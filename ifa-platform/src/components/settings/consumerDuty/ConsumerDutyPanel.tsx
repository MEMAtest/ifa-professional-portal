'use client'

import React from 'react'
import Link from 'next/link'
import { Save, Copy, Clock, CheckCircle, AlertTriangle, Info } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { consumerDutySteps } from './steps'
import {
  OTHER_OPTION,
  TARGET_MARKET_APPROACH_OPTIONS,
  PRODUCT_CATEGORY_OPTIONS,
  HARM_MITIGATION_OPTIONS,
  DISTRIBUTION_STRATEGY_OPTIONS,
  ASSESSMENT_METHOD_OPTIONS,
  REVIEW_FREQUENCY_OPTIONS,
  TRANSPARENCY_APPROACH_OPTIONS,
  BENCHMARKING_APPROACH_OPTIONS,
  COMMUNICATION_STYLE_OPTIONS,
  PRODUCT_EXPLANATION_OPTIONS,
  VULNERABLE_CLIENT_COMMUNICATION_OPTIONS,
  TESTING_APPROACH_OPTIONS,
  SERVICE_QUALITY_OPTIONS,
  COMPLAINT_HANDLING_OPTIONS,
  VULNERABLE_SUPPORT_OPTIONS,
  ACCESS_CHANNEL_OPTIONS
} from './constants'
import type { ConsumerDutyFramework, ConsumerDutySaveStatus, ConsumerDutyVersion } from './types'

interface ConsumerDutyPanelProps {
  step: number
  onStepChange: (step: number) => void
  framework: ConsumerDutyFramework
  onUpdateProducts: (updates: Partial<ConsumerDutyFramework['products']>) => void
  onUpdatePricing: (updates: Partial<ConsumerDutyFramework['pricing']>) => void
  onUpdateCommunication: (updates: Partial<ConsumerDutyFramework['communication']>) => void
  onUpdateSupport: (updates: Partial<ConsumerDutyFramework['support']>) => void
  onUpdateNotes: (notes: string) => void
  onToggleProductCategory: (category: string) => void
  onToggleCommunicationStyle: (style: string) => void
  onToggleAccessChannel: (channel: string) => void
  summary: string
  saveStatus: ConsumerDutySaveStatus
  saving: boolean
  onSave: () => void
  onCopySummary: () => void
  versions: ConsumerDutyVersion[]
  onRestoreVersion: (version: ConsumerDutyVersion) => void
}

// Helper component for dropdown with "Other" option
const SelectWithOther = ({
  value,
  otherValue,
  options,
  onChange,
  onOtherChange,
  label
}: {
  value: string
  otherValue: string
  options: string[]
  onChange: (val: string) => void
  onOtherChange: (val: string) => void
  label: string
}) => (
  <div className="space-y-2">
    <label className="block text-sm font-medium text-gray-700">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
    {value === OTHER_OPTION && (
      <input
        type="text"
        value={otherValue}
        onChange={(e) => onOtherChange(e.target.value)}
        placeholder="Please specify..."
        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
      />
    )}
  </div>
)

// Helper component for multi-select checkboxes
const MultiSelectCheckboxes = ({
  selected,
  options,
  otherValue,
  onToggle,
  onOtherChange,
  label
}: {
  selected: string[]
  options: string[]
  otherValue: string
  onToggle: (val: string) => void
  onOtherChange: (val: string) => void
  label: string
}) => (
  <div className="space-y-2">
    <label className="block text-sm font-medium text-gray-700">{label}</label>
    <div className="space-y-2">
      {options.map((opt) => (
        <label key={opt} className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={selected.includes(opt)}
            onChange={() => onToggle(opt)}
            className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
          />
          <span className="text-sm text-gray-700">{opt}</span>
        </label>
      ))}
    </div>
    {selected.includes(OTHER_OPTION) && (
      <input
        type="text"
        value={otherValue}
        onChange={(e) => onOtherChange(e.target.value)}
        placeholder="Please specify..."
        className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 mt-2"
      />
    )}
  </div>
)

export function ConsumerDutyPanel({
  step,
  onStepChange,
  framework,
  onUpdateProducts,
  onUpdatePricing,
  onUpdateCommunication,
  onUpdateSupport,
  onUpdateNotes,
  onToggleProductCategory,
  onToggleCommunicationStyle,
  onToggleAccessChannel,
  summary,
  saveStatus,
  saving,
  onSave,
  onCopySummary,
  versions,
  onRestoreVersion
}: ConsumerDutyPanelProps) {
  const currentStep = consumerDutySteps[step] ?? consumerDutySteps[0]

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
          <div>
            <CardTitle>Consumer Duty Framework</CardTitle>
            <p className="text-sm text-gray-600 mt-1">
              Define your firm&apos;s approach to Consumer Duty (FCA PRIN 2A) across the four outcomes.
            </p>
          </div>
          <div className="text-sm text-gray-500">
            Step {step + 1} of {consumerDutySteps.length}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-700">
          These responses feed the Compliance Hub&#8217;s Consumer Duty view.{' '}
          <Link href="/compliance?tab=consumer-duty" className="font-medium underline">
            View in Compliance Hub
          </Link>
          .
        </div>
        {/* Step navigation */}
        <div className="flex flex-wrap gap-2">
          {consumerDutySteps.map((s, index) => (
            <button
              key={s.id}
              type="button"
              onClick={() => onStepChange(index)}
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${
                index === step
                  ? 'border-blue-600 bg-blue-50 text-blue-700'
                  : 'border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
            >
              <span className="text-xs font-semibold">{index + 1}</span>
              <span>{s.label}</span>
            </button>
          ))}
        </div>

        {/* Step content */}
        <div className="border rounded-lg p-6 bg-gray-50">
          {/* Products & Services */}
          {currentStep.id === 'products' && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Products & Services Outcome</h3>
                  <p className="text-sm text-gray-600">Products and services are designed to meet the needs of consumers in the target market</p>
                </div>
              </div>

              <SelectWithOther
                label="How do you define your target market?"
                value={framework.products.targetMarketApproach}
                otherValue={framework.products.targetMarketApproachOther}
                options={TARGET_MARKET_APPROACH_OPTIONS}
                onChange={(val) => onUpdateProducts({ targetMarketApproach: val })}
                onOtherChange={(val) => onUpdateProducts({ targetMarketApproachOther: val })}
              />

              <MultiSelectCheckboxes
                label="Which product categories do you advise on?"
                selected={framework.products.productCategories}
                options={PRODUCT_CATEGORY_OPTIONS}
                otherValue={framework.products.productCategoriesOther}
                onToggle={onToggleProductCategory}
                onOtherChange={(val) => onUpdateProducts({ productCategoriesOther: val })}
              />

              <SelectWithOther
                label="How do you mitigate potential harms to clients?"
                value={framework.products.harmMitigationStrategy}
                otherValue={framework.products.harmMitigationStrategyOther}
                options={HARM_MITIGATION_OPTIONS}
                onChange={(val) => onUpdateProducts({ harmMitigationStrategy: val })}
                onOtherChange={(val) => onUpdateProducts({ harmMitigationStrategyOther: val })}
              />

              <SelectWithOther
                label="What is your distribution strategy?"
                value={framework.products.distributionStrategy}
                otherValue={framework.products.distributionStrategyOther}
                options={DISTRIBUTION_STRATEGY_OPTIONS}
                onChange={(val) => onUpdateProducts({ distributionStrategy: val })}
                onOtherChange={(val) => onUpdateProducts({ distributionStrategyOther: val })}
              />
            </div>
          )}

          {/* Price & Value */}
          {currentStep.id === 'pricing' && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Price & Value Outcome</h3>
                  <p className="text-sm text-gray-600">Products and services provide fair value to retail customers</p>
                </div>
              </div>

              <SelectWithOther
                label="How do you assess value for clients?"
                value={framework.pricing.assessmentMethod}
                otherValue={framework.pricing.assessmentMethodOther}
                options={ASSESSMENT_METHOD_OPTIONS}
                onChange={(val) => onUpdatePricing({ assessmentMethod: val })}
                onOtherChange={(val) => onUpdatePricing({ assessmentMethodOther: val })}
              />

              <SelectWithOther
                label="How often do you review pricing and value?"
                value={framework.pricing.reviewFrequency}
                otherValue={framework.pricing.reviewFrequencyOther}
                options={REVIEW_FREQUENCY_OPTIONS}
                onChange={(val) => onUpdatePricing({ reviewFrequency: val })}
                onOtherChange={(val) => onUpdatePricing({ reviewFrequencyOther: val })}
              />

              <SelectWithOther
                label="How do you ensure fee transparency?"
                value={framework.pricing.transparencyApproach}
                otherValue={framework.pricing.transparencyApproachOther}
                options={TRANSPARENCY_APPROACH_OPTIONS}
                onChange={(val) => onUpdatePricing({ transparencyApproach: val })}
                onOtherChange={(val) => onUpdatePricing({ transparencyApproachOther: val })}
              />

              <SelectWithOther
                label="How do you benchmark your pricing?"
                value={framework.pricing.benchmarkingApproach}
                otherValue={framework.pricing.benchmarkingApproachOther}
                options={BENCHMARKING_APPROACH_OPTIONS}
                onChange={(val) => onUpdatePricing({ benchmarkingApproach: val })}
                onOtherChange={(val) => onUpdatePricing({ benchmarkingApproachOther: val })}
              />
            </div>
          )}

          {/* Consumer Understanding */}
          {currentStep.id === 'understanding' && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Info className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Consumer Understanding Outcome</h3>
                  <p className="text-sm text-gray-600">Communications enable consumers to make effective, timely and properly informed decisions</p>
                </div>
              </div>

              <MultiSelectCheckboxes
                label="What communication styles do you use?"
                selected={framework.communication.communicationStyle}
                options={COMMUNICATION_STYLE_OPTIONS}
                otherValue={framework.communication.communicationStyleOther}
                onToggle={onToggleCommunicationStyle}
                onOtherChange={(val) => onUpdateCommunication({ communicationStyleOther: val })}
              />

              <SelectWithOther
                label="How do you explain products to clients?"
                value={framework.communication.productExplanationMethod}
                otherValue={framework.communication.productExplanationMethodOther}
                options={PRODUCT_EXPLANATION_OPTIONS}
                onChange={(val) => onUpdateCommunication({ productExplanationMethod: val })}
                onOtherChange={(val) => onUpdateCommunication({ productExplanationMethodOther: val })}
              />

              <SelectWithOther
                label="How do you adapt communications for vulnerable clients?"
                value={framework.communication.vulnerableClientApproach}
                otherValue={framework.communication.vulnerableClientApproachOther}
                options={VULNERABLE_CLIENT_COMMUNICATION_OPTIONS}
                onChange={(val) => onUpdateCommunication({ vulnerableClientApproach: val })}
                onOtherChange={(val) => onUpdateCommunication({ vulnerableClientApproachOther: val })}
              />

              <SelectWithOther
                label="How do you test client understanding?"
                value={framework.communication.testingApproach}
                otherValue={framework.communication.testingApproachOther}
                options={TESTING_APPROACH_OPTIONS}
                onChange={(val) => onUpdateCommunication({ testingApproach: val })}
                onOtherChange={(val) => onUpdateCommunication({ testingApproachOther: val })}
              />
            </div>
          )}

          {/* Consumer Support */}
          {currentStep.id === 'support' && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-amber-100 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Consumer Support Outcome</h3>
                  <p className="text-sm text-gray-600">Consumers receive the support they need throughout the product/service lifecycle</p>
                </div>
              </div>

              <SelectWithOther
                label="What service quality standards do you maintain?"
                value={framework.support.serviceQualityStandards}
                otherValue={framework.support.serviceQualityStandardsOther}
                options={SERVICE_QUALITY_OPTIONS}
                onChange={(val) => onUpdateSupport({ serviceQualityStandards: val })}
                onOtherChange={(val) => onUpdateSupport({ serviceQualityStandardsOther: val })}
              />

              <SelectWithOther
                label="How do you handle complaints?"
                value={framework.support.complaintHandlingProcess}
                otherValue={framework.support.complaintHandlingProcessOther}
                options={COMPLAINT_HANDLING_OPTIONS}
                onChange={(val) => onUpdateSupport({ complaintHandlingProcess: val })}
                onOtherChange={(val) => onUpdateSupport({ complaintHandlingProcessOther: val })}
              />

              <SelectWithOther
                label="How do you support vulnerable clients?"
                value={framework.support.vulnerableClientSupport}
                otherValue={framework.support.vulnerableClientSupportOther}
                options={VULNERABLE_SUPPORT_OPTIONS}
                onChange={(val) => onUpdateSupport({ vulnerableClientSupport: val })}
                onOtherChange={(val) => onUpdateSupport({ vulnerableClientSupportOther: val })}
              />

              <MultiSelectCheckboxes
                label="What access channels do you provide?"
                selected={framework.support.accessChannels}
                options={ACCESS_CHANNEL_OPTIONS}
                otherValue={framework.support.accessChannelsOther}
                onToggle={onToggleAccessChannel}
                onOtherChange={(val) => onUpdateSupport({ accessChannelsOther: val })}
              />
            </div>
          )}

          {/* Summary */}
          {currentStep.id === 'summary' && (
            <div className="space-y-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Clock className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Framework Summary</h3>
                  <p className="text-sm text-gray-600">Review your Consumer Duty framework settings</p>
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-medium text-gray-700">Additional Notes</label>
                <textarea
                  value={framework.additionalNotes}
                  onChange={(e) => onUpdateNotes(e.target.value)}
                  rows={4}
                  placeholder="Any additional notes about your Consumer Duty implementation..."
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="bg-white border rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium text-gray-900">Generated Summary</h4>
                  <Button variant="outline" size="sm" onClick={onCopySummary}>
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                </div>
                <div className="text-sm text-gray-600 whitespace-pre-wrap font-mono bg-gray-50 p-4 rounded border max-h-80 overflow-auto">
                  {summary || 'Complete the framework steps to generate a summary.'}
                </div>
              </div>

              {/* Version history */}
              {versions.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-medium text-gray-900 mb-3">Version History</h4>
                  <div className="space-y-2 max-h-40 overflow-auto">
                    {versions.slice(0, 5).map((v) => (
                      <div key={v.id} className="flex items-center justify-between p-2 bg-white border rounded text-sm">
                        <div>
                          <span className="font-medium">v{v.version}</span>
                          <span className="text-gray-500 ml-2">
                            {new Date(v.saved_at).toLocaleDateString('en-GB')}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRestoreVersion(v)}
                        >
                          Restore
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation and save */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onStepChange(Math.max(0, step - 1))}
              disabled={step === 0}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={() => onStepChange(Math.min(consumerDutySteps.length - 1, step + 1))}
              disabled={step === consumerDutySteps.length - 1}
            >
              Next
            </Button>
          </div>

          <div className="flex items-center gap-3">
            {saveStatus.state === 'success' && (
              <span className="text-sm text-green-600 flex items-center gap-1">
                <CheckCircle className="h-4 w-4" />
                Saved
              </span>
            )}
            {saveStatus.state === 'error' && (
              <span className="text-sm text-red-600 flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" />
                {saveStatus.message || 'Error saving'}
              </span>
            )}
            <Button onClick={onSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Framework'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

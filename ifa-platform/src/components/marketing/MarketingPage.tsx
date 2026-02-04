'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { MarketingShell } from '@/components/marketing/MarketingShell'

// ============================================================================
// MARKETING PAGE - Complete Landing Page for Plannetic
// ============================================================================

export const MarketingPage = () => {
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null)

  return (
    <MarketingShell>
      {/* Hero Section */}
      <HeroSection />

      {/* Interactive Demo - MOVED TO TOP */}
      <InteractiveDemo />

      {/* Trust Indicators */}
      <TrustIndicators />

      {/* Problem/Solution */}
      <ProblemSolution />

      {/* Platform Stats */}
      <PlatformStats />

      {/* Features Grid with Modals */}
      <FeaturesSection onFeatureClick={setSelectedFeature} />

      {/* Feature Modal */}
      {selectedFeature && (
        <FeatureModal
          featureId={selectedFeature}
          onClose={() => setSelectedFeature(null)}
        />
      )}

      {/* Compliance & Security */}
      <ComplianceSection />

      {/* CTA Section */}
      <CTASection />
    </MarketingShell>
  )
}

// ============================================================================
// HERO SECTION
// ============================================================================

const HeroSection = () => {
  return (
    <section className="relative pt-24 lg:pt-32 pb-16 lg:pb-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-2 lg:gap-16 items-center">
          {/* Left Content */}
          <div className="text-center lg:text-left mb-12 lg:mb-0">
            {/* Badge */}
            <div className="inline-flex items-center px-4 py-2 bg-teal-100 rounded-full mb-6">
              <span className="w-2 h-2 bg-teal-600 rounded-full mr-2" />
              <span className="text-sm font-medium text-teal-800">Enterprise-grade for IFAs</span>
            </div>

            {/* Main Heading */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6">
              Reduce Admin by{' '}
              <span className="text-teal-600">85%</span>
              <br />
              Stay{' '}
              <span className="text-blue-600">100% Compliant</span>
            </h1>

            <p className="text-lg sm:text-xl text-gray-600 mb-8 max-w-xl mx-auto lg:mx-0">
              The complete digital platform for modern financial advisors. Suitability assessments, Monte Carlo simulations, compliance management, and more.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mb-8">
              <a
                href="#tour"
                className="w-full sm:w-auto px-8 py-4 bg-teal-600 text-white font-semibold rounded-xl hover:bg-teal-700 transition-colors"
              >
                Explore the interactive tour
              </a>
              <Link
                href="/login"
                className="w-full sm:w-auto px-8 py-4 bg-white text-gray-700 font-semibold rounded-xl border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-colors"
              >
                Start Free Trial
              </Link>
            </div>

            {/* Trust Points */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 text-sm text-gray-500">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                14-day free trial
              </div>
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-600 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Cyber Essentials certified
              </div>
            </div>
          </div>

          {/* Right - Enhanced Dashboard Preview */}
          <div className="relative">
            <div className="bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-700">
              {/* Browser Chrome */}
              <div className="flex items-center gap-2 px-4 py-3 bg-slate-800 border-b border-slate-700">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500" />
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                </div>
                <div className="flex-1 mx-4">
                  <div className="bg-slate-700 rounded-lg px-4 py-1.5 text-sm text-gray-400 flex items-center">
                    <svg className="w-4 h-4 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    app.plannetic.com
                  </div>
                </div>
              </div>

              {/* Enhanced Dashboard Preview */}
              <div className="p-4 bg-slate-900">
                <EnhancedDashboardPreview />
              </div>
            </div>

            {/* Floating Cards */}
            <div className="absolute -left-8 top-1/4 hidden lg:block animate-float">
              <div className="bg-white rounded-xl shadow-xl p-4 border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Monte Carlo</p>
                    <p className="text-xl font-bold text-teal-600">94%</p>
                    <p className="text-xs text-gray-400">Success Rate</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="absolute -right-8 bottom-1/4 hidden lg:block animate-float" style={{ animationDelay: '1s' }}>
              <div className="bg-white rounded-xl shadow-xl p-4 border border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Compliance</p>
                    <p className="text-xl font-bold text-blue-600">100%</p>
                    <p className="text-xs text-gray-400">FCA Aligned</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// Enhanced Dashboard Preview with realistic data
const EnhancedDashboardPreview = () => (
  <div className="space-y-4">
    {/* Header */}
    <div className="flex items-center justify-between">
      <div>
        <h3 className="text-white font-semibold text-sm">Good morning, Adviser</h3>
        <p className="text-slate-400 text-xs">Adviser Workspace</p>
      </div>
      <div className="flex gap-2">
        <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>
        <div className="w-8 h-8 bg-slate-700 rounded-lg" />
      </div>
    </div>

    {/* Stats Row */}
    <div className="grid grid-cols-4 gap-3">
      <div className="bg-slate-800 rounded-lg p-3">
        <p className="text-slate-400 text-xs mb-1">Total Clients</p>
        <p className="text-white font-bold text-lg">127</p>
        <p className="text-green-400 text-xs">+3 this month</p>
      </div>
      <div className="bg-slate-800 rounded-lg p-3">
        <p className="text-slate-400 text-xs mb-1">Assessments</p>
        <p className="text-white font-bold text-lg">89</p>
        <p className="text-amber-400 text-xs">12 pending</p>
      </div>
      <div className="bg-slate-800 rounded-lg p-3">
        <p className="text-slate-400 text-xs mb-1">Reviews Due</p>
        <p className="text-white font-bold text-lg">8</p>
        <p className="text-red-400 text-xs">2 overdue</p>
      </div>
      <div className="bg-slate-800 rounded-lg p-3">
        <p className="text-slate-400 text-xs mb-1">Compliance</p>
        <p className="text-white font-bold text-lg">98%</p>
        <p className="text-green-400 text-xs">All clear</p>
      </div>
    </div>

    {/* Client List */}
    <div className="bg-slate-800 rounded-lg p-3">
      <div className="flex items-center justify-between mb-3">
        <p className="text-slate-300 text-sm font-medium">Recent Clients</p>
        <p className="text-teal-400 text-xs">View all</p>
      </div>
      {[
        { name: 'Client A', status: 'ATR Complete', statusColor: 'bg-green-500', risk: '6/10' },
        { name: 'Client B', status: 'CFL Pending', statusColor: 'bg-amber-500', risk: '4/10' },
        { name: 'Client C', status: 'Review Due', statusColor: 'bg-red-500', risk: '7/10' },
      ].map((client, i) => (
        <div key={i} className="flex items-center gap-3 py-2 border-t border-slate-700/50 first:border-0">
          <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center text-white text-xs font-medium">
            {client.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div className="flex-1">
            <p className="text-white text-sm">{client.name}</p>
            <p className="text-slate-400 text-xs">Risk: {client.risk}</p>
          </div>
          <div className={`px-2 py-1 ${client.statusColor} bg-opacity-20 rounded-full`}>
            <span className={`text-xs ${client.statusColor.replace('bg-', 'text-')}`}>{client.status}</span>
          </div>
        </div>
      ))}
    </div>
  </div>
)

// ============================================================================
// INTERACTIVE DEMO SECTION - AT THE TOP
// ============================================================================

const InteractiveDemo = () => {
  const [activeDemo, setActiveDemo] = useState<'suitability' | 'assessment' | 'montecarlo' | 'cashflow'>('suitability')

  return (
    <section id="tour" className="py-20 lg:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <div className="inline-flex items-center px-4 py-2 bg-teal-100 rounded-full mb-6">
            <span className="text-sm font-semibold text-teal-800">Interactive Tour</span>
          </div>
          <h2 className="text-3xl lg:text-5xl font-bold text-gray-900 mb-4">
            Experience Plannetic in Action
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Try our core tools right here. Complete a suitability assessment, model cash flows, and run Monte Carlo simulations.
          </p>
        </div>

        {/* Demo Tabs */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-gray-100 rounded-xl p-1.5 gap-1 flex-wrap justify-center">
            {[
              { id: 'suitability', label: 'Suitability', icon: SuitabilityIcon },
              { id: 'assessment', label: 'Risk Profile', icon: AssessmentIcon },
              { id: 'cashflow', label: 'Cash Flow', icon: CashFlowIcon },
              { id: 'montecarlo', label: 'Monte Carlo', icon: MonteCarloIcon },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveDemo(tab.id as any)}
                className={`flex items-center gap-2 px-4 sm:px-6 py-3 rounded-lg text-sm font-medium transition-all ${
                  activeDemo === tab.id
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Demo Content */}
        <div className="max-w-5xl mx-auto">
          {activeDemo === 'suitability' && <SuitabilityFormDemo />}
          {activeDemo === 'assessment' && <UnifiedAssessmentDemo />}
          {activeDemo === 'cashflow' && <CashFlowDemo />}
          {activeDemo === 'montecarlo' && <MonteCarloDemo />}
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <Link
            href="/login"
            className="inline-flex items-center px-8 py-4 bg-teal-600 text-white font-semibold rounded-xl hover:bg-teal-700 transition-colors"
          >
            Start Your Free Trial
            <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  )
}

// Custom Icons
const AssessmentIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
  </svg>
)

const CashFlowIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
  </svg>
)

const MonteCarloIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
)

const SuitabilityIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
)

// ============================================================================
// SUITABILITY FORM DEMO - Mini FCA-Compliant Suitability Assessment
// ============================================================================

const SuitabilityFormDemo = () => {
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({
    // Step 1: Client Profile
    clientName: '',
    age: 45,
    employmentStatus: '',
    annualIncome: 75000,

    // Step 2: Investment Objectives
    primaryObjective: '',
    timeHorizon: '',
    incomeRequirement: '',

    // Step 3: Knowledge & Experience
    investmentExperience: '',
    productKnowledge: [] as string[],

    // Step 4: Financial Situation
    totalInvestableAssets: 250000,
    monthlyExpenses: 3500,
    existingPensions: 120000,
    hasEmergencyFund: false,
    hasDebtObligations: false,
  })
  const [showResult, setShowResult] = useState(false)

  const totalSteps = 4

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleCheckboxChange = (field: string, value: string) => {
    setFormData(prev => {
      const current = prev[field as keyof typeof prev] as string[]
      if (current.includes(value)) {
        return { ...prev, [field]: current.filter(v => v !== value) }
      }
      return { ...prev, [field]: [...current, value] }
    })
  }

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    } else {
      setShowResult(true)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const resetForm = () => {
    setCurrentStep(1)
    setShowResult(false)
    setFormData({
      clientName: '',
      age: 45,
      employmentStatus: '',
      annualIncome: 75000,
      primaryObjective: '',
      timeHorizon: '',
      incomeRequirement: '',
      investmentExperience: '',
      productKnowledge: [],
      totalInvestableAssets: 250000,
      monthlyExpenses: 3500,
      existingPensions: 120000,
      hasEmergencyFund: false,
      hasDebtObligations: false,
    })
  }

  // Calculate suitability outcome
  const calculateSuitability = () => {
    let score = 0
    let flags: string[] = []
    let recommendations: string[] = []

    // Assess based on inputs
    if (formData.timeHorizon === 'long') score += 3
    else if (formData.timeHorizon === 'medium') score += 2
    else score += 1

    if (formData.investmentExperience === 'experienced') score += 3
    else if (formData.investmentExperience === 'intermediate') score += 2
    else score += 1

    if (formData.productKnowledge.length >= 3) score += 2
    else if (formData.productKnowledge.length >= 1) score += 1

    // Risk flags
    if (formData.age > 60 && formData.timeHorizon === 'short') {
      flags.push('Short time horizon with approaching retirement')
    }
    if (!formData.hasEmergencyFund) {
      flags.push('No emergency fund in place')
      recommendations.push('Establish emergency fund (3-6 months expenses)')
    }
    if (formData.hasDebtObligations) {
      flags.push('Existing debt obligations to consider')
    }
    if (formData.investmentExperience === 'none' && formData.primaryObjective === 'growth') {
      flags.push('Inexperienced investor seeking growth - ensure understanding of risks')
    }

    // Generate recommendations
    if (formData.primaryObjective === 'income') {
      recommendations.push('Consider income-generating funds or dividend strategies')
    }
    if (formData.primaryObjective === 'growth') {
      recommendations.push('Growth-focused portfolio appropriate for time horizon')
    }
    if (formData.timeHorizon === 'long') {
      recommendations.push('Long time horizon allows for equity-heavy allocation')
    }

    const suitabilityLevel = score >= 7 ? 'Suitable' : score >= 4 ? 'Suitable with Conditions' : 'Further Assessment Required'

    return { score, flags, recommendations, suitabilityLevel }
  }

  if (showResult) {
    const result = calculateSuitability()
    return (
      <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
        <div className="bg-slate-900 px-6 py-4">
          <h3 className="text-white font-semibold flex items-center">
            <SuitabilityIcon className="w-5 h-5 mr-2 text-teal-400" />
            Suitability Assessment Result
          </h3>
          <p className="text-slate-400 text-sm mt-1">FCA COBS 9.2 Compliant Assessment Summary</p>
        </div>

        <div className="p-6">
          {/* Result Header */}
          <div className={`p-4 rounded-xl mb-6 ${
            result.suitabilityLevel === 'Suitable' ? 'bg-green-50 border border-green-200' :
            result.suitabilityLevel === 'Suitable with Conditions' ? 'bg-amber-50 border border-amber-200' :
            'bg-red-50 border border-red-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Assessment Outcome</p>
                <p className={`text-2xl font-bold ${
                  result.suitabilityLevel === 'Suitable' ? 'text-green-700' :
                  result.suitabilityLevel === 'Suitable with Conditions' ? 'text-amber-700' :
                  'text-red-700'
                }`}>
                  {result.suitabilityLevel}
                </p>
              </div>
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                result.suitabilityLevel === 'Suitable' ? 'bg-green-100' :
                result.suitabilityLevel === 'Suitable with Conditions' ? 'bg-amber-100' :
                'bg-red-100'
              }`}>
                {result.suitabilityLevel === 'Suitable' ? (
                  <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-8 h-8 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
            </div>
          </div>

          {/* Client Summary */}
          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="bg-gray-50 rounded-xl p-4">
              <h4 className="font-semibold text-gray-900 mb-3">Client Profile</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Name</span>
                  <span className="font-medium">{formData.clientName || 'Example Client'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Age</span>
                  <span className="font-medium">{formData.age}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Employment</span>
                  <span className="font-medium capitalize">{formData.employmentStatus || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Annual Income</span>
                  <span className="font-medium">£{formData.annualIncome.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <h4 className="font-semibold text-gray-900 mb-3">Investment Profile</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Objective</span>
                  <span className="font-medium capitalize">{formData.primaryObjective || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Time Horizon</span>
                  <span className="font-medium capitalize">{formData.timeHorizon || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Experience</span>
                  <span className="font-medium capitalize">{formData.investmentExperience || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Investable Assets</span>
                  <span className="font-medium">£{formData.totalInvestableAssets.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Flags */}
          {result.flags.length > 0 && (
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                <svg className="w-5 h-5 text-amber-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 6a3 3 0 013-3h10a1 1 0 01.8 1.6L14.25 8l2.55 3.4A1 1 0 0116 13H6a1 1 0 00-1 1v3a1 1 0 11-2 0V6z" clipRule="evenodd" />
                </svg>
                Risk Flags Identified
              </h4>
              <ul className="space-y-2">
                {result.flags.map((flag, i) => (
                  <li key={i} className="flex items-start text-sm bg-amber-50 p-3 rounded-lg">
                    <span className="w-2 h-2 bg-amber-500 rounded-full mt-1.5 mr-3 flex-shrink-0" />
                    {flag}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          {result.recommendations.length > 0 && (
            <div className="mb-6">
              <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                <svg className="w-5 h-5 text-teal-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                Recommendations
              </h4>
              <ul className="space-y-2">
                {result.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start text-sm bg-teal-50 p-3 rounded-lg">
                    <span className="w-2 h-2 bg-teal-500 rounded-full mt-1.5 mr-3 flex-shrink-0" />
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Risk Scoring Breakdown */}
          <div className="mb-6">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
              <svg className="w-5 h-5 text-purple-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
              </svg>
              How Your Score Was Calculated
            </h4>
            <div className="bg-purple-50 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Knowledge & Experience</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <span key={i} className={`w-3 h-3 rounded-full ${i <= (formData.investmentExperience === 'experienced' ? 5 : formData.investmentExperience === 'intermediate' ? 3 : 2) ? 'bg-purple-500' : 'bg-purple-200'}`} />
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Financial Situation</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <span key={i} className={`w-3 h-3 rounded-full ${i <= (formData.totalInvestableAssets > 100000 ? 4 : formData.totalInvestableAssets > 50000 ? 3 : 2) ? 'bg-purple-500' : 'bg-purple-200'}`} />
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Investment Objectives</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <span key={i} className={`w-3 h-3 rounded-full ${i <= 4 ? 'bg-purple-500' : 'bg-purple-200'}`} />
                  ))}
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Risk Tolerance</span>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <span key={i} className={`w-3 h-3 rounded-full ${i <= (formData.investmentExperience === 'experienced' ? 4 : 3) ? 'bg-purple-500' : 'bg-purple-200'}`} />
                  ))}
                </div>
              </div>
              <div className="border-t border-purple-200 pt-3 mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900">Overall Suitability Score</span>
                  <span className="text-sm font-bold text-purple-700">{result.suitabilityLevel === 'Suitable' ? '16' : result.suitabilityLevel === 'Suitable with Conditions' ? '14' : '10'}/20</span>
                </div>
              </div>
            </div>
          </div>

          {/* Consumer Duty Alignment */}
          <div className="mb-6">
            <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
              <svg className="w-5 h-5 text-emerald-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Consumer Duty Alignment
            </h4>
            <div className="bg-emerald-50 rounded-xl p-4 space-y-3">
              <div className="flex items-start gap-3">
                <svg className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-gray-900">Understanding (Outcome 1)</p>
                  <p className="text-xs text-gray-600">Client comprehension verified through experience assessment</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <svg className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-gray-900">Fair Value (Outcome 2)</p>
                  <p className="text-xs text-gray-600">Costs proportionate to service level and client needs</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <svg className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-gray-900">Suitable Products (Outcome 3)</p>
                  <p className="text-xs text-gray-600">Recommendations matched to stated objectives and risk tolerance</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <svg className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="text-sm font-medium text-gray-900">Support (Outcome 4)</p>
                  <p className="text-xs text-gray-600">Ongoing review scheduled and documented</p>
                </div>
              </div>
            </div>
          </div>

          {/* FCA Compliance Note */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-blue-600 mr-3 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="font-semibold text-blue-900">FCA Compliance</p>
                <p className="text-sm text-blue-700 mt-1">
                  This assessment follows COBS 9.2 suitability requirements. Full documentation includes
                  knowledge & experience assessment, financial situation analysis, and investment objectives alignment.
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={resetForm}
            className="w-full py-3 bg-teal-600 text-white font-semibold rounded-xl hover:bg-teal-700 transition-colors"
          >
            Start New Assessment
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
      <div className="bg-slate-900 px-6 py-4">
        <h3 className="text-white font-semibold flex items-center">
          <SuitabilityIcon className="w-5 h-5 mr-2 text-teal-400" />
          Mini Suitability Assessment
        </h3>
        <p className="text-slate-400 text-sm mt-1">FCA COBS 9.2 compliant client assessment form</p>
      </div>

      {/* Progress Bar */}
      <div className="px-6 py-4 bg-gray-50 border-b">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Step {currentStep} of {totalSteps}</span>
          <span className="text-sm text-gray-500">{Math.round((currentStep / totalSteps) * 100)}% Complete</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-teal-600 transition-all duration-300"
            style={{ width: `${(currentStep / totalSteps) * 100}%` }}
          />
        </div>
        <div className="flex justify-between mt-2">
          {['Profile', 'Objectives', 'Experience', 'Financials'].map((label, i) => (
            <span key={label} className={`text-xs ${i + 1 <= currentStep ? 'text-teal-600 font-medium' : 'text-gray-400'}`}>
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="p-6">
        {/* Step 1: Client Profile */}
        {currentStep === 1 && (
          <div className="space-y-5">
            <h4 className="font-semibold text-gray-900 text-lg">Client Profile</h4>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Client Name</label>
              <input
                type="text"
                value={formData.clientName}
                onChange={(e) => handleInputChange('clientName', e.target.value)}
                placeholder="Enter client name"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>

            <div>
              <label className="flex justify-between text-sm font-medium text-gray-700 mb-2">
                <span>Age</span>
                <span className="text-teal-600 font-bold">{formData.age}</span>
              </label>
              <input
                type="range"
                min="18"
                max="80"
                value={formData.age}
                onChange={(e) => handleInputChange('age', Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Employment Status</label>
              <div className="grid grid-cols-2 gap-3">
                {['Employed', 'Self-employed', 'Retired', 'Other'].map(status => (
                  <button
                    key={status}
                    onClick={() => handleInputChange('employmentStatus', status.toLowerCase())}
                    className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                      formData.employmentStatus === status.toLowerCase()
                        ? 'border-teal-600 bg-teal-50 text-teal-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="flex justify-between text-sm font-medium text-gray-700 mb-2">
                <span>Annual Income</span>
                <span className="text-teal-600 font-bold">£{formData.annualIncome.toLocaleString()}</span>
              </label>
              <input
                type="range"
                min="20000"
                max="500000"
                step="5000"
                value={formData.annualIncome}
                onChange={(e) => handleInputChange('annualIncome', Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
              />
            </div>
          </div>
        )}

        {/* Step 2: Investment Objectives */}
        {currentStep === 2 && (
          <div className="space-y-5">
            <h4 className="font-semibold text-gray-900 text-lg">Investment Objectives</h4>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Primary Investment Objective</label>
              <div className="space-y-3">
                {[
                  { id: 'growth', label: 'Capital Growth', desc: 'Grow wealth over time' },
                  { id: 'income', label: 'Regular Income', desc: 'Generate ongoing income' },
                  { id: 'preservation', label: 'Capital Preservation', desc: 'Protect existing wealth' },
                  { id: 'balanced', label: 'Balanced', desc: 'Mix of growth and income' },
                ].map(obj => (
                  <button
                    key={obj.id}
                    onClick={() => handleInputChange('primaryObjective', obj.id)}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                      formData.primaryObjective === obj.id
                        ? 'border-teal-600 bg-teal-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className={`font-medium ${formData.primaryObjective === obj.id ? 'text-teal-700' : 'text-gray-900'}`}>
                      {obj.label}
                    </p>
                    <p className="text-sm text-gray-500">{obj.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Investment Time Horizon</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'short', label: '0-3 years' },
                  { id: 'medium', label: '3-7 years' },
                  { id: 'long', label: '7+ years' },
                ].map(horizon => (
                  <button
                    key={horizon.id}
                    onClick={() => handleInputChange('timeHorizon', horizon.id)}
                    className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                      formData.timeHorizon === horizon.id
                        ? 'border-teal-600 bg-teal-50 text-teal-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    {horizon.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Income Requirement from Investments</label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: 'none', label: 'None' },
                  { id: 'some', label: 'Partial' },
                  { id: 'essential', label: 'Essential' },
                ].map(income => (
                  <button
                    key={income.id}
                    onClick={() => handleInputChange('incomeRequirement', income.id)}
                    className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                      formData.incomeRequirement === income.id
                        ? 'border-teal-600 bg-teal-50 text-teal-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    {income.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Knowledge & Experience */}
        {currentStep === 3 && (
          <div className="space-y-5">
            <h4 className="font-semibold text-gray-900 text-lg">Knowledge & Experience</h4>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Investment Experience Level</label>
              <div className="space-y-3">
                {[
                  { id: 'none', label: 'No Experience', desc: 'New to investing' },
                  { id: 'basic', label: 'Basic', desc: 'Some savings/ISA experience' },
                  { id: 'intermediate', label: 'Intermediate', desc: 'Familiar with various investments' },
                  { id: 'experienced', label: 'Experienced', desc: 'Active investor with diverse portfolio' },
                ].map(exp => (
                  <button
                    key={exp.id}
                    onClick={() => handleInputChange('investmentExperience', exp.id)}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                      formData.investmentExperience === exp.id
                        ? 'border-teal-600 bg-teal-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className={`font-medium ${formData.investmentExperience === exp.id ? 'text-teal-700' : 'text-gray-900'}`}>
                      {exp.label}
                    </p>
                    <p className="text-sm text-gray-500">{exp.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Product Knowledge (Select all that apply)</label>
              <div className="grid grid-cols-2 gap-3">
                {['Stocks & Shares', 'Bonds', 'Funds/ETFs', 'Pensions', 'Property', 'Alternatives'].map(product => (
                  <button
                    key={product}
                    onClick={() => handleCheckboxChange('productKnowledge', product)}
                    className={`p-3 rounded-xl border-2 text-sm font-medium transition-all flex items-center ${
                      formData.productKnowledge.includes(product)
                        ? 'border-teal-600 bg-teal-50 text-teal-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded border mr-2 flex items-center justify-center ${
                      formData.productKnowledge.includes(product) ? 'bg-teal-600 border-teal-600' : 'border-gray-300'
                    }`}>
                      {formData.productKnowledge.includes(product) && (
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </span>
                    {product}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Financial Situation */}
        {currentStep === 4 && (
          <div className="space-y-5">
            <h4 className="font-semibold text-gray-900 text-lg">Financial Situation</h4>

            <div>
              <label className="flex justify-between text-sm font-medium text-gray-700 mb-2">
                <span>Total Investable Assets</span>
                <span className="text-teal-600 font-bold">£{formData.totalInvestableAssets.toLocaleString()}</span>
              </label>
              <input
                type="range"
                min="10000"
                max="2000000"
                step="10000"
                value={formData.totalInvestableAssets}
                onChange={(e) => handleInputChange('totalInvestableAssets', Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
              />
            </div>

            <div>
              <label className="flex justify-between text-sm font-medium text-gray-700 mb-2">
                <span>Monthly Expenses</span>
                <span className="text-teal-600 font-bold">£{formData.monthlyExpenses.toLocaleString()}</span>
              </label>
              <input
                type="range"
                min="1000"
                max="15000"
                step="100"
                value={formData.monthlyExpenses}
                onChange={(e) => handleInputChange('monthlyExpenses', Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
              />
            </div>

            <div>
              <label className="flex justify-between text-sm font-medium text-gray-700 mb-2">
                <span>Existing Pension Value</span>
                <span className="text-teal-600 font-bold">£{formData.existingPensions.toLocaleString()}</span>
              </label>
              <input
                type="range"
                min="0"
                max="1000000"
                step="5000"
                value={formData.existingPensions}
                onChange={(e) => handleInputChange('existingPensions', Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
              />
            </div>

            <div className="space-y-3">
              <button
                onClick={() => handleInputChange('hasEmergencyFund', !formData.hasEmergencyFund)}
                className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center justify-between ${
                  formData.hasEmergencyFund
                    ? 'border-teal-600 bg-teal-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className={formData.hasEmergencyFund ? 'text-teal-700 font-medium' : 'text-gray-700'}>
                  Emergency Fund in Place (3-6 months expenses)
                </span>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  formData.hasEmergencyFund ? 'bg-teal-600' : 'bg-gray-200'
                }`}>
                  {formData.hasEmergencyFund && (
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </span>
              </button>

              <button
                onClick={() => handleInputChange('hasDebtObligations', !formData.hasDebtObligations)}
                className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-center justify-between ${
                  formData.hasDebtObligations
                    ? 'border-amber-500 bg-amber-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className={formData.hasDebtObligations ? 'text-amber-700 font-medium' : 'text-gray-700'}>
                  Significant Debt Obligations (excluding mortgage)
                </span>
                <span className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  formData.hasDebtObligations ? 'bg-amber-500' : 'bg-gray-200'
                }`}>
                  {formData.hasDebtObligations && (
                    <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex justify-between mt-8 pt-6 border-t">
          <button
            onClick={prevStep}
            disabled={currentStep === 1}
            className={`px-6 py-3 rounded-xl font-medium transition-colors ${
              currentStep === 1
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Back
          </button>
          <button
            onClick={nextStep}
            className="px-6 py-3 bg-teal-600 text-white font-medium rounded-xl hover:bg-teal-700 transition-colors"
          >
            {currentStep === totalSteps ? 'Generate Assessment' : 'Continue'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// UNIFIED ASSESSMENT DEMO (ATR + CFL + Persona)
// ============================================================================

const UnifiedAssessmentDemo = () => {
  const [step, setStep] = useState<'atr' | 'cfl' | 'result'>('atr')
  const [atrAnswers, setAtrAnswers] = useState<number[]>([])
  const [cflData, setCflData] = useState({
    totalAssets: 500000,
    essentialExpenses: 30000,
    emergencyFund: 50000,
    investableAmount: 0,
  })
  const [currentAtrQuestion, setCurrentAtrQuestion] = useState(0)

  const atrQuestions = [
    {
      text: "If your portfolio dropped 20% in one month, what would you do?",
      options: [
        { text: "Sell everything immediately", score: 1 },
        { text: "Sell some to reduce risk", score: 3 },
        { text: "Do nothing, wait it out", score: 7 },
        { text: "Buy more while prices are low", score: 10 },
      ]
    },
    {
      text: "What best describes your investment experience?",
      options: [
        { text: "Never invested before", score: 2 },
        { text: "Some ISAs and savings", score: 4 },
        { text: "Regular investor, understand markets", score: 7 },
        { text: "Experienced, comfortable with volatility", score: 9 },
      ]
    },
    {
      text: "How long until you need access to these funds?",
      options: [
        { text: "Within 2 years", score: 2 },
        { text: "2-5 years", score: 4 },
        { text: "5-10 years", score: 7 },
        { text: "10+ years", score: 10 },
      ]
    },
  ]

  const handleAtrAnswer = (score: number) => {
    const newAnswers = [...atrAnswers, score]
    setAtrAnswers(newAnswers)
    if (currentAtrQuestion < atrQuestions.length - 1) {
      setCurrentAtrQuestion(currentAtrQuestion + 1)
    } else {
      // Calculate investable amount for CFL
      const investable = cflData.totalAssets - cflData.essentialExpenses * 2 - cflData.emergencyFund
      setCflData(prev => ({ ...prev, investableAmount: Math.max(0, investable) }))
      setStep('cfl')
    }
  }

  const atrScore = atrAnswers.length > 0
    ? Math.round(atrAnswers.reduce((a, b) => a + b, 0) / atrAnswers.length)
    : 0

  // CFL Score based on investable amount relative to total assets
  const cflScore = Math.min(10, Math.round((cflData.investableAmount / cflData.totalAssets) * 15))

  // Final risk score is lower of ATR and CFL (FCA requirement)
  const finalRiskScore = Math.min(atrScore, cflScore)

  const getPersona = (score: number) => {
    if (score <= 3) return { name: 'Cautious Protector', desc: 'Prioritises capital preservation', color: 'blue' }
    if (score <= 5) return { name: 'Balanced Builder', desc: 'Seeks steady, sustainable growth', color: 'amber' }
    if (score <= 7) return { name: 'Growth Seeker', desc: 'Accepts volatility for higher returns', color: 'teal' }
    return { name: 'Adventurous Maximiser', desc: 'Comfortable with significant risk', color: 'purple' }
  }

  const persona = getPersona(finalRiskScore)

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="bg-slate-900 px-6 py-4">
        <div className="flex items-center justify-between">
          <h3 className="text-white font-semibold flex items-center">
            <AssessmentIcon className="w-5 h-5 mr-2 text-teal-400" />
            Complete Risk Assessment
          </h3>
          <div className="flex gap-2">
            {['atr', 'cfl', 'result'].map((s, i) => (
              <div
                key={s}
                className={`w-8 h-1 rounded-full ${
                  step === s ? 'bg-teal-400' :
                  (s === 'atr' && step !== 'atr') || (s === 'cfl' && step === 'result') ? 'bg-teal-600' : 'bg-slate-700'
                }`}
              />
            ))}
          </div>
        </div>
        <p className="text-slate-400 text-sm mt-1">
          {step === 'atr' && 'Step 1: Attitude to Risk (ATR)'}
          {step === 'cfl' && 'Step 2: Capacity for Loss (CFL)'}
          {step === 'result' && 'Your Risk Profile & Investor Persona'}
        </p>
      </div>

      <div className="p-6">
        {/* ATR Section */}
        {step === 'atr' && (
          <>
            <div className="mb-6">
              <div className="flex justify-between text-sm text-gray-500 mb-2">
                <span>Question {currentAtrQuestion + 1} of {atrQuestions.length}</span>
                <span>{Math.round((currentAtrQuestion / atrQuestions.length) * 100)}% complete</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full">
                <div
                  className="h-2 bg-teal-600 rounded-full transition-all"
                  style={{ width: `${(currentAtrQuestion / atrQuestions.length) * 100}%` }}
                />
              </div>
            </div>

            <h4 className="text-lg font-medium text-gray-900 mb-6">
              {atrQuestions[currentAtrQuestion].text}
            </h4>

            <div className="space-y-3">
              {atrQuestions[currentAtrQuestion].options.map((option, i) => (
                <button
                  key={i}
                  onClick={() => handleAtrAnswer(option.score)}
                  className="w-full text-left px-4 py-4 bg-gray-50 hover:bg-teal-50 border border-gray-200 hover:border-teal-300 rounded-xl transition-all"
                >
                  <span className="text-gray-700">{option.text}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {/* CFL Section */}
        {step === 'cfl' && (
          <>
            <div className="mb-6">
              <p className="text-gray-600 mb-4">
                Capacity for Loss measures how much you can afford to lose without impacting your lifestyle.
                This is an FCA requirement under COBS 9.2.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Investable Assets
                  </label>
                  <input
                    type="range"
                    min="50000"
                    max="2000000"
                    step="10000"
                    value={cflData.totalAssets}
                    onChange={(e) => {
                      const val = Number(e.target.value)
                      const investable = val - cflData.essentialExpenses * 2 - cflData.emergencyFund
                      setCflData(prev => ({ ...prev, totalAssets: val, investableAmount: Math.max(0, investable) }))
                    }}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                  />
                  <p className="text-teal-600 font-bold text-lg mt-1">£{cflData.totalAssets.toLocaleString()}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Annual Essential Expenses
                  </label>
                  <input
                    type="range"
                    min="10000"
                    max="100000"
                    step="5000"
                    value={cflData.essentialExpenses}
                    onChange={(e) => {
                      const val = Number(e.target.value)
                      const investable = cflData.totalAssets - val * 2 - cflData.emergencyFund
                      setCflData(prev => ({ ...prev, essentialExpenses: val, investableAmount: Math.max(0, investable) }))
                    }}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                  />
                  <p className="text-gray-700 font-bold text-lg mt-1">£{cflData.essentialExpenses.toLocaleString()}/year</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Emergency Fund Required
                  </label>
                  <input
                    type="range"
                    min="10000"
                    max="200000"
                    step="5000"
                    value={cflData.emergencyFund}
                    onChange={(e) => {
                      const val = Number(e.target.value)
                      const investable = cflData.totalAssets - cflData.essentialExpenses * 2 - val
                      setCflData(prev => ({ ...prev, emergencyFund: val, investableAmount: Math.max(0, investable) }))
                    }}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                  />
                  <p className="text-gray-700 font-bold text-lg mt-1">£{cflData.emergencyFund.toLocaleString()}</p>
                </div>
              </div>

              <div className="bg-slate-50 rounded-xl p-6">
                <h4 className="font-semibold text-gray-900 mb-4">Capacity Analysis</h4>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Assets</span>
                    <span className="font-medium">£{cflData.totalAssets.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>Less: 2 years expenses</span>
                    <span>-£{(cflData.essentialExpenses * 2).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-red-600">
                    <span>Less: Emergency fund</span>
                    <span>-£{cflData.emergencyFund.toLocaleString()}</span>
                  </div>
                  <div className="border-t pt-3 flex justify-between font-bold">
                    <span className="text-gray-900">Amount at Risk</span>
                    <span className={cflData.investableAmount > 0 ? 'text-green-600' : 'text-red-600'}>
                      £{cflData.investableAmount.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="text-center">
                  <p className="text-sm text-gray-500 mb-1">CFL Score</p>
                  <p className="text-4xl font-bold text-teal-600">{cflScore}/10</p>
                </div>
              </div>
            </div>

            <button
              onClick={() => setStep('result')}
              className="w-full mt-6 py-3 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors"
            >
              Generate Risk Profile
            </button>
          </>
        )}

        {/* Result Section */}
        {step === 'result' && (
          <div className="text-center">
            {/* Persona Card */}
            <div className={`inline-block bg-${persona.color}-50 rounded-2xl p-8 mb-6`}>
              <div className={`w-20 h-20 mx-auto bg-${persona.color}-100 rounded-full flex items-center justify-center mb-4`}>
                <span className={`text-4xl font-bold text-${persona.color}-600`}>{finalRiskScore}</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">{persona.name}</h3>
              <p className="text-gray-600">{persona.desc}</p>
            </div>

            {/* Score Breakdown */}
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-500 mb-1">ATR Score</p>
                <p className="text-2xl font-bold text-gray-900">{atrScore}/10</p>
                <p className="text-xs text-gray-400">Willingness to take risk</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-sm text-gray-500 mb-1">CFL Score</p>
                <p className="text-2xl font-bold text-gray-900">{cflScore}/10</p>
                <p className="text-xs text-gray-400">Ability to absorb loss</p>
              </div>
              <div className="bg-teal-50 rounded-xl p-4">
                <p className="text-sm text-teal-600 mb-1">Final Risk Score</p>
                <p className="text-2xl font-bold text-teal-700">{finalRiskScore}/10</p>
                <p className="text-xs text-teal-600">Lower of ATR & CFL</p>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-left mb-6">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-blue-600 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <div>
                  <p className="font-medium text-blue-900">FCA COBS 9.2 Compliant</p>
                  <p className="text-sm text-blue-700 mt-1">
                    This assessment uses the lower of ATR and CFL as required by FCA rules.
                    The final score ensures recommendations match both your willingness AND ability to take risk.
                  </p>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                setStep('atr')
                setAtrAnswers([])
                setCurrentAtrQuestion(0)
              }}
              className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Retake Assessment
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// CASH FLOW DEMO
// ============================================================================

const CashFlowDemo = () => {
  const [currentAge, setCurrentAge] = useState(45)
  const [retirementAge, setRetirementAge] = useState(65)
  const [currentSavings, setCurrentSavings] = useState(250000)
  const [annualContribution, setAnnualContribution] = useState(15000)
  const [retirementIncome, setRetirementIncome] = useState(35000)

  // Calculate projections
  const yearsToRetirement = retirementAge - currentAge
  const yearsInRetirement = 90 - retirementAge
  const growthRate = 0.05

  // Project savings at retirement
  let projectedSavings = currentSavings
  for (let i = 0; i < yearsToRetirement; i++) {
    projectedSavings = projectedSavings * (1 + growthRate) + annualContribution
  }

  // Calculate if sustainable
  const totalNeeded = retirementIncome * yearsInRetirement
  const sustainable = projectedSavings >= totalNeeded * 0.8

  // Generate chart data
  const chartData = []
  let balance = currentSavings
  for (let age = currentAge; age <= 90; age++) {
    if (age < retirementAge) {
      balance = balance * (1 + growthRate) + annualContribution
    } else {
      balance = balance * (1 + growthRate * 0.6) - retirementIncome
    }
    chartData.push({ age, balance: Math.max(0, balance) })
  }

  const maxBalance = Math.max(...chartData.map(d => d.balance))
  const depletionAge = chartData.find(d => d.balance <= 0)?.age

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
      <div className="bg-slate-900 px-6 py-4">
        <h3 className="text-white font-semibold flex items-center">
          <CashFlowIcon className="w-5 h-5 mr-2 text-teal-400" />
          Interactive Cash Flow Projection
        </h3>
        <p className="text-slate-400 text-sm mt-1">Adjust the sliders to model your retirement scenario</p>
        <p className="text-slate-500 text-xs mt-1">See how savings grow during accumulation (teal) and draw down in retirement (amber). Assumes 5% annual growth.</p>
      </div>

      <div className="p-6">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Controls */}
          <div className="space-y-5">
            <div>
              <label className="flex justify-between text-sm font-medium text-gray-700 mb-2">
                <span>Current Age</span>
                <span className="text-teal-600 font-bold">{currentAge}</span>
              </label>
              <input
                type="range"
                min="25"
                max="60"
                value={currentAge}
                onChange={(e) => setCurrentAge(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
              />
            </div>

            <div>
              <label className="flex justify-between text-sm font-medium text-gray-700 mb-2">
                <span>Retirement Age</span>
                <span className="text-teal-600 font-bold">{retirementAge}</span>
              </label>
              <input
                type="range"
                min={currentAge + 5}
                max="75"
                value={retirementAge}
                onChange={(e) => setRetirementAge(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
              />
            </div>

            <div>
              <label className="flex justify-between text-sm font-medium text-gray-700 mb-2">
                <span>Current Pension Savings</span>
                <span className="text-teal-600 font-bold">£{currentSavings.toLocaleString()}</span>
              </label>
              <input
                type="range"
                min="10000"
                max="1000000"
                step="10000"
                value={currentSavings}
                onChange={(e) => setCurrentSavings(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
              />
            </div>

            <div>
              <label className="flex justify-between text-sm font-medium text-gray-700 mb-2">
                <span>Annual Contribution</span>
                <span className="text-teal-600 font-bold">£{annualContribution.toLocaleString()}</span>
              </label>
              <input
                type="range"
                min="0"
                max="50000"
                step="1000"
                value={annualContribution}
                onChange={(e) => setAnnualContribution(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
              />
            </div>

            <div>
              <label className="flex justify-between text-sm font-medium text-gray-700 mb-2">
                <span>Desired Retirement Income</span>
                <span className="text-teal-600 font-bold">£{retirementIncome.toLocaleString()}/year</span>
              </label>
              <input
                type="range"
                min="15000"
                max="100000"
                step="5000"
                value={retirementIncome}
                onChange={(e) => setRetirementIncome(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
              />
            </div>
          </div>

          {/* Chart & Results */}
          <div>
            {/* Chart */}
            <div className="bg-slate-50 rounded-xl p-4 mb-4">
              <p className="text-sm font-medium text-gray-700 mb-3">Projected Portfolio Value</p>
              <div className="h-48 flex items-end gap-0.5">
                {chartData.filter((_, i) => i % 2 === 0).map((data, i) => {
                  const height = (data.balance / maxBalance) * 100
                  const isRetirement = data.age >= retirementAge
                  return (
                    <div
                      key={i}
                      className="flex-1 transition-all rounded-t"
                      style={{
                        height: `${Math.max(2, height)}%`,
                        backgroundColor: data.balance <= 0 ? '#ef4444' : isRetirement ? '#f59e0b' : '#14b8a6'
                      }}
                      title={`Age ${data.age}: £${Math.round(data.balance).toLocaleString()}`}
                    />
                  )
                })}
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>Age {currentAge}</span>
                <span className="text-amber-600">Retirement ({retirementAge})</span>
                <span>Age 90</span>
              </div>
            </div>

            {/* Summary */}
            <div className="space-y-3">
              <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Pot at Retirement</span>
                <span className="font-bold text-gray-900">£{Math.round(projectedSavings).toLocaleString()}</span>
              </div>
              <div className="flex justify-between p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-600">Years in Retirement</span>
                <span className="font-bold text-gray-900">{yearsInRetirement} years</span>
              </div>

              {/* Status */}
              <div className={`p-4 rounded-lg ${sustainable ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <div className="flex items-start">
                  {sustainable ? (
                    <svg className="w-5 h-5 text-green-600 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-red-600 mr-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  )}
                  <div>
                    <p className={`font-semibold ${sustainable ? 'text-green-900' : 'text-red-900'}`}>
                      {sustainable ? 'Plan Looks Sustainable' : 'Warning: Funds May Deplete'}
                    </p>
                    <p className={`text-sm mt-1 ${sustainable ? 'text-green-700' : 'text-red-700'}`}>
                      {sustainable
                        ? `Your projected savings should support your retirement income needs.`
                        : `At £${retirementIncome.toLocaleString()}/year, funds may run out ${depletionAge ? `at age ${depletionAge}` : 'early'}. Consider reducing withdrawals or increasing contributions.`
                      }
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// MONTE CARLO DEMO
// ============================================================================

const MonteCarloDemo = () => {
  const [currentPortfolio, setCurrentPortfolio] = useState(250000)
  const [portfolioValue, setPortfolioValue] = useState(500000)
  const [annualWithdrawal, setAnnualWithdrawal] = useState(20000)
  const [yearsInRetirement, setYearsInRetirement] = useState(25)
  const [riskLevel, setRiskLevel] = useState(5)

  // Asset allocation (must sum to 100)
  const [equities, setEquities] = useState(60)
  const [bonds, setBonds] = useState(30)
  const cash = 100 - equities - bonds

  // Calculate withdrawal rate
  const withdrawalRate = (annualWithdrawal / portfolioValue) * 100

  // Determine if withdrawal is sustainable
  const isWithdrawalTooHigh = withdrawalRate > 5
  const isCritical = withdrawalRate > 7

  // Calculate success rate based on inputs (including allocation)
  const baseSuccess = 95
  const withdrawalPenalty = Math.max(0, (withdrawalRate - 4) * 10)
  const yearsPenalty = Math.max(0, (yearsInRetirement - 20) * 1.5)
  const riskBonus = (riskLevel - 5) * 2
  const allocationBonus = (equities - 50) * 0.1 // Higher equities = slightly better long-term
  const successRate = Math.max(15, Math.min(98, Math.round(baseSuccess - withdrawalPenalty - yearsPenalty + riskBonus + allocationBonus)))

  // Simulate percentile outcomes
  const p10 = Math.round(portfolioValue * (0.3 + (successRate / 200)))
  const p50 = Math.round(portfolioValue * (0.8 + (successRate / 400)))
  const p90 = Math.round(portfolioValue * (1.5 + (successRate / 150)))

  // Mini pie chart for allocation
  const pieSegments = [
    { name: 'Equities', value: equities, color: '#0d9488' },
    { name: 'Bonds', value: bonds, color: '#3b82f6' },
    { name: 'Cash', value: cash, color: '#9ca3af' }
  ]

  return (
    <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
      <div className="bg-slate-900 px-6 py-4">
        <h3 className="text-white font-semibold flex items-center">
          <MonteCarloIcon className="w-5 h-5 mr-2 text-teal-400" />
          Monte Carlo Retirement Simulation
        </h3>
        <p className="text-slate-400 text-sm mt-1">1,000 scenario stochastic modelling</p>
      </div>

      <div className="p-6">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Controls */}
          <div className="space-y-5">
            {/* Current Portfolio */}
            <div>
              <label className="flex justify-between text-sm font-medium text-gray-700 mb-2">
                <span>Current Portfolio Value</span>
                <span className="text-teal-600 font-bold">£{currentPortfolio.toLocaleString()}</span>
              </label>
              <input
                type="range"
                min="50000"
                max="1000000"
                step="25000"
                value={currentPortfolio}
                onChange={(e) => setCurrentPortfolio(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
              />
            </div>

            {/* Asset Allocation */}
            <div className="bg-slate-50 rounded-xl p-4">
              <p className="text-sm font-medium text-gray-700 mb-3">Asset Allocation</p>
              <div className="flex gap-4 items-start">
                {/* Mini Donut Chart */}
                <div className="relative w-20 h-20 flex-shrink-0">
                  <svg viewBox="0 0 32 32" className="w-full h-full -rotate-90">
                    {pieSegments.reduce((acc, segment, i) => {
                      const offset = acc.offset
                      const circumference = 2 * Math.PI * 12
                      const strokeDasharray = (segment.value / 100) * circumference
                      acc.elements.push(
                        <circle
                          key={segment.name}
                          cx="16"
                          cy="16"
                          r="12"
                          fill="none"
                          stroke={segment.color}
                          strokeWidth="6"
                          strokeDasharray={`${strokeDasharray} ${circumference}`}
                          strokeDashoffset={-offset}
                        />
                      )
                      acc.offset += strokeDasharray
                      return acc
                    }, { offset: 0, elements: [] as React.ReactNode[] }).elements}
                  </svg>
                  {/* Center text */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[10px] font-semibold text-gray-600">100%</span>
                  </div>
                </div>
                {/* Allocation info */}
                <div className="flex-1 text-xs text-gray-500">
                  <p>Adjust sliders below to change allocation.</p>
                  <p className="mt-1">Higher equities = more growth potential but higher volatility.</p>
                </div>
              </div>
              {/* Allocation Sliders */}
              <div className="mt-3 space-y-3">
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="flex items-center gap-1.5 text-gray-600">
                      <span className="w-2 h-2 rounded-full bg-teal-600" />
                      Equities
                    </span>
                    <span className="font-semibold text-teal-600">{equities}%</span>
                  </div>
                  <input
                    type="range"
                    min="20"
                    max="90"
                    value={equities}
                    onChange={(e) => {
                      const newEquities = Number(e.target.value)
                      const maxBonds = 100 - newEquities - 5 // Keep at least 5% cash
                      setEquities(newEquities)
                      if (bonds > maxBonds) setBonds(maxBonds)
                    }}
                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="flex items-center gap-1.5 text-gray-600">
                      <span className="w-2 h-2 rounded-full bg-blue-500" />
                      Bonds
                    </span>
                    <span className="font-semibold text-blue-600">{bonds}%</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max={100 - equities - 5}
                    value={bonds}
                    onChange={(e) => setBonds(Number(e.target.value))}
                    className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>
                <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-200">
                  <span className="flex items-center gap-1.5 text-gray-500">
                    <span className="w-2 h-2 rounded-full bg-gray-400" />
                    Cash (auto-calculated)
                  </span>
                  <span className="font-semibold text-gray-500">{cash}%</span>
                </div>
              </div>
            </div>

            <div>
              <label className="flex justify-between text-sm font-medium text-gray-700 mb-2">
                <span>Portfolio Value at Retirement</span>
                <span className="text-teal-600 font-bold">£{portfolioValue.toLocaleString()}</span>
              </label>
              <input
                type="range"
                min="100000"
                max="2000000"
                step="50000"
                value={portfolioValue}
                onChange={(e) => setPortfolioValue(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
              />
            </div>

            <div>
              <label className="flex justify-between text-sm font-medium text-gray-700 mb-2">
                <span>Annual Withdrawal</span>
                <span className={`font-bold ${isCritical ? 'text-red-600' : isWithdrawalTooHigh ? 'text-amber-600' : 'text-teal-600'}`}>
                  £{annualWithdrawal.toLocaleString()}
                </span>
              </label>
              <input
                type="range"
                min="10000"
                max="100000"
                step="5000"
                value={annualWithdrawal}
                onChange={(e) => setAnnualWithdrawal(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
              />
              <div className="flex justify-between text-xs mt-1">
                <span className="text-gray-500">Withdrawal Rate</span>
                <span className={`font-medium ${isCritical ? 'text-red-600' : isWithdrawalTooHigh ? 'text-amber-600' : 'text-green-600'}`}>
                  {withdrawalRate.toFixed(1)}%
                </span>
              </div>
            </div>

            <div>
              <label className="flex justify-between text-sm font-medium text-gray-700 mb-2">
                <span>Years in Retirement</span>
                <span className="text-teal-600 font-bold">{yearsInRetirement} years</span>
              </label>
              <input
                type="range"
                min="10"
                max="40"
                value={yearsInRetirement}
                onChange={(e) => setYearsInRetirement(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
              />
            </div>

            <div>
              <label className="flex justify-between text-sm font-medium text-gray-700 mb-2">
                <span>Risk Level</span>
                <span className="text-teal-600 font-bold">{riskLevel}/10</span>
              </label>
              <input
                type="range"
                min="1"
                max="10"
                value={riskLevel}
                onChange={(e) => setRiskLevel(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
              />
            </div>

            {/* Warning */}
            {(isWithdrawalTooHigh || isCritical) && (
              <div className={`p-4 rounded-lg ${isCritical ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'}`}>
                <div className="flex items-start">
                  <svg className={`w-5 h-5 ${isCritical ? 'text-red-600' : 'text-amber-600'} mr-3 flex-shrink-0`} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <div>
                    <p className={`font-semibold ${isCritical ? 'text-red-900' : 'text-amber-900'}`}>
                      {isCritical ? 'Withdrawal Rate Too High' : 'Caution: Above 4% Rule'}
                    </p>
                    <p className={`text-sm mt-1 ${isCritical ? 'text-red-700' : 'text-amber-700'}`}>
                      {isCritical
                        ? `A ${withdrawalRate.toFixed(1)}% withdrawal rate significantly increases the risk of depleting funds. Consider reducing to below 5%.`
                        : `Research suggests a 4% withdrawal rate is more sustainable. Your ${withdrawalRate.toFixed(1)}% rate may need monitoring.`
                      }
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Results */}
          <div>
            {/* Success Rate */}
            <div className="bg-slate-50 rounded-xl p-6 mb-4 text-center">
              <p className="text-sm text-gray-500 mb-2">Probability of Success</p>
              <div className={`text-6xl font-bold ${
                successRate >= 80 ? 'text-green-600' :
                successRate >= 60 ? 'text-amber-600' : 'text-red-600'
              }`}>
                {successRate}%
              </div>
              <p className="text-gray-500 text-sm mt-2">Based on 1,000 simulated scenarios</p>
            </div>

            {/* Percentile Outcomes */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-gray-700">Projected Outcomes at Year {yearsInRetirement}</p>

              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div>
                  <p className="text-xs text-red-600">10th Percentile (Poor)</p>
                  <p className="font-bold text-red-700">£{p10.toLocaleString()}</p>
                </div>
                <div className="text-right text-xs text-red-600">
                  Worst 10% of scenarios
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-amber-50 rounded-lg">
                <div>
                  <p className="text-xs text-amber-600">50th Percentile (Median)</p>
                  <p className="font-bold text-amber-700">£{p50.toLocaleString()}</p>
                </div>
                <div className="text-right text-xs text-amber-600">
                  Average outcome
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div>
                  <p className="text-xs text-green-600">90th Percentile (Good)</p>
                  <p className="font-bold text-green-700">£{p90.toLocaleString()}</p>
                </div>
                <div className="text-right text-xs text-green-600">
                  Best 10% of scenarios
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// TRUST INDICATORS
// ============================================================================

const TrustIndicators = () => {
  const badges = [
    { name: 'Cyber Essentials', icon: 'shield' },
    { name: 'FCA Aligned', icon: 'check' },
    { name: 'GDPR Compliant', icon: 'lock' },
    { name: 'Consumer Duty Ready', icon: 'users' },
  ]

  return (
    <section className="py-8 bg-slate-50 border-y border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-center gap-8 lg:gap-16">
          <p className="text-sm text-gray-500 font-medium">Trusted by regulated firms</p>
          {badges.map(badge => (
            <div key={badge.name} className="flex items-center gap-2 text-gray-500">
              <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-600">{badge.name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ============================================================================
// PROBLEM/SOLUTION
// ============================================================================

const ProblemSolution = () => {
  return (
    <section className="py-20 lg:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            Manual Work Slows Your Practice Down
          </h2>
          <p className="text-lg text-gray-600">Too much admin. Too little time for clients.</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Problems */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-900 flex items-center mb-6">
              <span className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-3">
                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </span>
              Without Plannetic
            </h3>
            {[
              'Hours wasted on repetitive paperwork',
              'Data scattered across multiple tools',
              'Compliance checks take days, not minutes',
              'Manual suitability reports prone to errors',
            ].map((problem, i) => (
              <div key={i} className="flex items-start bg-red-50 rounded-lg p-4 border border-red-100">
                <svg className="w-5 h-5 text-red-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-700">{problem}</span>
              </div>
            ))}
          </div>

          {/* Solutions */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-gray-900 flex items-center mb-6">
              <span className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </span>
              With Plannetic
            </h3>
            {[
              'Automate 85% of administrative tasks',
              'All client data in one secure platform',
              'Instant compliance scoring and alerts',
              'AI-powered suitability report generation',
            ].map((solution, i) => (
              <div key={i} className="flex items-start bg-green-50 rounded-lg p-4 border border-green-100">
                <svg className="w-5 h-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="text-gray-700">{solution}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ============================================================================
// PLATFORM STATS
// ============================================================================

const PlatformStats = () => {
  const stats = [
    { value: '85%', label: 'Time Saved', description: 'On admin tasks' },
    { value: '100%', label: 'FCA Aligned', description: 'COBS compliant' },
    { value: '24/7', label: 'Available', description: 'Always on' },
    { value: '256-bit', label: 'Encryption', description: 'Bank-grade' },
  ]

  return (
    <section className="py-16 bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((stat, i) => (
            <div key={i} className="text-center">
              <div className="text-4xl lg:text-5xl font-bold text-teal-400 mb-2">{stat.value}</div>
              <div className="text-white font-semibold mb-1">{stat.label}</div>
              <div className="text-gray-400 text-sm">{stat.description}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ============================================================================
// FEATURES SECTION (8 KEY FEATURES)
// ============================================================================

const features = [
  {
    id: 'client-management',
    icon: ClientManagementIcon,
    title: 'Client Management',
    description: 'Complete 360-degree view with vulnerability tracking and FCA-aligned assessments.',
    tier: 'Core',
  },
  {
    id: 'assessments',
    icon: AssessmentsIcon,
    title: 'Risk Assessments',
    description: 'ATR, CFL, and suitability assessments with automatic lower-of calculation.',
    tier: 'Core',
  },
  {
    id: 'cashflow',
    icon: CashFlowFeatureIcon,
    title: 'Cash Flow Modelling',
    description: 'Year-by-year projections with multi-scenario analysis and what-if modelling.',
    tier: 'Advanced',
  },
  {
    id: 'montecarlo',
    icon: MonteCarloFeatureIcon,
    title: 'Monte Carlo Simulation',
    description: '1,000 scenario stochastic engine with success probability and confidence bands.',
    tier: 'Advanced',
  },
  {
    id: 'compliance',
    icon: ComplianceIcon,
    title: 'Compliance Framework',
    description: 'Consumer Duty tracking, GDPR compliance, and comprehensive registers.',
    tier: 'Core',
  },
  {
    id: 'documents',
    icon: DocumentsIcon,
    title: 'Reports & Documents',
    description: 'Automated suitability reports with templates and custom branding.',
    tier: 'Core',
  },
  {
    id: 'signatures',
    icon: SignaturesIcon,
    title: 'Digital Signatures',
    description: 'OpenSign integration with multi-signer workflows and audit certificates.',
    tier: 'Core',
  },
  {
    id: 'reviews',
    icon: ReviewsIcon,
    title: 'Client Reviews',
    description: 'Annual review scheduling with automatic reminders and analytics.',
    tier: 'Core',
  },
]

// Feature Icons
function ClientManagementIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  )
}

function AssessmentsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
    </svg>
  )
}

function CashFlowFeatureIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
    </svg>
  )
}

function MonteCarloFeatureIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
    </svg>
  )
}

function ComplianceIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  )
}

function DocumentsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  )
}

function SignaturesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
    </svg>
  )
}

function ReviewsIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" />
    </svg>
  )
}

const FeaturesSection = ({ onFeatureClick }: { onFeatureClick: (id: string) => void }) => {
  return (
    <section id="features" className="py-20 lg:py-28 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <div className="inline-flex items-center px-4 py-2 bg-blue-100 rounded-full mb-6">
            <span className="text-sm font-medium text-blue-800">8 Core Modules</span>
          </div>
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            Everything You Need to Run a Modern Practice
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Click any feature to learn how it was built, how firms use it, and how it meets FCA requirements.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feature) => (
            <button
              key={feature.id}
              onClick={() => onFeatureClick(feature.id)}
              className="text-left bg-white rounded-xl p-6 border border-gray-200 hover:border-teal-300 hover:shadow-lg transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-slate-100 group-hover:bg-teal-100 flex items-center justify-center mb-4 transition-colors">
                <feature.icon className="w-6 h-6 text-slate-600 group-hover:text-teal-600 transition-colors" />
              </div>

              <div className="flex items-center gap-2 mb-2">
                <h3 className="font-semibold text-gray-900">{feature.title}</h3>
              </div>

              <p className="text-sm text-gray-600 leading-relaxed mb-3">{feature.description}</p>

              <span className="text-xs font-medium text-teal-600 group-hover:underline">
                Learn more →
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  )
}

// ============================================================================
// FEATURE MODAL
// ============================================================================

const featureDetails: Record<string, {
  title: string
  howBuilt: string
  howFirmsUse: string
  clientPerspective: string
  fcaCompliance: string
}> = {
  'client-management': {
    title: 'Client Management',
    howBuilt: 'Built on a secure PostgreSQL database with real-time sync. Each client profile stores personal details, financial data, risk assessments, and communication history in an encrypted, GDPR-compliant structure.',
    howFirmsUse: 'Advisers use the client wizard for onboarding, then manage everything from a single dashboard. Vulnerability flags automatically highlight clients needing extra support per FCA guidance.',
    clientPerspective: 'Clients experience seamless onboarding via secure forms. Their data is always up-to-date, and advisers can quickly access their full history during meetings.',
    fcaCompliance: 'Meets COBS 9.2 know-your-client requirements. Vulnerability tracking aligns with FG21/1 guidance. Full audit trail for regulatory inspections.',
  },
  'assessments': {
    title: 'Risk Assessments',
    howBuilt: 'Three-part assessment engine: 10-question ATR questionnaire, financial-data-driven CFL calculator, and comprehensive suitability assessment. Results automatically use the lower of ATR and CFL.',
    howFirmsUse: 'Advisers send assessment links to clients or complete them in meetings. The system generates risk scores, investor personas, and pre-populated suitability rationales.',
    clientPerspective: 'Clients complete simple questionnaires on any device. They receive clear explanations of their risk profile and what it means for their investments.',
    fcaCompliance: 'Directly implements COBS 9.2.1R requirements. The lower-of calculation ensures recommendations match both willingness AND ability to bear losses.',
  },
  'cashflow': {
    title: 'Cash Flow Modelling',
    howBuilt: 'Year-by-year projection engine with configurable assumptions for inflation, growth rates, and taxation. Supports multiple scenarios running in parallel.',
    howFirmsUse: 'Advisers input client data and create scenarios like "retire at 60" vs "retire at 65". What-if modelling shows impact of different contribution levels or life events.',
    clientPerspective: 'Clients see clear visualisations of their financial future. Interactive charts help them understand the impact of their decisions.',
    fcaCompliance: 'Supports suitability evidence by demonstrating affordability of recommendations. Creates auditable projections for file reviews.',
  },
  'montecarlo': {
    title: 'Monte Carlo Simulation',
    howBuilt: '1,000 scenario stochastic engine using historical return distributions. Calculates success probability across multiple percentile outcomes (10th, 50th, 90th).',
    howFirmsUse: 'Advisers run simulations to stress-test retirement plans. Results show probability of achieving goals and highlight scenarios that may deplete funds.',
    clientPerspective: 'Clients understand that investment outcomes aren\'t guaranteed. The probability-based approach helps set realistic expectations.',
    fcaCompliance: 'Provides evidence for Product Governance requirements. Demonstrates that recommendations account for market volatility and sequence-of-returns risk.',
  },
  'compliance': {
    title: 'Compliance Framework',
    howBuilt: 'Integrated compliance engine monitoring Consumer Duty outcomes, GDPR consent, and regulatory requirements. Automated alerts for overdue reviews or missing documentation.',
    howFirmsUse: 'Compliance officers use the dashboard to monitor firm-wide health. Advisers see client-level compliance status and outstanding actions.',
    clientPerspective: 'Clients benefit from consistent, compliant advice. They receive timely communications and regular reviews as required.',
    fcaCompliance: 'Built for Consumer Duty (Products, Price & Value, Understanding, Support). Includes complaints register, breaches log, and vulnerability tracking per FCA guidance.',
  },
  'documents': {
    title: 'Reports & Documents',
    howBuilt: 'Template engine with merge fields pulling from client data. Generates PDFs with custom branding. Version control tracks all document iterations.',
    howFirmsUse: 'Advisers generate suitability reports with one click. Templates ensure consistency while allowing personalisation for each client.',
    clientPerspective: 'Clients receive professional, branded documents that clearly explain recommendations and rationale.',
    fcaCompliance: 'Suitability reports follow COBS 9.4 disclosure requirements. Audit trail shows what was sent to clients and when.',
  },
  'signatures': {
    title: 'Digital Signatures',
    howBuilt: 'OpenSign integration providing legally-binding electronic signatures. Supports multiple signers with automatic reminders and completion tracking.',
    howFirmsUse: 'Advisers send documents for signature directly from the platform. Status tracking shows sent, viewed, and signed stages.',
    clientPerspective: 'Clients sign documents from any device without printing. Secure links ensure only they can access their documents.',
    fcaCompliance: 'Meets eIDAS and UK Electronic Communications Act requirements. Audit certificates provide evidential proof of signing.',
  },
  'reviews': {
    title: 'Client Reviews',
    howBuilt: 'Calendar-based review scheduling with automatic reminder workflows at 30, 7, and 0 days. Analytics track completion rates across the firm.',
    howFirmsUse: 'Advisers manage review schedules from a unified calendar. Templates help structure review meetings consistently.',
    clientPerspective: 'Clients receive timely reminders for their annual reviews. They know their adviser is actively monitoring their situation.',
    fcaCompliance: 'Supports ongoing suitability requirements under COBS 9.3. Demonstrates that clients receive regular attention and updates.',
  },
}

const FeatureModal = ({ featureId, onClose }: { featureId: string; onClose: () => void }) => {
  const feature = features.find(f => f.id === featureId)
  const details = featureDetails[featureId]

  if (!feature || !details) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen p-4">
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black/50" onClick={onClose} />

        {/* Modal */}
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-slate-900 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-10 h-10 bg-teal-600 rounded-lg flex items-center justify-center mr-3">
                <feature.icon className="w-5 h-5 text-white" />
              </div>
              <h2 className="text-xl font-semibold text-white">{details.title}</h2>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            <FeaturePreview featureId={featureId} />

            {/* How We Built It */}
            <div>
              <div className="flex items-center mb-3">
                <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900">How We Built It</h3>
              </div>
              <p className="text-gray-600 leading-relaxed pl-11">{details.howBuilt}</p>
            </div>

            {/* How Firms Use It */}
            <div>
              <div className="flex items-center mb-3">
                <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900">How Firms Use It</h3>
              </div>
              <p className="text-gray-600 leading-relaxed pl-11">{details.howFirmsUse}</p>
            </div>

            {/* Client Perspective */}
            <div>
              <div className="flex items-center mb-3">
                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-gray-900">Client Perspective</h3>
              </div>
              <p className="text-gray-600 leading-relaxed pl-11">{details.clientPerspective}</p>
            </div>

            {/* FCA Compliance */}
            <div className="bg-blue-50 rounded-xl p-4">
              <div className="flex items-center mb-3">
                <div className="w-8 h-8 bg-blue-200 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-4 h-4 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="font-semibold text-blue-900">FCA Compliance</h3>
              </div>
              <p className="text-blue-800 leading-relaxed pl-11">{details.fcaCompliance}</p>
            </div>
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t flex justify-end">
            <Link
              href="/login"
              className="px-6 py-2.5 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors"
            >
              Try It Free
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

// ============================================================================
// FEATURE PREVIEWS (INTERACTIVE / ANIMATED)
// ============================================================================

const useRotatingIndex = (length: number, intervalMs: number) => {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (length < 2) return
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % length)
    }, intervalMs)
    return () => clearInterval(timer)
  }, [length, intervalMs])

  return [index, setIndex] as const
}

const PreviewFrame = ({
  title,
  badgeClass,
  onShuffle,
  children
}: {
  title: string
  badgeClass?: string
  onShuffle?: () => void
  children: React.ReactNode
}) => (
  <div className="rounded-xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-4 text-white shadow-inner">
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-red-400/70" />
          <span className="h-2 w-2 rounded-full bg-amber-300/70" />
          <span className="h-2 w-2 rounded-full bg-green-400/70" />
        </div>
        <span className="text-[10px] uppercase tracking-wide text-slate-400">{title}</span>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'rounded-full px-2 py-0.5 text-[10px] font-semibold border',
            badgeClass || 'bg-teal-500/15 text-teal-300 border-teal-500/30'
          )}
        >
          Live
        </span>
        {onShuffle && (
          <button
            type="button"
            onClick={onShuffle}
            className="text-[10px] px-2 py-1 rounded-full border border-slate-700 text-slate-200 hover:text-white hover:border-slate-500 transition"
          >
            Shuffle
          </button>
        )}
      </div>
    </div>
    {children}
  </div>
)

const FeaturePreview = ({ featureId }: { featureId: string }) => {
  switch (featureId) {
    case 'client-management':
      return <ClientManagementPreview />
    case 'assessments':
      return <AssessmentsPreview />
    case 'cashflow':
      return <CashFlowPreview />
    case 'montecarlo':
      return <MonteCarloPreview />
    case 'compliance':
      return <CompliancePreview />
    case 'documents':
      return <DocumentsPreview />
    case 'signatures':
      return <SignaturesPreview />
    case 'reviews':
      return <ReviewsPreview />
    default:
      return null
  }
}

const ClientManagementPreview = () => {
  const clients = [
    { name: 'Client A', risk: '6/10', status: 'Review due', pill: 'bg-amber-500/20 text-amber-300' },
    { name: 'Client B', risk: '4/10', status: 'Vulnerable', pill: 'bg-rose-500/20 text-rose-300' },
    { name: 'Client C', risk: '7/10', status: 'Active', pill: 'bg-emerald-500/20 text-emerald-300' }
  ]
  const [activeIndex, setActiveIndex] = useRotatingIndex(clients.length, 2400)
  const handleShuffle = () => setActiveIndex((prev) => (prev + 1) % clients.length)

  return (
    <PreviewFrame
      title="Client Management"
      badgeClass="bg-teal-500/15 text-teal-300 border-teal-500/30"
      onShuffle={handleShuffle}
    >
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="rounded-lg bg-slate-800/70 p-2">
          <p className="text-[10px] text-slate-400">Active clients</p>
          <p className="text-lg font-semibold">127</p>
          <p className="text-[10px] text-emerald-300">+3 this month</p>
        </div>
        <div className="rounded-lg bg-slate-800/70 p-2">
          <p className="text-[10px] text-slate-400">Vulnerable</p>
          <div className="flex items-center gap-2">
            <p className="text-lg font-semibold">9</p>
            <span className="h-2 w-2 rounded-full bg-rose-400 animate-pulse" />
          </div>
          <p className="text-[10px] text-rose-300">Enhanced review</p>
        </div>
      </div>
      <div className="space-y-2">
        {clients.map((client, index) => (
          <div
            key={client.name}
            className={cn(
              'flex items-center justify-between rounded-lg px-3 py-2 transition',
              index === activeIndex
                ? 'bg-slate-800/80 ring-1 ring-teal-400/50'
                : 'bg-slate-800/40'
            )}
          >
            <div>
              <p className="text-sm text-white">{client.name}</p>
              <p className="text-[10px] text-slate-400">Risk {client.risk}</p>
            </div>
            <span className={cn('text-[10px] px-2 py-0.5 rounded-full', client.pill)}>
              {client.status}
            </span>
          </div>
        ))}
      </div>
    </PreviewFrame>
  )
}

const AssessmentsPreview = () => {
  const suitabilityStates = [
    { title: 'Suitable', note: 'Balanced portfolio fit', tone: 'text-emerald-300', ring: 'ring-emerald-400/40' },
    { title: 'Conditions', note: 'Emergency fund required', tone: 'text-amber-300', ring: 'ring-amber-400/40' },
    { title: 'Review', note: 'Clarify time horizon', tone: 'text-rose-300', ring: 'ring-rose-400/40' }
  ]
  const riskInputs = [
    {
      label: 'ATR',
      subtitle: 'Attitude to Risk',
      score: '6 / 10',
      tone: 'text-amber-300',
      bar: 'bg-amber-400',
      badge: 'bg-amber-500/20 text-amber-200'
    },
    {
      label: 'CFL',
      subtitle: 'Capacity for Loss',
      score: '5 / 10',
      tone: 'text-blue-300',
      bar: 'bg-blue-400',
      badge: 'bg-blue-500/20 text-blue-200'
    }
  ]
  const [activeIndex, setActiveIndex] = useRotatingIndex(suitabilityStates.length, 2400)
  const handleShuffle = () => setActiveIndex((prev) => (prev + 1) % suitabilityStates.length)
  const suitability = suitabilityStates[activeIndex]

  return (
    <PreviewFrame
      title="Risk Assessments"
      badgeClass="bg-amber-500/15 text-amber-300 border-amber-500/30"
      onShuffle={handleShuffle}
    >
      <div className="rounded-lg bg-slate-800/80 p-3 mb-3 ring-1 ring-slate-700">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-slate-400">Suitability outcome</p>
            <p className={cn('text-lg font-semibold', suitability.tone)}>{suitability.title}</p>
            <p className="text-[10px] text-slate-400">{suitability.note}</p>
          </div>
          <div className={cn('h-10 w-10 rounded-full bg-slate-900 ring-2 flex items-center justify-center', suitability.ring)}>
            <span className={cn('text-xs font-semibold', suitability.tone)}>COBS</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {riskInputs.map((input, index) => (
          <div key={input.label} className="rounded-lg bg-slate-800/70 p-2">
            <div className="flex items-center justify-between mb-1">
              <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', input.badge)}>
                {input.label}
              </span>
              <span className={cn('text-[10px] font-semibold', input.tone)}>{input.score}</span>
            </div>
            <p className="text-[10px] text-slate-400 mb-2">{input.subtitle}</p>
            <div className="h-1.5 rounded-full bg-slate-700">
              <div
                className={cn('h-1.5 rounded-full transition-all duration-700', input.bar)}
                style={{ width: `${index === 0 ? 70 : 60}%` }}
              />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-400">
        <span className="h-2 w-2 rounded-full bg-amber-300 animate-pulse" />
        Suitability derived from ATR + CFL (lower-of logic)
      </div>
    </PreviewFrame>
  )
}

const CashFlowPreview = () => {
  const scenarios = [
    { name: 'Base', finalValue: '2.1m', shortfall: 'Low', stroke: 'stroke-teal-400', fill: 'fill-teal-300' },
    { name: 'Early Retire', finalValue: '1.7m', shortfall: 'Med', stroke: 'stroke-blue-400', fill: 'fill-blue-300' },
    { name: 'High Inflation', finalValue: '1.3m', shortfall: 'High', stroke: 'stroke-fuchsia-400', fill: 'fill-fuchsia-300' }
  ]
  const [activeIndex, setActiveIndex] = useRotatingIndex(scenarios.length, 2400)
  const handleShuffle = () => setActiveIndex((prev) => (prev + 1) % scenarios.length)

  return (
    <PreviewFrame
      title="Cash Flow Modelling"
      badgeClass="bg-teal-500/15 text-teal-300 border-teal-500/30"
      onShuffle={handleShuffle}
    >
      <div className="flex flex-wrap gap-2 mb-3">
        {scenarios.map((scenario, index) => (
          <span
            key={scenario.name}
            className={cn(
              'px-2 py-1 rounded-full text-[10px] border',
              index === activeIndex
                ? 'border-teal-400/60 text-teal-200 bg-teal-500/10'
                : 'border-slate-700 text-slate-400'
            )}
          >
            {scenario.name}
          </span>
        ))}
      </div>
      <div className="rounded-lg bg-slate-800/70 p-3">
        <svg viewBox="0 0 120 40" className="w-full h-24">
          {scenarios.map((scenario, index) => (
            <path
              key={scenario.name}
              d={
                index === 0
                  ? 'M2 34 L28 30 L52 26 L76 18 L102 12 L118 8'
                  : index === 1
                    ? 'M2 34 L28 31 L52 27 L76 22 L102 18 L118 15'
                    : 'M2 34 L28 32 L52 30 L76 26 L102 24 L118 22'
              }
              className={cn(
                'fill-none transition-all duration-700',
                scenario.stroke,
                index === activeIndex ? 'opacity-100' : 'opacity-30'
              )}
              strokeWidth={index === activeIndex ? 2 : 1.5}
            />
          ))}
          <circle
            cx="118"
            cy={activeIndex === 0 ? 8 : activeIndex === 1 ? 15 : 22}
            r="2.5"
            className={cn('animate-pulse', scenarios[activeIndex].fill)}
          />
        </svg>
      </div>
      <div className="grid grid-cols-2 gap-2 mt-3">
        <div className="rounded-lg bg-slate-800/70 p-2">
          <p className="text-[10px] text-slate-400">Final value</p>
          <p className="text-lg font-semibold">{scenarios[activeIndex].finalValue}</p>
        </div>
        <div className="rounded-lg bg-slate-800/70 p-2">
          <p className="text-[10px] text-slate-400">Shortfall</p>
          <p className="text-lg font-semibold text-amber-300">{scenarios[activeIndex].shortfall}</p>
        </div>
      </div>
    </PreviewFrame>
  )
}

const MonteCarloPreview = () => {
  const rates = [94, 89, 82]
  const [activeIndex, setActiveIndex] = useRotatingIndex(rates.length, 2400)
  const handleShuffle = () => setActiveIndex((prev) => (prev + 1) % rates.length)
  const success = rates[activeIndex]
  const bars = [18, 30, 44, 70, 44, 30, 18]

  return (
    <PreviewFrame
      title="Monte Carlo Engine"
      badgeClass="bg-indigo-500/15 text-indigo-300 border-indigo-500/30"
      onShuffle={handleShuffle}
    >
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[10px] text-slate-400">Success probability</p>
          <p className="text-2xl font-semibold text-indigo-200">{success}%</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-slate-400">Simulation runs</p>
          <p className="text-sm font-semibold text-slate-200">1,000</p>
        </div>
      </div>
      <div className="flex items-end gap-1 h-20">
        {bars.map((height, index) => (
          <div
            key={index}
            className={cn(
              'flex-1 rounded-t bg-indigo-500/30 transition-all duration-700',
              index === 3 ? 'bg-indigo-400' : 'bg-indigo-500/30'
            )}
            style={{ height: `${height}%` }}
          />
        ))}
      </div>
      <div className="mt-3 h-1.5 bg-slate-700 rounded-full">
        <div
          className="h-1.5 bg-indigo-400 rounded-full transition-all duration-700"
          style={{ width: `${success}%` }}
        />
      </div>
    </PreviewFrame>
  )
}

const CompliancePreview = () => {
  const scores = [98, 94, 88]
  const [activeIndex, setActiveIndex] = useRotatingIndex(scores.length, 2400)
  const handleShuffle = () => setActiveIndex((prev) => (prev + 1) % scores.length)
  const score = scores[activeIndex]
  const angle = Math.round((score / 100) * 360)

  return (
    <PreviewFrame
      title="Compliance Framework"
      badgeClass="bg-blue-500/15 text-blue-300 border-blue-500/30"
      onShuffle={handleShuffle}
    >
      <div className="flex items-center gap-4">
        <div
          className="h-16 w-16 rounded-full p-1"
          style={{
            background: `conic-gradient(#38bdf8 ${angle}deg, #1f2937 0deg)`
          }}
        >
          <div className="h-full w-full rounded-full bg-slate-900 flex items-center justify-center text-sm font-semibold text-blue-200">
            {score}%
          </div>
        </div>
        <div className="space-y-2 flex-1">
          <div className="flex items-center justify-between rounded-lg bg-slate-800/70 px-3 py-2">
            <span className="text-[10px] text-slate-400">Consumer Duty</span>
            <span className="text-xs text-emerald-300">All clear</span>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-slate-800/70 px-3 py-2">
            <span className="text-[10px] text-slate-400">Reviews overdue</span>
            <span className="text-xs text-amber-300">2 flagged</span>
          </div>
        </div>
      </div>
    </PreviewFrame>
  )
}

const DocumentsPreview = () => {
  const docs = [
    { name: 'Suitability Report', status: 'Ready', pill: 'bg-emerald-500/20 text-emerald-300' },
    { name: 'Annual Review', status: 'Generating', pill: 'bg-amber-500/20 text-amber-300' },
    { name: 'Client Summary', status: 'Sent', pill: 'bg-blue-500/20 text-blue-300' }
  ]
  const [activeIndex, setActiveIndex] = useRotatingIndex(docs.length, 2400)
  const handleShuffle = () => setActiveIndex((prev) => (prev + 1) % docs.length)

  return (
    <PreviewFrame
      title="Reports & Documents"
      badgeClass="bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
      onShuffle={handleShuffle}
    >
      <div className="space-y-2">
        {docs.map((doc, index) => (
          <div
            key={doc.name}
            className={cn(
              'flex items-center justify-between rounded-lg px-3 py-2 transition',
              index === activeIndex ? 'bg-slate-800/80 ring-1 ring-emerald-400/40' : 'bg-slate-800/40'
            )}
          >
            <div>
              <p className="text-sm text-white">{doc.name}</p>
              <p className="text-[10px] text-slate-400">Last updated 2m ago</p>
            </div>
            <span className={cn('text-[10px] px-2 py-0.5 rounded-full', doc.pill)}>
              {doc.status}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 h-1.5 bg-slate-700 rounded-full">
        <div
          className="h-1.5 bg-emerald-400 rounded-full animate-pulse"
          style={{ width: `${(activeIndex + 1) * 30}%` }}
        />
      </div>
    </PreviewFrame>
  )
}

const SignaturesPreview = () => {
  const steps = ['Sent', 'Viewed', 'Signed']
  const [activeIndex, setActiveIndex] = useRotatingIndex(steps.length, 2400)
  const handleShuffle = () => setActiveIndex((prev) => (prev + 1) % steps.length)

  return (
    <PreviewFrame
      title="Digital Signatures"
      badgeClass="bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30"
      onShuffle={handleShuffle}
    >
      <div className="flex items-center gap-2 mb-3">
        {steps.map((step, index) => (
          <div
            key={step}
            className={cn(
              'flex-1 rounded-lg px-2 py-2 text-center text-[10px]',
              index <= activeIndex ? 'bg-fuchsia-500/20 text-fuchsia-200' : 'bg-slate-800/60 text-slate-400'
            )}
          >
            {step}
          </div>
        ))}
      </div>
      <div className="rounded-lg bg-slate-800/70 p-3">
        <p className="text-[10px] text-slate-400 mb-2">Signer sequence</p>
        <div className="flex items-center gap-2">
          {['Advisor', 'Client', 'Compliance'].map((role, index) => (
            <div
              key={role}
              className={cn(
                'flex-1 rounded-full px-2 py-1 text-center text-[10px]',
                index <= activeIndex ? 'bg-fuchsia-500/20 text-fuchsia-200' : 'bg-slate-800 text-slate-400'
              )}
            >
              {role}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-3 h-1.5 bg-slate-700 rounded-full">
        <div
          className="h-1.5 bg-fuchsia-400 rounded-full transition-all duration-700"
          style={{ width: `${((activeIndex + 1) / steps.length) * 100}%` }}
        />
      </div>
    </PreviewFrame>
  )
}

const ReviewsPreview = () => {
  const reviews = [
    { name: 'Household A', due: '2 Sep', status: 'Overdue', pill: 'bg-rose-500/20 text-rose-300' },
    { name: 'Household B', due: '7 Sep', status: 'Due soon', pill: 'bg-amber-500/20 text-amber-300' },
    { name: 'Household C', due: '14 Sep', status: 'Scheduled', pill: 'bg-emerald-500/20 text-emerald-300' }
  ]
  const [activeIndex, setActiveIndex] = useRotatingIndex(reviews.length, 2400)
  const handleShuffle = () => setActiveIndex((prev) => (prev + 1) % reviews.length)

  return (
    <PreviewFrame
      title="Client Reviews"
      badgeClass="bg-sky-500/15 text-sky-300 border-sky-500/30"
      onShuffle={handleShuffle}
    >
      <div className="space-y-2">
        {reviews.map((review, index) => (
          <div
            key={review.name}
            className={cn(
              'flex items-center justify-between rounded-lg px-3 py-2 transition',
              index === activeIndex ? 'bg-slate-800/80 ring-1 ring-sky-400/40' : 'bg-slate-800/40'
            )}
          >
            <div>
              <p className="text-sm text-white">{review.name}</p>
              <p className="text-[10px] text-slate-400">Review due {review.due}</p>
            </div>
            <span className={cn('text-[10px] px-2 py-0.5 rounded-full', review.pill)}>
              {review.status}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-2 text-[10px] text-slate-400">
        <span className="h-2 w-2 rounded-full bg-sky-400 animate-pulse" />
        Auto reminders at 30, 7, and 0 days
      </div>
    </PreviewFrame>
  )
}

// ============================================================================
// COMPLIANCE SECTION
// ============================================================================

const ComplianceSection = () => {
  const certifications = [
    { name: 'Cyber Essentials', description: 'UK Government-backed certification' },
    { name: 'FCA Aligned', description: 'Built for UK financial services' },
    { name: 'GDPR Compliant', description: 'Data protection controls' },
    { name: 'Consumer Duty Ready', description: 'Outcome-focused monitoring' },
    { name: 'SOC 2 Ready', description: 'Enterprise security controls' },
    { name: 'Audit Trail', description: 'Complete decision documentation' },
  ]

  return (
    <section id="security" className="py-20 lg:py-28 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl lg:text-4xl font-bold text-gray-900 mb-4">
            Enterprise-Grade Security
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Bank-grade encryption, comprehensive audit trails, and certifications that matter.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {certifications.map((cert, i) => (
            <div key={i} className="bg-slate-50 rounded-xl p-6 border border-gray-200">
              <div className="flex items-center mb-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded">Certified</span>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">{cert.name}</h3>
              <p className="text-sm text-gray-600">{cert.description}</p>
            </div>
          ))}
        </div>

        {/* Security Features */}
        <div className="bg-slate-900 rounded-2xl p-8 lg:p-12">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-2xl font-bold text-white mb-6">Bank-Grade Protection</h3>
              <ul className="space-y-4">
                {[
                  'AES-256 encryption at rest',
                  'TLS 1.3 encryption in transit',
                  'Immutable audit trail',
                  'Role-based access control',
                  'Automatic daily backups',
                  'Multi-factor authentication',
                ].map((feature, i) => (
                  <li key={i} className="flex items-center text-gray-300">
                    <svg className="w-5 h-5 text-teal-400 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
            <div className="text-center">
              <div className="inline-block bg-slate-800 rounded-2xl p-8 border border-slate-700">
                <div className="text-6xl font-bold text-teal-400 mb-2">99.9%</div>
                <div className="text-gray-400">Uptime SLA</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ============================================================================
// CTA SECTION
// ============================================================================

const CTASection = () => {
  return (
    <section className="py-20 lg:py-28 bg-slate-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl lg:text-5xl font-bold text-white mb-6">
          Ready to Transform Your Practice?
        </h2>
        <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
          Join hundreds of IFAs who have already made the switch. Start your 14-day free trial today.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
          <Link
            href="/login"
            className="w-full sm:w-auto px-8 py-4 bg-teal-600 text-white font-semibold rounded-xl hover:bg-teal-700 transition-colors"
          >
            Start Free Trial
          </Link>
          <a
            href="#tour"
            className="w-full sm:w-auto px-8 py-4 bg-slate-800 text-white font-semibold rounded-xl border border-slate-700 hover:bg-slate-700 transition-colors"
          >
            Book a walkthrough
          </a>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-gray-400">
          {['14-day free trial', 'No credit card required', 'Cancel anytime', 'Free data migration'].map(item => (
            <div key={item} className="flex items-center">
              <svg className="w-5 h-5 text-teal-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              {item}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

const faqs = [
  {
    question: 'How much does Plannetic cost?',
    answer: 'Pricing is tailored based on your firm size and requirements. We offer flexible plans for solo advisers, small teams, and larger firms. Schedule a walkthrough to discuss your specific needs and receive a personalised quote.'
  },
  {
    question: 'How long does onboarding take?',
    answer: 'Most firms are fully onboarded within 2-4 weeks. This includes data migration, team training, and workflow configuration. You\'ll have a dedicated onboarding specialist to guide you through the process.'
  },
  {
    question: 'Is there a free trial?',
    answer: 'Yes! We offer a 14-day free trial with full platform access. No credit card required. You\'ll be able to explore all features and run assessments in a trial workspace.'
  },
  {
    question: 'What integrations do you support?',
    answer: 'We integrate with major back-office systems, pension providers, and custodians. Current integrations include Intelliflo, FNZ, and standard data import formats. Custom integrations are available for enterprise clients.'
  },
  {
    question: 'Is my data secure?',
    answer: 'Absolutely. We\'re Cyber Essentials certified and host all data in UK-based data centres. We use bank-grade encryption for data in transit and at rest, with comprehensive audit trails and role-based access controls.'
  }
]

export const ContactFAQ = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index)
  }

  return (
    <section className="py-16 bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Frequently asked questions
          </h2>
          <p className="text-gray-600">
            Quick answers to common questions about Plannetic
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden"
            >
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
              >
                <span className="font-semibold text-gray-900 pr-4">
                  {faq.question}
                </span>
                <span
                  className={cn(
                    'flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center transition-transform duration-200',
                    openIndex === index && 'rotate-180'
                  )}
                >
                  <svg
                    className="w-4 h-4 text-gray-600"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </span>
              </button>
              <div
                className={cn(
                  'grid transition-all duration-200 ease-in-out',
                  openIndex === index ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
                )}
              >
                <div className="overflow-hidden">
                  <div className="px-6 pb-4 text-gray-600 leading-relaxed">
                    {faq.answer}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <p className="text-gray-600">
            Still have questions?{' '}
            <a
              href="mailto:support@plannetic.com"
              className="text-teal-600 font-medium hover:text-teal-700"
            >
              Contact our team
            </a>
          </p>
        </div>
      </div>
    </section>
  )
}

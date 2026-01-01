// src/app/marketing/page.tsx - Marketing Landing Page
import { Metadata } from 'next'
import { MarketingPage } from '@/components/marketing/MarketingPage'

export const metadata: Metadata = {
  title: 'Plannetic | Enterprise Platform for Modern Financial Advisors',
  description: 'Reduce admin by 85%. 100% FCA aligned. Plannetic is the enterprise-grade digital platform for IFAs - featuring Monte Carlo simulation, suitability assessments, cash flow modelling, and compliance management. Cyber Essentials certified.',
  keywords: [
    'IFA platform',
    'financial advisor software',
    'Monte Carlo simulation',
    'suitability assessment',
    'cash flow modelling',
    'FCA compliance',
    'risk assessment',
    'ATR questionnaire',
    'capacity for loss',
    'retirement planning',
    'wealth management software',
    'Consumer Duty',
    'GDPR compliant',
    'Cyber Essentials',
  ],
  openGraph: {
    title: 'Plannetic | Enterprise Platform for Modern Financial Advisors',
    description: 'Reduce admin by 85%. 100% FCA aligned. The complete digital platform for IFAs.',
    type: 'website',
    locale: 'en_GB',
    siteName: 'Plannetic',
    images: [
      {
        url: '/og-marketing.png',
        width: 1200,
        height: 630,
        alt: 'Plannetic - Turning Plans into Performance',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Plannetic | Enterprise Platform for Modern Financial Advisors',
    description: 'Reduce admin by 85%. 100% FCA aligned. The complete digital platform for IFAs.',
    images: ['/og-marketing.png'],
  },
  alternates: {
    canonical: 'https://www.plannetic.com/marketing',
  },
}

export default function MarketingLandingPage() {
  return <MarketingPage />
}

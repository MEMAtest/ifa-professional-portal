'use client'

import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import {
  Building2,
  UserCircle,
  Mail,
  ShieldCheck,
  Users,
  ArrowRight,
} from 'lucide-react'

interface WelcomeStepProps {
  onNext: () => void
}

const setupItems = [
  {
    icon: Building2,
    label: 'Firm Details',
    description: 'Company name, FCA number, address, and branding',
  },
  {
    icon: UserCircle,
    label: 'Advisor Profile',
    description: 'Your name, contact details, and job role',
  },
  {
    icon: Mail,
    label: 'Email Signature',
    description: 'Configure the signature appended to client emails',
  },
  {
    icon: ShieldCheck,
    label: 'Consumer Duty',
    description: 'Compliance settings and review reminders',
  },
  {
    icon: Users,
    label: 'Team Setup',
    description: 'Invite advisors, supervisors, and admins',
  },
]

export default function WelcomeStep({ onNext }: WelcomeStepProps) {
  return (
    <div className="flex flex-col items-center text-center max-w-2xl mx-auto">
      <div className="mb-6">
        <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mx-auto mb-4">
          <Building2 className="w-8 h-8 text-blue-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-3">
          Welcome to Plannetic
        </h1>
        <p className="text-lg text-gray-600">
          Let&apos;s get your firm set up. This wizard will walk you through the
          essential configuration steps so you can start advising clients right
          away.
        </p>
      </div>

      <Card className="w-full mb-8">
        <CardContent className="pt-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            What we&apos;ll configure
          </h2>
          <ul className="space-y-4 text-left">
            {setupItems.map((item) => {
              const Icon = item.icon
              return (
                <li key={item.label} className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{item.label}</p>
                    <p className="text-sm text-gray-500">{item.description}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        </CardContent>
      </Card>

      <Button size="lg" onClick={onNext} className="gap-2">
        Get Started
        <ArrowRight className="w-4 h-4" />
      </Button>
    </div>
  )
}

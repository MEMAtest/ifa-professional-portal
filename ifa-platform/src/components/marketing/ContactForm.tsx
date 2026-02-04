'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

type FormState = 'idle' | 'sent'

export const ContactForm = () => {
  const [formState, setFormState] = useState<FormState>('idle')

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setFormState('sent')
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-gray-700" htmlFor="contact-name">Full name</label>
          <input
            id="contact-name"
            name="name"
            type="text"
            required
            className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100"
            placeholder="Jane Smith"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700" htmlFor="contact-firm">Firm name</label>
          <input
            id="contact-firm"
            name="firm"
            type="text"
            required
            className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100"
            placeholder="Smith Advisory"
          />
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-gray-700" htmlFor="contact-email">Email</label>
          <input
            id="contact-email"
            name="email"
            type="email"
            required
            className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100"
            placeholder="jane@smithadvisory.co.uk"
          />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-700" htmlFor="contact-phone">Phone</label>
          <input
            id="contact-phone"
            name="phone"
            type="tel"
            className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100"
            placeholder="020 7946 0000"
          />
        </div>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700" htmlFor="contact-topic">How can we help?</label>
        <select
          id="contact-topic"
          name="topic"
          className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100"
          defaultValue=""
          required
        >
          <option value="" disabled>Select a topic</option>
          <option value="walkthrough">Book a walkthrough</option>
          <option value="pricing">Pricing and packages</option>
          <option value="security">Security and compliance</option>
          <option value="migration">Data migration</option>
          <option value="other">Something else</option>
        </select>
      </div>

      <div>
        <label className="text-sm font-medium text-gray-700" htmlFor="contact-message">Message</label>
        <textarea
          id="contact-message"
          name="message"
          rows={5}
          required
          className="mt-2 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-100"
          placeholder="Tell us about your firm and what you want to achieve."
        />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <button
          type="submit"
          className={cn(
            'px-6 py-3 rounded-lg text-sm font-semibold transition-colors',
            formState === 'sent'
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-teal-600 text-white hover:bg-teal-700'
          )}
        >
          {formState === 'sent' ? 'Message sent' : 'Send message'}
        </button>
        <p className="text-xs text-gray-500">
          We reply within 1 business day. Or email <a className="text-teal-600" href="mailto:hello@plannetic.com">hello@plannetic.com</a>.
        </p>
      </div>
    </form>
  )
}

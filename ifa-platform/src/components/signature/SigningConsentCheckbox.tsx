'use client'

import React, { useState, useCallback } from 'react'

export interface SigningConsentCheckboxProps {
  signerName: string
  documentName: string
  onConsentChange?: (consented: boolean, timestamp: string | null) => void
  className?: string
}

export function SigningConsentCheckbox({
  signerName,
  documentName,
  onConsentChange,
  className = ''
}: SigningConsentCheckboxProps) {
  const [consented, setConsented] = useState(false)

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const checked = e.target.checked
    setConsented(checked)
    onConsentChange?.(checked, checked ? new Date().toISOString() : null)
  }, [onConsentChange])

  return (
    <div className={`bg-gray-50 border border-gray-200 rounded-lg p-4 ${className}`}>
      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={consented}
          onChange={handleChange}
          className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <div className="text-sm text-gray-700">
          <p className="font-medium mb-1">Electronic Signature Consent</p>
          <p>
            I, <strong>{signerName}</strong>, confirm that I have read and understand 
            the document titled <strong>&quot;{documentName}&quot;</strong>. By checking this 
            box and signing below, I agree to electronically sign this document with 
            the same legal effect as a handwritten signature.
          </p>
        </div>
      </label>
    </div>
  )
}

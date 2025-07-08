// src/components/forms/steps/ClientDetailsStep.tsx
'use client'
import { useState } from 'react'
import { Input } from '@/components/ui/Input'
import { ClientProfile } from '@/types'

interface ClientDetailsStepProps {
  clientProfile: ClientProfile
  onChange: (updates: Partial<ClientProfile>) => void
  errors: string[]
}

export const ClientDetailsStep = ({ clientProfile, onChange, errors }: ClientDetailsStepProps) => {
  const [localProfile, setLocalProfile] = useState(clientProfile)

  const handleChange = (field: keyof ClientProfile | string, value: any) => {
    let updates: Partial<ClientProfile>

    if (field.includes('.')) {
      const [parent, child] = field.split('.')
      updates = {
        ...localProfile,
        [parent]: {
          ...(localProfile[parent as keyof ClientProfile] as any),
          [child]: value
        }
      }
    } else {
      updates = { ...localProfile, [field]: value }
    }

    setLocalProfile(updates as ClientProfile)
    onChange(updates)
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Client Reference"
            value={localProfile.clientRef}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('clientRef', e.target.value)}
            required
            placeholder="C123456789"
          />
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <select
              value={localProfile.title}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleChange('title', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              required
            >
              <option value="">Select Title</option>
              <option value="Mr">Mr</option>
              <option value="Mrs">Mrs</option>
              <option value="Miss">Miss</option>
              <option value="Ms">Ms</option>
              <option value="Dr">Dr</option>
              <option value="Prof">Prof</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Marital Status
            </label>
            <select
              value={localProfile.maritalStatus}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleChange('maritalStatus', e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Status</option>
              <option value="Single">Single</option>
              <option value="Married">Married</option>
              <option value="Divorced">Divorced</option>
              <option value="Widowed">Widowed</option>
              <option value="Civil Partnership">Civil Partnership</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <Input
            label="First Name"
            value={localProfile.firstName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('firstName', e.target.value)}
            required
            placeholder="John"
          />
          
          <Input
            label="Last Name"
            value={localProfile.lastName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('lastName', e.target.value)}
            required
            placeholder="Smith"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <Input
            label="Date of Birth"
            type="date"
            value={localProfile.dateOfBirth}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('dateOfBirth', e.target.value)}
            required
          />
          
          <Input
            label="Age"
            type="number"
            value={localProfile.age || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('age', parseInt(e.target.value) || 0)}
            min="18"
            max="100"
            placeholder="35"
          />
          
          <Input
            label="Number of Dependents"
            type="number"
            value={localProfile.dependents || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('dependents', parseInt(e.target.value) || 0)}
            min="0"
            max="10"
            placeholder="2"
          />
        </div>

        <div className="mt-4">
          <Input
            label="Occupation"
            value={localProfile.occupation}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('occupation', e.target.value)}
            placeholder="Software Engineer"
          />
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Address</h3>
        <div className="space-y-4">
          <Input
            label="Street Address"
            value={localProfile.address?.street || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('address.street', e.target.value)}
            placeholder="123 Main Street"
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="City"
              value={localProfile.address?.city || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('address.city', e.target.value)}
              placeholder="London"
            />
            
            <Input
              label="Postcode"
              value={localProfile.address?.postcode || ''}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('address.postcode', e.target.value)}
              placeholder="SW1A 1AA"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Contact Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Phone Number"
            type="tel"
            value={localProfile.contactDetails?.phone || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('contactDetails.phone', e.target.value)}
            placeholder="01234 567890"
          />
          
          <Input
            label="Email Address"
            type="email"
            value={localProfile.contactDetails?.email || ''}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleChange('contactDetails.email', e.target.value)}
            placeholder="john.smith@email.com"
          />
        </div>
      </div>

      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-red-800 mb-2">Please correct the following errors:</h4>
          <ul className="text-sm text-red-700 space-y-1">
            {errors.map((error, index) => (
              <li key={index}>• {error}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
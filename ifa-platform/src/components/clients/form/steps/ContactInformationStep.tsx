import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { EnhancedAddressField } from '@/components/ui/EnhancedAddressField';
import type { ClientFormData, ContactInfo } from '@/types/client';

interface ContactInformationStepProps {
  formData: ClientFormData;
  onUpdateContactInfo: (updates: Partial<ContactInfo>) => void;
}

export function ContactInformationStep({
  formData,
  onUpdateContactInfo
}: ContactInformationStepProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Contact Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
            <input
              type="email"
              value={formData.contactInfo.email}
              onChange={(e) => onUpdateContactInfo({ email: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="client@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <input
              type="tel"
              value={formData.contactInfo.phone || ''}
              onChange={(e) => onUpdateContactInfo({ phone: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="01234 567890"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
            <input
              type="tel"
              value={formData.contactInfo.mobile || ''}
              onChange={(e) => onUpdateContactInfo({ mobile: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="07700 900123"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Preferred Contact Method</label>
            <select
              value={formData.contactInfo.preferredContact}
              onChange={(e) => onUpdateContactInfo({ preferredContact: e.target.value as ContactInfo['preferredContact'] })}
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="email">Email</option>
              <option value="phone">Phone</option>
              <option value="mobile">Mobile</option>
              <option value="post">Post</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <h4 className="font-medium text-gray-900">Address</h4>
          <EnhancedAddressField
            value={formData.contactInfo.address || undefined}
            onChange={(address) =>
              onUpdateContactInfo({
                address: {
                  line1: address.line1,
                  line2: address.line2 || '',
                  city: address.city,
                  county: address.county || '',
                  postcode: address.postcode,
                  country: address.country || 'United Kingdom'
                }
              })
            }
            label="Address"
          />
        </div>

        <div className="space-y-2">
          <h4 className="font-medium text-gray-900">Communication Preferences</h4>
          <div className="space-y-2">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.contactInfo.communicationPreferences?.marketing || false}
                onChange={(e) =>
                  onUpdateContactInfo({
                    communicationPreferences: {
                      marketing: e.target.checked,
                      newsletters: formData.contactInfo.communicationPreferences?.newsletters || false,
                      smsUpdates: formData.contactInfo.communicationPreferences?.smsUpdates || false
                    }
                  })
                }
                className="mr-2"
              />
              Marketing communications
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.contactInfo.communicationPreferences?.newsletters || false}
                onChange={(e) =>
                  onUpdateContactInfo({
                    communicationPreferences: {
                      marketing: formData.contactInfo.communicationPreferences?.marketing || false,
                      newsletters: e.target.checked,
                      smsUpdates: formData.contactInfo.communicationPreferences?.smsUpdates || false
                    }
                  })
                }
                className="mr-2"
              />
              Newsletter subscriptions
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={formData.contactInfo.communicationPreferences?.smsUpdates || false}
                onChange={(e) =>
                  onUpdateContactInfo({
                    communicationPreferences: {
                      marketing: formData.contactInfo.communicationPreferences?.marketing || false,
                      newsletters: formData.contactInfo.communicationPreferences?.newsletters || false,
                      smsUpdates: e.target.checked
                    }
                  })
                }
                className="mr-2"
              />
              SMS updates
            </label>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

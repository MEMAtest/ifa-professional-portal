import { Phone } from 'lucide-react'

export const contactDetailsSection = {
  id: 'contact_details',
  title: 'Contact Details',
  icon: Phone,
  status: 'incomplete',
  fields: [
    {
      id: 'address',
      label: 'Home Address',
      type: 'address',
      required: true,
      placeholder: 'Start typing your address...',
      pullFrom: 'client.contactInfo.address' // ✅ AUTO-GENERATION: Pull address
    },
    {
      id: 'postcode',
      label: 'Postcode',
      type: 'text',
      placeholder: 'e.g. SW1A 1AA',
      pullFrom: 'client.contactInfo.postcode' // ✅ AUTO-GENERATION: Pull postcode
    },
    {
      id: 'phone',
      label: 'Phone Number',
      type: 'tel',
      required: true,
      placeholder: '+44 7XXX XXXXXX',
      pullFrom: 'client.contactInfo.phone' // ✅ AUTO-GENERATION: Pull phone
    },
    {
      id: 'email',
      label: 'Email Address',
      type: 'email',
      required: true,
      placeholder: 'email@example.com',
      pullFrom: 'client.contactInfo.email' // ✅ AUTO-GENERATION: Pull email
    },
    {
      id: 'preferred_contact',
      label: 'Preferred Contact Method',
      type: 'select',
      required: true,
      options: ['Email', 'Phone', 'Post', 'SMS'],
      pullFrom: 'client.contactInfo.preferredContact' // ✅ AUTO-GENERATION: Pull preference
    },
    {
      id: 'best_contact_time',
      label: 'Best Time to Contact',
      type: 'select',
      options: ['Morning (9am-12pm)', 'Afternoon (12pm-5pm)', 'Evening (5pm-8pm)', 'Anytime'],
      smartDefault: (formData: any, pulledData: any) => {
        // Smart default based on employment status
        const employment = formData.personal_information?.employment_status
        if (employment === 'Retired') return 'Anytime'
        if (employment === 'Employed') return 'Evening (5pm-8pm)'
        return 'Afternoon (12pm-5pm)'
      }
    }
  ]
}


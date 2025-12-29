import type { Client } from '@/types/client';

export const getClientDisplayName = (client: Client): string => {
  const title = client.personalDetails?.title ? `${client.personalDetails.title} ` : '';
  const firstName = client.personalDetails?.firstName || '';
  const lastName = client.personalDetails?.lastName || '';
  return `${title}${firstName} ${lastName}`.trim();
};

export const formatClientAddress = (client: Client): string => {
  if (!client.contactInfo?.address) return '';

  const addr = client.contactInfo.address;
  return [addr.line1, addr.line2, addr.city, addr.county, addr.postcode]
    .filter(Boolean)
    .join(', ');
};

export const calculateAge = (dateOfBirth: string): number => {
  if (!dateOfBirth) return 0;

  try {
    const today = new Date();
    const birth = new Date(dateOfBirth);

    if (isNaN(birth.getTime())) return 0;

    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }

    return Math.max(0, age);
  } catch (error) {
    return 0;
  }
};

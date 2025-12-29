export const formatGender = (gender: string | undefined): string => {
  if (!gender) return 'Not Specified';
  const genderMap: Record<string, string> = {
    male: 'Male',
    female: 'Female',
    non_binary: 'Non-Binary',
    prefer_not_to_say: 'Prefer Not to Say',
    other: 'Other'
  };
  return genderMap[gender.toLowerCase()] || gender;
};

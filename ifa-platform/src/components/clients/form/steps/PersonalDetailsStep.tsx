import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { OccupationAutocomplete } from '@/components/suitability/sections/personal/OccupationAutocomplete';
import { CLIENT_STATUS_OPTIONS } from '@/components/clients/form/constants';
import { ISO_COUNTRIES, DEFAULT_NATIONALITY_CODE, getCountryLabel } from '@/lib/isoCountries';
import type { ClientFormData, ClientStatus, PersonalDetails } from '@/types/client';

const normalizeNationalityQuery = (value: string) =>
  value.trim().toLowerCase().replace(/[^a-z]/g, '');

interface PersonalDetailsStepProps {
  formData: ClientFormData;
  hasDraft: boolean;
  onUpdatePersonalDetails: (updates: Partial<PersonalDetails>) => void;
  onUpdateStatus: (status: ClientStatus) => void;
}

export function PersonalDetailsStep({
  formData,
  hasDraft,
  onUpdatePersonalDetails,
  onUpdateStatus
}: PersonalDetailsStepProps) {
  const [nationalitySearch, setNationalitySearch] = useState('');

  const filteredNationalities = useMemo(() => {
    const query = normalizeNationalityQuery(nationalitySearch);
    if (!query) return ISO_COUNTRIES;
    return ISO_COUNTRIES.filter(
      (country) => {
        const name = normalizeNationalityQuery(country.name);
        const code = normalizeNationalityQuery(country.code);
        return name.includes(query) || code.includes(query);
      }
    );
  }, [nationalitySearch]);

  const selectedNationalityCode = formData.personalDetails.nationality || DEFAULT_NATIONALITY_CODE;
  const selectedNationalityLabel = getCountryLabel(selectedNationalityCode) || selectedNationalityCode;
  const nationalityOptions =
    filteredNationalities.length > 0
      ? filteredNationalities
      : [{ code: selectedNationalityCode, name: selectedNationalityLabel }];
  const resolveNationalitySelection = (query: string) => {
    const normalized = normalizeNationalityQuery(query);
    if (!normalized) return null;
    const exact = ISO_COUNTRIES.find(
      (country) => {
        const name = normalizeNationalityQuery(country.name);
        const code = normalizeNationalityQuery(country.code);
        return code === normalized || name === normalized;
      }
    );
    if (exact) return exact;
    if (filteredNationalities.length === 1) {
      return filteredNationalities[0];
    }
    const prefixMatch = filteredNationalities.find((country) =>
      normalizeNationalityQuery(country.name).startsWith(normalized)
    );
    if (prefixMatch) return prefixMatch;
    return null;
  };

  useEffect(() => {
    if (!nationalitySearch) {
      setNationalitySearch(selectedNationalityLabel);
      return;
    }
    const normalizedSearch = normalizeNationalityQuery(nationalitySearch);
    const normalizedLabel = normalizeNationalityQuery(selectedNationalityLabel);
    if (normalizedSearch === normalizedLabel && nationalitySearch !== selectedNationalityLabel) {
      setNationalitySearch(selectedNationalityLabel);
    }
  }, [nationalitySearch, selectedNationalityLabel]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Personal Details
          {hasDraft && (
            <Badge variant="secondary" className="text-xs">
              Draft Available
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5 sm:space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <select
              value={formData.personalDetails.title}
              onChange={(e) => onUpdatePersonalDetails({ title: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-md text-base sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select title</option>
              <option value="Mr">Mr</option>
              <option value="Mrs">Mrs</option>
              <option value="Miss">Miss</option>
              <option value="Ms">Ms</option>
              <option value="Dr">Dr</option>
              <option value="Prof">Prof</option>
              <option value="Rev">Rev</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
            <input
              type="text"
              value={formData.personalDetails.firstName}
              onChange={(e) => onUpdatePersonalDetails({ firstName: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-md text-base sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="First name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
            <input
              type="text"
              value={formData.personalDetails.lastName}
              onChange={(e) => onUpdatePersonalDetails({ lastName: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-md text-base sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Last name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Client Status</label>
            <select
              value={formData.status}
              onChange={(e) => onUpdateStatus(e.target.value as ClientStatus)}
              className="w-full p-2 border border-gray-300 rounded-md text-base sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {CLIENT_STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth *</label>
            <input
              type="date"
              value={formData.personalDetails.dateOfBirth}
              onChange={(e) => onUpdatePersonalDetails({ dateOfBirth: e.target.value })}
              className="w-full p-2 border border-gray-300 rounded-md text-base sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nationality (ISO)</label>
            <input
              type="text"
              value={nationalitySearch}
              onChange={(e) => {
                const nextValue = e.target.value;
                setNationalitySearch(nextValue);
                const match = resolveNationalitySelection(nextValue);
                if (match) {
                  onUpdatePersonalDetails({ nationality: match.code });
                }
              }}
              onBlur={() => {
                const match = resolveNationalitySelection(nationalitySearch);
                if (match) {
                  onUpdatePersonalDetails({ nationality: match.code });
                  setNationalitySearch(match.name);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const match = resolveNationalitySelection(nationalitySearch);
                  if (match) {
                    onUpdatePersonalDetails({ nationality: match.code });
                    setNationalitySearch(match.name);
                  }
                  e.preventDefault();
                }
              }}
              placeholder="Search nationality..."
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-base sm:text-sm mb-2"
            />
            <select
              value={selectedNationalityCode}
              onChange={(e) => {
                const nextCode = e.target.value;
                const nextLabel = getCountryLabel(nextCode) || nextCode;
                onUpdatePersonalDetails({ nationality: nextCode });
                setNationalitySearch(nextLabel);
              }}
              className="w-full p-2 border border-gray-300 rounded-md text-base sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {nationalityOptions.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
              {filteredNationalities.length === 0 && (
                <option value="" disabled>
                  No matches found
                </option>
              )}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
            <select
              value={formData.personalDetails.gender || 'prefer_not_to_say'}
              onChange={(e) =>
                onUpdatePersonalDetails({
                  gender: e.target.value as PersonalDetails['gender']
                })
              }
              className="w-full p-2 border border-gray-300 rounded-md text-base sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="prefer_not_to_say">Prefer not to say</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="non_binary">Non-binary</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Marital Status</label>
            <select
              value={formData.personalDetails.maritalStatus}
              onChange={(e) =>
                onUpdatePersonalDetails({
                  maritalStatus: e.target.value as PersonalDetails['maritalStatus']
                })
              }
              className="w-full p-2 border border-gray-300 rounded-md text-base sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="single">Single</option>
              <option value="married">Married</option>
              <option value="divorced">Divorced</option>
              <option value="widowed">Widowed</option>
              <option value="civil_partnership">Civil Partnership</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Number of Dependents</label>
            <input
              type="number"
              min="0"
              value={formData.personalDetails.dependents}
              onChange={(e) => onUpdatePersonalDetails({ dependents: parseInt(e.target.value, 10) || 0 })}
              className="w-full p-2 border border-gray-300 rounded-md text-base sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Employment Status</label>
            <select
              value={formData.personalDetails.employmentStatus}
              onChange={(e) =>
                onUpdatePersonalDetails({
                  employmentStatus: e.target.value as PersonalDetails['employmentStatus']
                })
              }
              className="w-full p-2 border border-gray-300 rounded-md text-base sm:text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="employed">Employed</option>
              <option value="self_employed">Self-Employed</option>
              <option value="retired">Retired</option>
              <option value="unemployed">Unemployed</option>
              <option value="student">Student</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Occupation</label>
          <OccupationAutocomplete
            id="occupation"
            value={formData.personalDetails.occupation || ''}
            onChange={(value) => onUpdatePersonalDetails({ occupation: value })}
            placeholder="Start typing occupation..."
          />
        </div>
      </CardContent>
    </Card>
  );
}

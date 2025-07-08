import React, { useState, useEffect, useMemo } from 'react';
import { Search, Filter, Plus, Users, Calendar, AlertTriangle, TrendingUp, Phone, Mail, MapPin, Edit, Trash2, Eye, Clock, FileText, User, ChevronRight, X } from 'lucide-react';

// Mock data and types (in real implementation, these would come from the service layer)
interface Client {
  id: string;
  clientRef: string;
  personalDetails: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    occupation: string;
  };
  contactInfo: {
    email: string;
    phone: string;
    address: {
      city: string;
      postcode: string;
    };
  };
  status: 'prospect' | 'active' | 'review_due' | 'inactive' | 'archived';
  riskProfile: {
    riskTolerance: string;
    attitudeToRisk: number;
  };
  vulnerabilityAssessment: {
    isVulnerable: boolean;
  };
  financialProfile: {
    annualIncome: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface ClientFilters {
  search: string;
  status: string[];
  riskLevel: string[];
  vulnerabilityStatus: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
}

// Mock client data
const mockClients: Client[] = [
  {
    id: '1',
    clientRef: 'CLI001',
    personalDetails: {
      firstName: 'John',
      lastName: 'Smith',
      dateOfBirth: '1975-06-15',
      occupation: 'Software Engineer'
    },
    contactInfo: {
      email: 'john.smith@email.com',
      phone: '01234 567890',
      address: {
        city: 'London',
        postcode: 'SW1A 1AA'
      }
    },
    status: 'active',
    riskProfile: {
      riskTolerance: 'Moderate',
      attitudeToRisk: 6
    },
    vulnerabilityAssessment: {
      isVulnerable: false
    },
    financialProfile: {
      annualIncome: 85000
    },
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-20T14:22:00Z'
  },
  {
    id: '2',
    clientRef: 'CLI002',
    personalDetails: {
      firstName: 'Sarah',
      lastName: 'Johnson',
      dateOfBirth: '1983-03-22',
      occupation: 'Marketing Director'
    },
    contactInfo: {
      email: 'sarah.johnson@email.com',
      phone: '01234 567891',
      address: {
        city: 'Manchester',
        postcode: 'M1 1AA'
      }
    },
    status: 'review_due',
    riskProfile: {
      riskTolerance: 'Growth',
      attitudeToRisk: 7
    },
    vulnerabilityAssessment: {
      isVulnerable: false
    },
    financialProfile: {
      annualIncome: 72000
    },
    createdAt: '2024-01-10T09:15:00Z',
    updatedAt: '2024-01-18T11:45:00Z'
  },
  {
    id: '3',
    clientRef: 'CLI003',
    personalDetails: {
      firstName: 'Robert',
      lastName: 'Williams',
      dateOfBirth: '1958-11-08',
      occupation: 'Retired Teacher'
    },
    contactInfo: {
      email: 'robert.williams@email.com',
      phone: '01234 567892',
      address: {
        city: 'Birmingham',
        postcode: 'B1 1AA'
      }
    },
    status: 'active',
    riskProfile: {
      riskTolerance: 'Conservative',
      attitudeToRisk: 3
    },
    vulnerabilityAssessment: {
      isVulnerable: true
    },
    financialProfile: {
      annualIncome: 25000
    },
    createdAt: '2024-01-05T16:20:00Z',
    updatedAt: '2024-01-19T13:10:00Z'
  }
];

// SearchBar Component
const SearchBar: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}> = ({ value, onChange, placeholder = "Search clients..." }) => {
  return (
    <div className="relative">
      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
  );
};

// FilterPanel Component
const FilterPanel: React.FC<{
  filters: ClientFilters;
  onChange: (filters: ClientFilters) => void;
  onClear: () => void;
}> = ({ filters, onChange, onClear }) => {
  const [isOpen, setIsOpen] = useState(false);

  const statusOptions = [
    { value: 'prospect', label: 'Prospect' },
    { value: 'active', label: 'Active' },
    { value: 'review_due', label: 'Review Due' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'archived', label: 'Archived' }
  ];

  const riskLevelOptions = [
    { value: 'Conservative', label: 'Conservative' },
    { value: 'Moderate', label: 'Moderate' },
    { value: 'Balanced', label: 'Balanced' },
    { value: 'Growth', label: 'Growth' },
    { value: 'Aggressive', label: 'Aggressive' }
  ];

  const handleStatusChange = (status: string) => {
    const newStatuses = filters.status.includes(status)
      ? filters.status.filter(s => s !== status)
      : [...filters.status, status];
    
    onChange({ ...filters, status: newStatuses });
  };

  const handleRiskLevelChange = (riskLevel: string) => {
    const newRiskLevels = filters.riskLevel.includes(riskLevel)
      ? filters.riskLevel.filter(r => r !== riskLevel)
      : [...filters.riskLevel, riskLevel];
    
    onChange({ ...filters, riskLevel: newRiskLevels });
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
      >
        <Filter className="h-4 w-4" />
        Filters
        {(filters.status.length > 0 || filters.riskLevel.length > 0) && (
          <span className="bg-blue-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {filters.status.length + filters.riskLevel.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 right-0 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-10 w-80">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium">Filters</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <div className="space-y-2">
                {statusOptions.map(option => (
                  <label key={option.value} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.status.includes(option.value)}
                      onChange={() => handleStatusChange(option.value)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Risk Level</label>
              <div className="space-y-2">
                {riskLevelOptions.map(option => (
                  <label key={option.value} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={filters.riskLevel.includes(option.value)}
                      onChange={() => handleRiskLevelChange(option.value)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Vulnerability</label>
              <select
                value={filters.vulnerabilityStatus}
                onChange={(e) => onChange({ ...filters, vulnerabilityStatus: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Clients</option>
                <option value="vulnerable">Vulnerable Only</option>
                <option value="not_vulnerable">Non-Vulnerable Only</option>
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={onClear}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
              >
                Clear All
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="flex-1 px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// VulnerabilityBadge Component
const VulnerabilityBadge: React.FC<{ isVulnerable: boolean }> = ({ isVulnerable }) => {
  if (!isVulnerable) return null;

  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">
      <AlertTriangle className="h-3 w-3" />
      Vulnerable
    </span>
  );
};

// RiskProfileCard Component
const RiskProfileCard: React.FC<{ riskProfile: Client['riskProfile'] }> = ({ riskProfile }) => {
  const getRiskColor = (tolerance: string) => {
    switch (tolerance.toLowerCase()) {
      case 'conservative': return 'bg-gray-100 text-gray-800';
      case 'moderate': return 'bg-blue-100 text-blue-800';
      case 'balanced': return 'bg-green-100 text-green-800';
      case 'growth': return 'bg-orange-100 text-orange-800';
      case 'aggressive': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(riskProfile.riskTolerance)}`}>
        {riskProfile.riskTolerance}
      </span>
      <span className="text-sm text-gray-600">
        ATR: {riskProfile.attitudeToRisk}/10
      </span>
    </div>
  );
};

// ClientCard Component
const ClientCard: React.FC<{
  client: Client;
  onClick: (client: Client) => void;
  onEdit: (clientId: string) => void;
  onDelete: (clientId: string) => void;
}> = ({ client, onClick, onEdit, onDelete }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'prospect': return 'bg-blue-100 text-blue-800';
      case 'review_due': return 'bg-yellow-100 text-yellow-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      case 'archived': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer">
      <div onClick={() => onClick(client)} className="space-y-4">
        {/* Header */}
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {client.personalDetails.firstName} {client.personalDetails.lastName}
            </h3>
            <p className="text-sm text-gray-600">{client.clientRef}</p>
          </div>
          <div className="flex items-center gap-2">
            <VulnerabilityBadge isVulnerable={client.vulnerabilityAssessment.isVulnerable} />
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(client.status)}`}>
              {client.status.replace('_', ' ').toUpperCase()}
            </span>
          </div>
        </div>

        {/* Contact Info */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Mail className="h-4 w-4" />
            {client.contactInfo.email}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Phone className="h-4 w-4" />
            {client.contactInfo.phone}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="h-4 w-4" />
            {client.contactInfo.address.city}, {client.contactInfo.address.postcode}
          </div>
        </div>

        {/* Financial & Risk Info */}
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm text-gray-600">Annual Income</p>
            <p className="font-medium">{formatCurrency(client.financialProfile.annualIncome)}</p>
          </div>
          <RiskProfileCard riskProfile={client.riskProfile} />
        </div>

        {/* Occupation */}
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <User className="h-4 w-4" />
          {client.personalDetails.occupation}
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-gray-100">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClick(client);
          }}
          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
          title="View Details"
        >
          <Eye className="h-4 w-4" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit(client.id);
          }}
          className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-md transition-colors"
          title="Edit Client"
        >
          <Edit className="h-4 w-4" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(client.id);
          }}
          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
          title="Delete Client"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

// ClientDetails Component
const ClientDetails: React.FC<{
  client: Client;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}> = ({ client, onEdit, onDelete, onClose }) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const calculateAge = (dateOfBirth: string) => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {client.personalDetails.firstName} {client.personalDetails.lastName}
            </h2>
            <p className="text-gray-600">{client.clientRef}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onEdit}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Edit className="h-4 w-4 inline mr-2" />
              Edit
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8">
          {/* Personal Details */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Date of Birth</label>
                <p className="mt-1 text-sm text-gray-900">
                  {formatDate(client.personalDetails.dateOfBirth)} (Age: {calculateAge(client.personalDetails.dateOfBirth)})
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Occupation</label>
                <p className="mt-1 text-sm text-gray-900">{client.personalDetails.occupation}</p>
              </div>
            </div>
          </section>

          {/* Contact Information */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <p className="mt-1 text-sm text-gray-900">{client.contactInfo.email}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Phone</label>
                <p className="mt-1 text-sm text-gray-900">{client.contactInfo.phone}</p>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">Address</label>
                <p className="mt-1 text-sm text-gray-900">
                  {client.contactInfo.address.city}, {client.contactInfo.address.postcode}
                </p>
              </div>
            </div>
          </section>

          {/* Financial Profile */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Profile</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Annual Income</label>
                <p className="mt-1 text-sm text-gray-900">{formatCurrency(client.financialProfile.annualIncome)}</p>
              </div>
            </div>
          </section>

          {/* Risk Profile */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Risk Profile</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Risk Tolerance</label>
                <p className="mt-1 text-sm text-gray-900">{client.riskProfile.riskTolerance}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Attitude to Risk</label>
                <p className="mt-1 text-sm text-gray-900">{client.riskProfile.attitudeToRisk}/10</p>
              </div>
            </div>
          </section>

          {/* Vulnerability Assessment */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Vulnerability Assessment</h3>
            <div className="flex items-center gap-2">
              <VulnerabilityBadge isVulnerable={client.vulnerabilityAssessment.isVulnerable} />
              {!client.vulnerabilityAssessment.isVulnerable && (
                <span className="text-sm text-gray-600">No vulnerability factors identified</span>
              )}
            </div>
          </section>

          {/* Timestamps */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Record Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Created</label>
                <p className="mt-1 text-sm text-gray-900">{formatDate(client.createdAt)}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Last Updated</label>
                <p className="mt-1 text-sm text-gray-900">{formatDate(client.updatedAt)}</p>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onDelete}
            className="px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50 transition-colors"
          >
            Delete Client
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Main ClientDashboard Component
const ClientDashboard: React.FC = () => {
  const [clients, setClients] = useState<Client[]>(mockClients);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [filters, setFilters] = useState<ClientFilters>({
    search: '',
    status: [],
    riskLevel: [],
    vulnerabilityStatus: 'all',
    sortBy: 'updatedAt',
    sortOrder: 'desc'
  });

  // Filter clients based on current filters
  const filteredClients = useMemo(() => {
    let filtered = [...clients];

    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filtered = filtered.filter(client =>
        client.personalDetails.firstName.toLowerCase().includes(searchTerm) ||
        client.personalDetails.lastName.toLowerCase().includes(searchTerm) ||
        client.clientRef.toLowerCase().includes(searchTerm) ||
        client.contactInfo.email.toLowerCase().includes(searchTerm) ||
        client.personalDetails.occupation.toLowerCase().includes(searchTerm)
      );
    }

    // Status filter
    if (filters.status.length > 0) {
      filtered = filtered.filter(client => filters.status.includes(client.status));
    }

    // Risk level filter
    if (filters.riskLevel.length > 0) {
      filtered = filtered.filter(client => filters.riskLevel.includes(client.riskProfile.riskTolerance));
    }

    // Vulnerability filter
    if (filters.vulnerabilityStatus !== 'all') {
      const isVulnerable = filters.vulnerabilityStatus === 'vulnerable';
      filtered = filtered.filter(client => client.vulnerabilityAssessment.isVulnerable === isVulnerable);
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (filters.sortBy) {
        case 'name':
          aValue = `${a.personalDetails.lastName} ${a.personalDetails.firstName}`;
          bValue = `${b.personalDetails.lastName} ${b.personalDetails.firstName}`;
          break;
        case 'createdAt':
          aValue = new Date(a.createdAt).getTime();
          bValue = new Date(b.createdAt).getTime();
          break;
        case 'updatedAt':
        default:
          aValue = new Date(a.updatedAt).getTime();
          bValue = new Date(b.updatedAt).getTime();
          break;
      }

      if (typeof aValue === 'string') {
        return filters.sortOrder === 'asc' ? aValue.localeCompare(bValue as string) : (bValue as string).localeCompare(aValue);
      } else {
        return filters.sortOrder === 'asc' ? (aValue as number) - (bValue as number) : (bValue as number) - (aValue as number);
      }
    });

    return filtered;
  }, [clients, filters]);

  // Statistics
  const stats = useMemo(() => {
    const total = clients.length;
    const active = clients.filter(c => c.status === 'active').length;
    const vulnerable = clients.filter(c => c.vulnerabilityAssessment.isVulnerable).length;
    const reviewsDue = clients.filter(c => c.status === 'review_due').length;

    return { total, active, vulnerable, reviewsDue };
  }, [clients]);

  const handleClientSelect = (client: Client) => {
    setSelectedClient(client);
  };

  const handleClientEdit = (clientId: string) => {
    // In real implementation, this would navigate to edit page
    console.log('Edit client:', clientId);
  };

  const handleClientDelete = (clientId: string) => {
    // In real implementation, this would show confirmation dialog
    if (confirm('Are you sure you want to delete this client?')) {
      setClients(clients.filter(c => c.id !== clientId));
    }
  };

  const handleAddClient = () => {
    // In real implementation, this would navigate to add client page
    console.log('Add new client');
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: [],
      riskLevel: [],
      vulnerabilityStatus: 'all',
      sortBy: 'updatedAt',
      sortOrder: 'desc'
    });
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Client Management</h1>
              <p className="text-gray-600">Manage your client relationships and compliance</p>
            </div>
            <button
              onClick={handleAddClient}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-5 w-5" />
              Add Client
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Clients</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <Users className="h-8 w-8 text-blue-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Clients</p>
                <p className="text-3xl font-bold text-green-600">{stats.active}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Vulnerable Clients</p>
                <p className="text-3xl font-bold text-red-600">{stats.vulnerable}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Reviews Due</p>
                <p className="text-3xl font-bold text-orange-600">{stats.reviewsDue}</p>
              </div>
              <Calendar className="h-8 w-8 text-orange-500" />
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <SearchBar
                value={filters.search}
                onChange={(value) => setFilters({ ...filters, search: value })}
                placeholder="Search clients by name, email, reference, or occupation..."
              />
            </div>
            <div className="flex gap-2">
              <FilterPanel
                filters={filters}
                onChange={setFilters}
                onClear={clearFilters}
              />
              <select
                value={`${filters.sortBy}-${filters.sortOrder}`}
                onChange={(e) => {
                  const [sortBy, sortOrder] = e.target.value.split('-');
                  setFilters({ ...filters, sortBy, sortOrder: sortOrder as 'asc' | 'desc' });
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="updatedAt-desc">Recently Updated</option>
                <option value="createdAt-desc">Recently Created</option>
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Results Info */}
        <div className="flex justify-between items-center mb-6">
          <p className="text-sm text-gray-600">
            Showing {filteredClients.length} of {clients.length} clients
          </p>
          {(filters.search || filters.status.length > 0 || filters.riskLevel.length > 0 || filters.vulnerabilityStatus !== 'all') && (
            <button
              onClick={clearFilters}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Clear all filters
            </button>
          )}
        </div>

        {/* Client Grid */}
        {filteredClients.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredClients.map(client => (
              <ClientCard
                key={client.id}
                client={client}
                onClick={handleClientSelect}
                onEdit={handleClientEdit}
                onDelete={handleClientDelete}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No clients found</h3>
            <p className="text-gray-600 mb-6">
              {filters.search || filters.status.length > 0 || filters.riskLevel.length > 0 
                ? "Try adjusting your search criteria or filters"
                : "Get started by adding your first client"
              }
            </p>
            {(!filters.search && filters.status.length === 0 && filters.riskLevel.length === 0) && (
              <button
                onClick={handleAddClient}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-5 w-5" />
                Add Your First Client
              </button>
            )}
          </div>
        )}
      </div>

      {/* Client Details Modal */}
      {selectedClient && (
        <ClientDetails
          client={selectedClient}
          onEdit={() => handleClientEdit(selectedClient.id)}
          onDelete={() => handleClientDelete(selectedClient.id)}
          onClose={() => setSelectedClient(null)}
        />
      )}
    </div>
  );
};

export default ClientDashboard;
// ===================================================================
// src/app/clients/page.tsx - PRODUCTION READY - Fixed TypeScript Errors
// ===================================================================

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import ClientCard from '@/components/clients/ClientCard';
import { ClientDetails } from '@/components/clients/ClientDetails';
import SearchBar from '@/components/clients/SearchBar';
import FilterPanel from '@/components/clients/FilterPanel';
import { AddCommunicationModal } from '@/components/clients/AddCommunicationModal';
import { ScheduleReviewModal } from '@/components/clients/ScheduleReviewModal';
import { ReassignClientModal } from '@/components/clients/ReassignClientModal';
import { UserCheck, CheckSquare, Square, X } from 'lucide-react';
import { clientService } from '@/services/ClientService';
import { getVulnerabilityStatus, isValidClientStatus } from '@/types/client'; // ✅ Import validation functions
import clientLogger from '@/lib/logging/clientLogger';
import type { Client, ClientFilters, ClientStatistics } from '@/types/client';

export default function ClientsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  // State management
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSuggestions, setSuggestions] = useState<string[]>([]);
  const [filters, setFilters] = useState<ClientFilters>({});
  const [statistics, setStatistics] = useState<ClientStatistics | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // View states
  const [view, setView] = useState<'list' | 'details'>('list');
  const [showFilters, setShowFilters] = useState(false);

  // Modal states
  const [showCommunicationModal, setShowCommunicationModal] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [showReassignModal, setShowReassignModal] = useState(false);

  // Selection mode for bulk operations
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedClientIds, setSelectedClientIds] = useState<Set<string>>(new Set());

  // Advisors for filter
  const [advisors, setAdvisors] = useState<Array<{ id: string; name: string; role?: string }>>([]);

  // Load clients data
  const loadClients = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);

      const response = await clientService.getAllClients(filters, currentPage, 20);

      setClients(response.clients);
      setTotalPages(response.totalPages);

      // Load statistics - Don't filter by advisor for now to see all data
      const stats = await clientService.getClientStatistics();
      setStatistics(stats);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load clients';
      setError(errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [user, filters, currentPage, toast]);

  // Load and show specific client
  const loadClientAndShow = useCallback(async (clientId: string) => {
    try {
      const client = await clientService.getClientById(clientId);
      setSelectedClient(client);
      setView('details');
    } catch (error) {
      clientLogger.error('Error loading updated client:', error);
      // If we can't load the specific client, just show the list
      loadClients();
    }
  }, [loadClients]);

  // ✅ FIXED: Check for success message from URL params with null safety
  useEffect(() => {
    // ✅ PRODUCTION: Safe searchParams access with null checking
    if (!searchParams) return;
    
    const successMessage = searchParams.get('success');
    const updatedClientId = searchParams.get('updated');
    
    if (successMessage) {
      toast({
        title: 'Success',
        description: decodeURIComponent(successMessage),
        variant: 'default'
      });
      
      // Clean up URL parameters
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
      
      // If we have an updated client ID, try to show that client
      if (updatedClientId) {
        loadClientAndShow(updatedClientId);
      }
    }
  }, [searchParams, toast, loadClientAndShow]);

  // Load advisors for filter
  const loadAdvisors = useCallback(async () => {
    try {
      const response = await fetch('/api/advisors');
      if (response.ok) {
        const data = await response.json();
        setAdvisors(data.data || []);
      }
    } catch (error) {
      clientLogger.error('Error loading advisors:', error);
    }
  }, []);

  // Search clients
  const handleSearch = async (query: string) => {
    setSearchQuery(query);

    if (query.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      const searchResult = await clientService.searchClients(query);
      setSuggestions(searchResult.suggestions);

      if (query.length >= 3) {
        setClients(searchResult.clients);
      }
    } catch (err) {
      clientLogger.error('Search error:', err);
    }
  };

  // Filter handlers
  const handleFiltersChange = (newFilters: ClientFilters) => {
    setFilters(newFilters);
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleClearFilters = () => {
    setFilters({});
    setSearchQuery('');
    setCurrentPage(1);
  };

  // ✅ PRODUCTION: Enhanced clickable statistics handlers with validation
  const handleStatisticClick = (type: 'total' | 'active' | 'reviews' | 'vulnerable') => {
    let newFilters: ClientFilters = {};
    
    switch (type) {
      case 'total':
        // Show all clients - clear filters
        newFilters = {};
        break;
      case 'active':
        newFilters = { status: ['active'] };
        break;
      case 'reviews':
        newFilters = { status: ['review_due'] };
        break;
      case 'vulnerable':
        newFilters = { vulnerabilityStatus: 'vulnerable' };
        break;
    }
    
    setFilters(newFilters);
    setCurrentPage(1);
    setSearchQuery('');
    
    // Show success message
    const messages = {
      total: 'Showing all clients',
      active: 'Filtered to show active clients',
      reviews: 'Filtered to show clients with reviews due',
      vulnerable: 'Filtered to show vulnerable clients'
    };
    
    toast({
      title: 'Filter Applied',
      description: messages[type],
      variant: 'default'
    });
    
    // Force reload with new filters
    setTimeout(() => {
      loadClients();
    }, 100);
  };

  // Client action handlers
  const handleViewClient = (client: Client) => {
    // Navigate to the full client detail page for a consistent experience
    router.push(`/clients/${client.id}`);
  };

  const handleEditClient = (client: Client) => {
    router.push(`/clients/${client.id}/edit`);
  };

  // ✅ PRODUCTION: Safe delete handler with better name extraction and validation
  const handleDeleteClient = async (client: Client) => {
    // Safely extract client name with multiple fallback options
    const firstName = client.personalDetails?.firstName || '';
    const lastName = client.personalDetails?.lastName || '';
    const clientName = [firstName, lastName].filter(Boolean).join(' ') || 
                      client.clientRef || 
                      'this client';

    if (!confirm(`Are you sure you want to delete ${clientName}?`)) {
      return;
    }

    try {
      await clientService.deleteClient(client.id);
      toast({
        title: 'Success',
        description: `${clientName} has been deleted successfully`
      });
      loadClients(); // Reload the list
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete client';
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  };

  const handleAddCommunication = () => {
    if (selectedClient) {
      setShowCommunicationModal(true);
    } else {
      toast({
        title: 'No Client Selected',
        description: 'Please select a client first',
        variant: 'destructive'
      });
    }
  };

  const handleScheduleReview = () => {
    if (selectedClient) {
      setShowReviewModal(true);
    } else {
      toast({
        title: 'No Client Selected',
        description: 'Please select a client first',
        variant: 'destructive'
      });
    }
  };

  // Selection mode handlers
  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    if (selectionMode) {
      // Exiting selection mode - clear selections
      setSelectedClientIds(new Set());
    }
  };

  const toggleClientSelection = (clientId: string) => {
    const newSelection = new Set(selectedClientIds);
    if (newSelection.has(clientId)) {
      newSelection.delete(clientId);
    } else {
      newSelection.add(clientId);
    }
    setSelectedClientIds(newSelection);
  };

  const selectAllClients = () => {
    setSelectedClientIds(new Set(clients.map(c => c.id)));
  };

  const clearSelection = () => {
    setSelectedClientIds(new Set());
  };

  // Get clients prepared for reassignment modal
  const getSelectedClientsForReassign = () => {
    return clients
      .filter(c => selectedClientIds.has(c.id))
      .map(c => {
        const currentAdvisor = advisors.find(a => a.id === c.advisorId);
        return {
          id: c.id,
          name: `${c.personalDetails?.firstName || ''} ${c.personalDetails?.lastName || ''}`.trim() || 'Unnamed Client',
          currentAdvisorId: c.advisorId,
          currentAdvisorName: currentAdvisor?.name || 'Unassigned'
        };
      });
  };

  const handleReassignSuccess = () => {
    setSelectionMode(false);
    setSelectedClientIds(new Set());
    loadClients(); // Refresh the list
  };

  useEffect(() => {
    if (user) {
      loadClients();
      loadAdvisors(); // Load advisors on mount
    }
  }, [user, loadClients, loadAdvisors]);

  // ✅ PRODUCTION: Enhanced loading states
  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading clients...</p>
          <p className="text-sm text-gray-500 mt-2">
            Fetching client profiles and advisor assignments.
          </p>
        </div>
      </div>
    );
  }

  if (error && !clients.length) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Clients</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={loadClients}>Try Again</Button>
        </div>
      </div>
    );
  }

  if (view === 'details' && selectedClient) {
    return (
      <div className="container mx-auto px-4 py-6">
        <div className="mb-4">
          <Button
            variant="outline"
            onClick={() => {
              setView('list');
              setSelectedClient(null);
            }}
          >
            ← Back to Clients
          </Button>
        </div>

        <ClientDetails
          client={selectedClient}
          onEdit={() => handleEditClient(selectedClient)}
          onDelete={() => handleDeleteClient(selectedClient)}
          onAddCommunication={handleAddCommunication}
          onScheduleReview={handleScheduleReview}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex flex-col gap-4 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Clients</h1>
            <p className="text-gray-600">Manage your client relationships</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant={selectionMode ? 'default' : 'outline'}
              onClick={toggleSelectionMode}
              className="gap-2"
            >
              {selectionMode ? (
                <>
                  <X className="h-4 w-4" />
                  Cancel
                </>
              ) : (
                <>
                  <CheckSquare className="h-4 w-4" />
                  Select
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
            >
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>
            <Button onClick={() => router.push('/clients/new')}>
              Add Client
            </Button>
          </div>
        </div>

        {/* Selection mode toolbar */}
        {selectionMode && (
          <div className="flex flex-wrap items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <span className="text-sm font-medium text-blue-900">
              {selectedClientIds.size} of {clients.length} selected
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={selectAllClients}
                disabled={selectedClientIds.size === clients.length}
              >
                Select All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearSelection}
                disabled={selectedClientIds.size === 0}
              >
                Clear
              </Button>
            </div>
            <div className="flex-1" />
            <Button
              size="sm"
              onClick={() => setShowReassignModal(true)}
              disabled={selectedClientIds.size === 0}
              className="gap-2"
            >
              <UserCheck className="h-4 w-4" />
              Reassign ({selectedClientIds.size})
            </Button>
          </div>
        )}
      </div>

      {/* ✅ PRODUCTION: Enhanced clickable statistics dashboard with proper validation */}
      {statistics && (
  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
    <Card 
      className="cursor-pointer hover:shadow-lg transition-shadow"
      onClick={() => handleStatisticClick('total')}
    >
      <CardContent className="p-4">
        <p className="text-sm font-medium text-gray-600">Total Clients</p>
        <p className="text-2xl font-bold">{statistics.totalClients || 0}</p>
        <p className="text-xs text-gray-500 mt-1">Click to view all</p>
      </CardContent>
    </Card>
          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => handleStatisticClick('active')}
          >
            <CardContent className="p-4">
              <p className="text-sm font-medium text-gray-600">Active Clients</p>
              <p className="text-2xl font-bold text-green-600">{statistics.activeClients}</p>
              <p className="text-xs text-gray-500 mt-1">Click to filter active</p>
            </CardContent>
          </Card>
          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => handleStatisticClick('reviews')}
          >
            <CardContent className="p-4">
              <p className="text-sm font-medium text-gray-600">Reviews Due</p>
              <p className="text-2xl font-bold text-orange-600">{statistics.reviewsDue}</p>
              <p className="text-xs text-gray-500 mt-1">Click to filter reviews</p>
            </CardContent>
          </Card>
          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow"
            onClick={() => handleStatisticClick('vulnerable')}
          >
            <CardContent className="p-4">
              <p className="text-sm font-medium text-gray-600">Vulnerable</p>
              <p className="text-2xl font-bold text-red-600">{statistics.vulnerableClients}</p>
              <p className="text-xs text-gray-500 mt-1">Click to filter vulnerable</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <div className="space-y-4 mb-6">
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          onSearch={handleSearch}
          onClear={() => {
            setSearchQuery('');
            loadClients();
          }}
          suggestions={searchSuggestions}
          loading={loading}
          placeholder="Search clients by name, email, or reference..."
        />

        {showFilters && (
          <FilterPanel
            filters={filters}
            onChange={handleFiltersChange}
            onClear={handleClearFilters}
            advisors={advisors}
          />
        )}
      </div>

      {/* Active Filters Display */}
      {(Object.keys(filters).length > 0 || searchQuery) && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-blue-900">Active Filters:</span>
              {filters.status && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                  Status: {filters.status.join(', ')}
                </span>
              )}
              {filters.vulnerabilityStatus && filters.vulnerabilityStatus !== 'all' && (
                <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                  Vulnerability: {filters.vulnerabilityStatus}
                </span>
              )}
              {searchQuery && (
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                  Search: &quot;{searchQuery}&quot;
                </span>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                handleClearFilters();
                loadClients();
              }}
              className="w-full sm:w-auto"
            >
              Clear All
            </Button>
          </div>
        </div>
      )}

      {/* Client Cards or Empty State */}
      {clients.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Clients Found</h3>
            <p className="text-gray-600">
              {searchQuery || Object.keys(filters).length > 0
                ? 'No clients match your search criteria.'
                : 'Get started by adding your first client.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
            {clients.map((client) => (
              <div key={client.id} className="relative">
                {/* Selection checkbox overlay */}
                {selectionMode && (
                  <button
                    onClick={() => toggleClientSelection(client.id)}
                    className={`absolute top-3 left-3 z-10 p-1 rounded-md transition-all ${
                      selectedClientIds.has(client.id)
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-gray-300 text-gray-400 hover:border-blue-500 hover:text-blue-500'
                    }`}
                  >
                    {selectedClientIds.has(client.id) ? (
                      <CheckSquare className="h-5 w-5" />
                    ) : (
                      <Square className="h-5 w-5" />
                    )}
                  </button>
                )}
                <div className={selectionMode ? 'pl-2' : ''}>
                  <ClientCard
                    client={client}
                    onView={() => selectionMode ? toggleClientSelection(client.id) : handleViewClient(client)}
                    onEdit={() => handleEditClient(client)}
                    onDelete={() => handleDeleteClient(client)}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="px-4 py-2 text-sm text-gray-600">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      {/* Communication Modal */}
      {selectedClient && (
        <AddCommunicationModal
          isOpen={showCommunicationModal}
          onClose={() => setShowCommunicationModal(false)}
          clientId={selectedClient.id}
          clientName={`${selectedClient.personalDetails?.firstName || ''} ${selectedClient.personalDetails?.lastName || ''}`.trim() || 'Client'}
          onSuccess={() => {
            // Optionally refresh data after adding communication
          }}
        />
      )}

      {/* Review Modal */}
      {selectedClient && (
        <ScheduleReviewModal
          isOpen={showReviewModal}
          onClose={() => setShowReviewModal(false)}
          clientId={selectedClient.id}
          clientName={`${selectedClient.personalDetails?.firstName || ''} ${selectedClient.personalDetails?.lastName || ''}`.trim() || 'Client'}
          onSuccess={() => {
            // Optionally refresh data after scheduling review
          }}
        />
      )}

      {/* Reassign Modal */}
      <ReassignClientModal
        isOpen={showReassignModal}
        onClose={() => setShowReassignModal(false)}
        clients={getSelectedClientsForReassign()}
        advisors={advisors}
        onSuccess={handleReassignSuccess}
      />
    </div>
  );
}

// ===================================================================
// src/components/documents/SummaryCards.tsx - PRODUCTION READY - Complete File
// ===================================================================

'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import type { DocumentMetrics } from '@/types/document'; // ✅ FIXED: Now this import exists

interface SummaryCardsProps {
  metrics?: DocumentMetrics | null;
  loading?: boolean;
}

export function SummaryCards({ metrics, loading = false }: SummaryCardsProps) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              <div className="h-4 w-4 bg-gray-200 rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-full"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">No Data Available</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-500">Document metrics are not available at the moment.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStoragePercentage = (): number => {
    if (metrics.storage_limit === 0) return 0;
    return Math.round((metrics.storage_used / metrics.storage_limit) * 100);
  };

  const getStorageColor = (): string => {
    const percentage = getStoragePercentage();
    if (percentage >= 90) return 'text-red-600';
    if (percentage >= 75) return 'text-yellow-600';
    return 'text-green-600';
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {/* Total Documents */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
          <svg
            className="h-4 w-4 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.total_documents.toLocaleString()}</div>
          <p className="text-xs text-gray-500">
            {metrics.recent_uploads > 0 && (
              <span className="text-green-600">
                +{metrics.recent_uploads} this month
              </span>
            )}
          </p>
        </CardContent>
      </Card>

      {/* Pending Signatures */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Pending Signatures</CardTitle>
          <svg
            className="h-4 w-4 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
            />
          </svg>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.pending_signatures}</div>
          <p className="text-xs text-gray-500">
            {metrics.pending_signatures > 0 ? (
              <span className="text-orange-600">Require attention</span>
            ) : (
              <span className="text-green-600">All up to date</span>
            )}
          </p>
        </CardContent>
      </Card>

      {/* Expiring Soon */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
          <svg
            className="h-4 w-4 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{metrics.expiring_soon}</div>
          <p className="text-xs text-gray-500">
            {metrics.expiring_soon > 0 ? (
              <span className="text-red-600">Next 30 days</span>
            ) : (
              <span className="text-green-600">None expiring</span>
            )}
          </p>
        </CardContent>
      </Card>

      {/* Storage Usage */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Storage Usage</CardTitle>
          <svg
            className="h-4 w-4 text-gray-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
            />
          </svg>
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${getStorageColor()}`}>
            {getStoragePercentage()}%
          </div>
          <p className="text-xs text-gray-500">
            {formatBytes(metrics.storage_used)} of {formatBytes(metrics.storage_limit)}
          </p>
          <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
            <div
              className={`h-1.5 rounded-full ${
                getStoragePercentage() >= 90
                  ? 'bg-red-500'
                  : getStoragePercentage() >= 75
                  ? 'bg-yellow-500'
                  : 'bg-green-500'
              }`}
              style={{ width: `${getStoragePercentage()}%` }}
            ></div>
          </div>
        </CardContent>
      </Card>

      {/* Documents by Category */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Documents by Category</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metrics.by_category.map((category, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{category.category}</span>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline">{category.count}</Badge>
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full"
                      style={{
                        width: `${(category.count / metrics.total_documents) * 100}%`
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Documents by Status */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="text-sm font-medium">Documents by Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metrics.by_status.map((status, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-gray-600 capitalize">
                  {status.status.replace('_', ' ')}
                </span>
                <div className="flex items-center space-x-2">
                  <Badge 
                    variant={
                      status.status === 'active' ? 'default' :
                      status.status === 'pending' ? 'secondary' :
                      status.status === 'archived' ? 'outline' : 'secondary'
                    }
                  >
                    {status.count}
                  </Badge>
                  <div className="w-16 bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full ${
                        status.status === 'active' ? 'bg-green-500' :
                        status.status === 'pending' ? 'bg-yellow-500' :
                        status.status === 'archived' ? 'bg-gray-500' : 'bg-blue-500'
                      }`}
                      style={{
                        width: `${(status.count / metrics.total_documents) * 100}%`
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default SummaryCards;
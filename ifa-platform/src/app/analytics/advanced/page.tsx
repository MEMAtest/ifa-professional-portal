
import { Suspense } from 'react';
import { AdvancedAnalyticsDashboard } from '@/components/analytics/AdvancedAnalyticsDashboard';
import { Card, CardContent } from '@/components/ui/Card';

export default function AdvancedAnalyticsPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Advanced Analytics</h1>
            <p className="text-gray-600 mt-1">
              Comprehensive stress testing, compliance validation, and risk analysis
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
              ✅ FCA Compliant
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-6">
        <Suspense fallback={<AdvancedAnalyticsLoading />}>
          <AdvancedAnalyticsDashboard />
        </Suspense>
      </div>
    </div>
  );
}

function AdvancedAnalyticsLoading() {
  return (
    <Card>
      <CardContent className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </CardContent>
    </Card>
  );
}
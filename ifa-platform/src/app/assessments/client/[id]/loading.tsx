// File: /app/assessments/client/[id]/loading.tsx
// Loading skeleton for Assessment Client Hub

import React from 'react'
import { 
  ArrowLeft, 
  User, 
  Activity, 
  Target, 
  Clock,
  Zap
} from 'lucide-react'

export default function AssessmentClientLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header Skeleton */}
      <div className="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
            <div className="flex items-center space-x-4 w-full sm:w-auto">
              <div className="p-2 hover:bg-gray-100 rounded-xl transition-colors flex items-center space-x-2">
                <ArrowLeft className="h-5 w-5 text-gray-400" />
                <div className="h-5 w-20 bg-gray-200 rounded animate-pulse" />
              </div>
              
              <div className="h-8 w-px bg-gray-300 hidden sm:block" />
              
              <div className="flex items-center space-x-3 flex-1 sm:flex-initial">
                <div className="p-3 bg-gray-200 rounded-xl">
                  <User className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400" />
                </div>
                <div className="min-w-0">
                  <div className="h-7 w-48 bg-gray-200 rounded animate-pulse mb-2" />
                  <div className="h-4 w-64 bg-gray-200 rounded animate-pulse" />
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-end">
              <div className="h-8 w-24 bg-gray-200 rounded-full animate-pulse" />
              <div className="text-right">
                <div className="h-4 w-16 bg-gray-200 rounded animate-pulse mb-1" />
                <div className="h-6 w-12 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Compliance Alerts Skeleton */}
        <div className="mb-6">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-gray-100">
              <div className="h-6 w-48 bg-gray-200 rounded animate-pulse" />
            </div>
            <div className="p-4 sm:p-6">
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="p-4 rounded-xl border border-gray-200">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="h-5 w-32 bg-gray-200 rounded animate-pulse mb-2" />
                        <div className="h-4 w-full bg-gray-200 rounded animate-pulse mb-2" />
                        <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
                      </div>
                      <div className="ml-4 h-6 w-16 bg-gray-200 rounded-full animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Progress Overview Grid Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Progress Summary Card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-gray-100">
              <div className="flex items-center space-x-2">
                <Activity className="h-5 w-5 text-gray-400" />
                <div className="h-6 w-40 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
            <div className="p-4 sm:p-6">
              <div className="text-center mb-6">
                <div className="w-32 h-32 bg-gray-200 rounded-full mx-auto animate-pulse mb-4" />
                <div className="h-4 w-32 bg-gray-200 rounded animate-pulse mx-auto" />
              </div>
              
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
                    <div className="flex items-center space-x-2">
                      <div className="w-24 bg-gray-200 rounded-full h-2" />
                      <div className="h-4 w-4 bg-gray-200 rounded-full animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Risk Profile Card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-gray-100">
              <div className="flex items-center space-x-2">
                <Target className="h-5 w-5 text-gray-400" />
                <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
            <div className="p-4 sm:p-6">
              <div className="text-center mb-4">
                <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mx-auto mb-2" />
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mx-auto" />
              </div>
              
              <div className="h-48 bg-gray-100 rounded-lg animate-pulse" />
            </div>
          </div>

          {/* Recent Activity Card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 sm:p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Clock className="h-5 w-5 text-gray-400" />
                  <div className="h-6 w-32 bg-gray-200 rounded animate-pulse" />
                </div>
                <div className="h-4 w-16 bg-gray-200 rounded animate-pulse" />
              </div>
            </div>
            <div className="p-4 sm:p-6">
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-start space-x-3">
                    <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse" />
                    <div className="flex-1">
                      <div className="h-4 w-full bg-gray-200 rounded animate-pulse mb-2" />
                      <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Assessment Cards Grid Skeleton */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden mb-8">
          <div className="p-4 sm:p-6 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Zap className="h-5 w-5 text-gray-400" />
                <div className="h-6 w-40 bg-gray-200 rounded animate-pulse" />
              </div>
              <div className="h-4 w-48 bg-gray-200 rounded animate-pulse" />
            </div>
          </div>
          <div className="p-4 sm:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="p-6 border-2 rounded-2xl border-gray-200">
                  <div className="flex items-start justify-between mb-4">
                    <div className="p-3 rounded-xl bg-gray-200 animate-pulse">
                      <div className="h-6 w-6" />
                    </div>
                  </div>
                  
                  <div className="h-6 w-3/4 bg-gray-200 rounded animate-pulse mb-2" />
                  <div className="h-4 w-full bg-gray-200 rounded animate-pulse mb-4" />
                  <div className="h-4 w-full bg-gray-200 rounded animate-pulse mb-4" />
                  
                  <div className="flex items-center justify-between mb-4">
                    <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
                    <div className="h-6 w-24 bg-gray-200 rounded-full animate-pulse" />
                  </div>
                  
                  <div className="w-full h-12 bg-gray-200 rounded-xl animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Quick Actions Footer Skeleton */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0">
              <div>
                <div className="h-6 w-40 bg-gray-200 rounded animate-pulse mb-2" />
                <div className="h-4 w-64 bg-gray-200 rounded animate-pulse" />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 w-32 bg-gray-200 rounded-xl animate-pulse" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
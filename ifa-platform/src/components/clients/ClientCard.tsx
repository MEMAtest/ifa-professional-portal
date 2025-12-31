'use client';

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { VulnerabilityBadge } from '@/components/ui/VulnerabilityIndicator';
import { ExportClientPdfButton } from '@/components/shared/ExportClientPdfButton';
import { Mail, Phone, TrendingUp, Calendar, MoreVertical, User } from 'lucide-react';
import type { Client } from '@/types/client';
import { getVulnerabilityStatus, isValidClientStatus } from '@/types/client';
import {
  formatCurrency,
  formatDate,
  getStatusColor,
  getRiskLevelName,
  getRiskLevelColor as getRiskBadgeColor,
} from '@/lib/utils';

export interface ClientCardProps {
  client: Client;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export default function ClientCard({ client, onView, onEdit, onDelete }: ClientCardProps) {
  const handleView = () => onView(client.id);
  const handleEdit = () => onEdit(client.id);
  const handleDelete = () => onDelete(client.id);

  // Safe data extraction with comprehensive validation
  const fullName = [
    client.personalDetails?.firstName || '',
    client.personalDetails?.lastName || ''
  ].filter(Boolean).join(' ') || 'Unnamed Client';

  const initials = [
    client.personalDetails?.firstName?.[0] || '',
    client.personalDetails?.lastName?.[0] || ''
  ].filter(Boolean).join('').toUpperCase() || '??';
  
  // Safe risk tolerance handling with proper type checking
  const riskToleranceValue = client.riskProfile?.riskTolerance || 'Moderate';
  const riskLevelName = typeof riskToleranceValue === 'string' 
    ? riskToleranceValue 
    : getRiskLevelName(riskToleranceValue);
  const riskBadgeColor = getRiskBadgeColor(riskToleranceValue);

  // Production-ready status handling with validation
  const clientStatus = isValidClientStatus(client.status) ? client.status : 'inactive';
  const clientRef = typeof client.clientRef === 'string' ? client.clientRef : 'No Reference';

  // Use standardized vulnerability checking
  const isVulnerable = getVulnerabilityStatus(client.vulnerabilityAssessment);

  return (
    <Card className="group hover:shadow-lg transition-all duration-200 border border-gray-200 hover:border-gray-300">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold text-lg">
              {initials !== '??' ? initials : <User size={24} />}
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 text-lg">{fullName}</h3>
              <p className="text-sm text-gray-500 font-mono">{clientRef}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Badge className={`text-xs font-medium border ${getStatusColor(clientStatus)}`}>
              {clientStatus.replace('_', ' ').toUpperCase()}
            </Badge>
            {isVulnerable === true && (
              <VulnerabilityBadge client={client} />
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Contact information with safe handling */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Mail className="h-4 w-4" />
            <span className="truncate">
              {client.contactInfo?.email || 'No email provided'}
            </span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Phone className="h-4 w-4" />
            <span>
              {client.contactInfo?.phone || 'No phone provided'}
            </span>
          </div>
        </div>
        
        {/* Financial data with proper null handling */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-3 border-t border-gray-100">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Annual Income</p>
            <p className="text-sm font-semibold text-gray-900">
              {formatCurrency(client.financialProfile?.annualIncome ?? 0)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide">Net Worth</p>
            <p className="text-sm font-semibold text-gray-900">
              {formatCurrency(client.financialProfile?.netWorth ?? 0)}
            </p>
          </div>
        </div>
        
        <div className="flex items-center justify-between py-2 border-t border-gray-100">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4 text-gray-400" />
            <span className="text-sm text-gray-600">Risk Tolerance:</span>
          </div>
          <Badge className={`text-xs font-medium border ${riskBadgeColor}`}>
            {riskLevelName}
          </Badge>
        </div>
        
        {/* Investment objectives with robust parsing */}
        {(client.financialProfile?.investmentObjectives?.length || 0) > 0 && (
          <div className="border-t border-gray-100 pt-3">
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-2">Objectives</p>
            <div className="flex flex-wrap gap-1">
              {client.financialProfile!.investmentObjectives!.slice(0, 2).map((objective, index) => {
                let displayText = '';
                if (typeof objective === 'string') {
                  displayText = objective;
                } else if (typeof objective === 'object' && objective !== null) {
                  const obj = objective as any;
                  displayText = obj.description || obj.type || obj.name || 'Investment Goal';
                } else {
                  displayText = 'Investment Goal';
                }
                
                return (
                  <Badge key={index} variant="outline" className="text-xs">
                    {displayText}
                  </Badge>
                );
              })}
              {(client.financialProfile!.investmentObjectives!.length || 0) > 2 && (
                <Badge variant="outline" className="text-xs">
                  +{(client.financialProfile!.investmentObjectives!.length || 0) - 2} more
                </Badge>
              )}
            </div>
          </div>
        )}
        
        <div className="flex items-center justify-between text-xs text-gray-500 border-t border-gray-100 pt-3">
          <div className="flex items-center space-x-1">
            <Calendar className="h-3 w-3" />
            <span>Updated {formatDate(client.updatedAt)}</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 pt-3 border-t border-gray-100">
          <Button onClick={handleView} variant="outline" size="sm" className="flex-1 text-xs">
            View
          </Button>
          <Button onClick={handleEdit} variant="outline" size="sm" className="flex-1 text-xs">
            Edit
          </Button>
          <ExportClientPdfButton
            clientId={client.id}
            clientToken={client.clientRef || client.id}
            variant="outline"
            size="sm"
            label="Export"
          />
          <Button onClick={handleDelete} variant="destructive" size="sm" className="px-3">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

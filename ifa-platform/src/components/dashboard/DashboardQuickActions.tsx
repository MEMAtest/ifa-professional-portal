import React from 'react';
import { BarChart3, FileText, Users } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface DashboardQuickActionsProps {
  onNewAssessment: () => void;
  onAddClient: () => void;
  onGenerateReport: () => void;
}

export function DashboardQuickActions({
  onNewAssessment,
  onAddClient,
  onGenerateReport
}: DashboardQuickActionsProps) {
  return (
    <div className="flex gap-4">
      <Button onClick={onNewAssessment} className="flex items-center gap-2">
        <FileText className="h-4 w-4" />
        New Assessment
      </Button>
      <Button onClick={onAddClient} variant="secondary" className="flex items-center gap-2">
        <Users className="h-4 w-4" />
        Add Client
      </Button>
      <Button onClick={onGenerateReport} variant="secondary" className="flex items-center gap-2">
        <BarChart3 className="h-4 w-4" />
        Generate Report
      </Button>
    </div>
  );
}

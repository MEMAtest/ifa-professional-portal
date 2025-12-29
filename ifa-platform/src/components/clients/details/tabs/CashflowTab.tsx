import CashFlowDashboard from '@/components/cashflow/CashFlowDashboard';

interface CashflowTabProps {
  clientId: string;
}

export function CashflowTab({ clientId }: CashflowTabProps) {
  return (
    <div className="relative">
      <CashFlowDashboard clientId={clientId} />
    </div>
  );
}

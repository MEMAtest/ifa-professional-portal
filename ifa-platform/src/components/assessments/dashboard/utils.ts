import {
  TrendingUp,
  Users,
  FileText,
  LineChart as LineChartIcon,
  Calculator,
  Shield
} from 'lucide-react';
import { normalizeAssessmentType } from '@/lib/assessments/routing';

export const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);
};

export const getAssessmentIcon = (type: string) => {
  switch (normalizeAssessmentType(type)) {
    case 'atr':
      return Shield;
    case 'cfl':
      return TrendingUp;
    case 'persona':
      return Users;
    case 'suitability':
      return FileText;
    case 'monte_carlo':
      return LineChartIcon;
    case 'cashflow':
      return Calculator;
    default:
      return FileText;
  }
};

export const getAssessmentName = (type: string) => {
  switch (normalizeAssessmentType(type)) {
    case 'atr':
      return 'Attitude to Risk';
    case 'cfl':
      return 'Capacity for Loss';
    case 'persona':
      return 'Investor Persona';
    case 'suitability':
      return 'Suitability';
    case 'monte_carlo':
      return 'Monte Carlo';
    case 'cashflow':
      return 'Cash Flow';
    default:
      return type;
  }
};

export const getAssessmentColor = (type: string) => {
  switch (normalizeAssessmentType(type)) {
    case 'atr':
      return 'bg-blue-600';
    case 'cfl':
      return 'bg-green-600';
    case 'persona':
      return 'bg-purple-600';
    case 'suitability':
      return 'bg-indigo-600';
    case 'monte_carlo':
      return 'bg-orange-600';
    case 'cashflow':
      return 'bg-teal-600';
    default:
      return 'bg-gray-600';
  }
};

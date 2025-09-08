// src/config/assessmentTypes.ts - COMPLETE UPDATED VERSION
// NO PREREQUISITES - ALL ASSESSMENTS OPTIONAL AND INDEPENDENT

import { 
  Shield, 
  TrendingUp, 
  User, 
  FileText, 
  Activity, 
  Calculator,
  LucideIcon
} from 'lucide-react';

export interface AssessmentTypeConfig {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  route: string;
  required: boolean;
  category: 'risk' | 'planning' | 'compliance';
  estimatedTime: string;
  prerequisites?: string[]; // Keep field but always empty
  scoringType?: 'numeric' | 'category' | 'percentage';
  color: string;
  shortName: string;
  order?: number; // Add order for display purposes only
}

// ALL ASSESSMENTS - No mandatory requirements, no prerequisites
export const assessmentTypes: Record<string, AssessmentTypeConfig> = {
  suitability: {
    id: 'suitability',
    name: 'Full Suitability',
    shortName: 'Suitability',
    description: 'Comprehensive suitability assessment',
    icon: FileText,
    route: '/assessments/suitability',
    required: false, // ✅ Changed to false
    category: 'compliance',
    estimatedTime: '30-45 minutes',
    prerequisites: [], // ✅ No prerequisites
    scoringType: 'percentage',
    color: 'green',
    order: 1
  },
  atr: {
    id: 'atr',
    name: 'Attitude to Risk',
    shortName: 'ATR',
    description: 'Measures psychological comfort with investment volatility',
    icon: Shield,
    route: '/assessments/atr',
    required: false, // ✅ Changed to false
    category: 'risk',
    estimatedTime: '10-15 minutes',
    prerequisites: [], // ✅ No prerequisites
    scoringType: 'numeric',
    color: 'blue',
    order: 2
  },
  cfl: {
    id: 'cfl',
    name: 'Capacity for Loss',
    shortName: 'CFL',
    description: 'Evaluates financial ability to absorb investment losses',
    icon: TrendingUp,
    route: '/assessments/cfl',
    required: false, // ✅ Changed to false
    category: 'risk',
    estimatedTime: '5-10 minutes',
    prerequisites: [], // ✅ No prerequisites
    scoringType: 'numeric',
    color: 'purple',
    order: 3
  },
  persona: {
    id: 'persona',
    name: 'Investor Persona',
    shortName: 'Persona',
    description: 'Behavioral profiling for personalized advice delivery',
    icon: User,
    route: '/assessments/persona-assessment',
    required: false, // ✅ Changed to false
    category: 'compliance',
    estimatedTime: '5 minutes',
    prerequisites: [], // ✅ No prerequisites
    scoringType: 'category',
    color: 'indigo',
    order: 4
  },
  monteCarlo: {
    id: 'monteCarlo',
    name: 'Monte Carlo Analysis',
    shortName: 'Monte Carlo',
    description: 'Probability-based retirement planning simulations',
    icon: Activity,
    route: '/monte-carlo',
    required: false,
    category: 'planning',
    estimatedTime: '15-20 minutes',
    prerequisites: [], // ✅ No prerequisites
    scoringType: 'percentage',
    color: 'orange',
    order: 5
  },
  cashFlow: {
    id: 'cashFlow',
    name: 'Cash Flow Planning',
    shortName: 'Cash Flow',
    description: 'Detailed income and expenditure projections',
    icon: Calculator,
    route: '/cashflow',
    required: false,
    category: 'planning',
    estimatedTime: '20-30 minutes',
    prerequisites: [], // ✅ No prerequisites
    scoringType: 'numeric',
    color: 'teal',
    order: 6
  }
};

// ✅ UPDATED: All assessments are now optional
export const requiredAssessments: AssessmentTypeConfig[] = [];

// ✅ UPDATED: All assessments are optional
export const optionalAssessments = Object.values(assessmentTypes).sort((a, b) => 
  (a.order || 99) - (b.order || 99)
);

// Get assessment by ID
export const getAssessmentType = (id: string): AssessmentTypeConfig | undefined => {
  return assessmentTypes[id];
};

// ✅ UPDATED: No prerequisites to check
export const checkPrerequisites = (
  assessmentId: string, 
  completedAssessments: string[]
): { met: boolean; missing: string[] } => {
  // Always return met: true since no prerequisites
  return { met: true, missing: [] };
};

// Get color classes for Tailwind
export const getAssessmentColorClasses = (color: string) => {
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    blue: {
      bg: 'bg-blue-100',
      text: 'text-blue-600',
      border: 'border-blue-200'
    },
    green: {
      bg: 'bg-green-100',
      text: 'text-green-600',
      border: 'border-green-200'
    },
    purple: {
      bg: 'bg-purple-100',
      text: 'text-purple-600',
      border: 'border-purple-200'
    },
    orange: {
      bg: 'bg-orange-100',
      text: 'text-orange-600',
      border: 'border-orange-200'
    },
    indigo: {
      bg: 'bg-indigo-100',
      text: 'text-indigo-600',
      border: 'border-indigo-200'
    },
    teal: {
      bg: 'bg-teal-100',
      text: 'text-teal-600',
      border: 'border-teal-200'
    }
  };
  
  return colorMap[color] || colorMap.blue;
};

// ✅ UPDATED: Calculate progress based on all assessments
export const calculateOverallProgress = (
  completedAssessments: string[],
  includeOptional: boolean = true // Default to include all
): number => {
  const allAssessments = Object.keys(assessmentTypes);
  const completed = allAssessments.filter(id => 
    completedAssessments.includes(id)
  ).length;
  
  return allAssessments.length > 0 
    ? Math.round((completed / allAssessments.length) * 100)
    : 0;
};

// ✅ UPDATED: Suggest next assessment (any uncompleted one)
export const getNextAssessment = (
  completedAssessments: string[]
): AssessmentTypeConfig | null => {
  // Return first uncompleted assessment
  const allAssessments = Object.values(assessmentTypes).sort((a, b) => 
    (a.order || 99) - (b.order || 99)
  );
  
  for (const assessment of allAssessments) {
    if (!completedAssessments.includes(assessment.id)) {
      return assessment;
    }
  }
  
  return null;
};

// Group assessments by category
export const assessmentsByCategory = Object.values(assessmentTypes).reduce((acc, assessment) => {
  if (!acc[assessment.category]) {
    acc[assessment.category] = [];
  }
  acc[assessment.category].push(assessment);
  return acc;
}, {} as Record<string, AssessmentTypeConfig[]>);

// Export category labels
export const categoryLabels = {
  risk: 'Risk Profiling',
  planning: 'Financial Planning',
  compliance: 'Compliance & Suitability'
};

// Assessment status mapping
export const assessmentStatusColors = {
  not_started: 'gray',
  in_progress: 'yellow',
  completed: 'green',
  overdue: 'red'
};

// ✅ NEW: Get all available assessments for a client
export const getAvailableAssessments = (
  completedAssessments: string[] = []
): AssessmentTypeConfig[] => {
  // Return all assessments since there are no prerequisites
  return Object.values(assessmentTypes).sort((a, b) => 
    (a.order || 99) - (b.order || 99)
  );
};

// ✅ NEW: Check if any assessment is complete
export const hasAnyAssessmentComplete = (
  completedAssessments: string[]
): boolean => {
  return completedAssessments.length > 0;
};
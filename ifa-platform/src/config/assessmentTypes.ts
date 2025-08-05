// src/config/assessmentTypes.ts
// ================================================================
// ASSESSMENT TYPES CONFIGURATION
// ================================================================

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
  prerequisites?: string[];
  scoringType?: 'numeric' | 'category' | 'percentage';
  color: string;
  shortName: string;
}

export const assessmentTypes: Record<string, AssessmentTypeConfig> = {
  atr: {
    id: 'atr',
    name: 'Attitude to Risk',
    shortName: 'ATR',
    description: 'Measures psychological comfort with investment volatility',
    icon: Shield,
    route: '/assessments/atr',
    required: true,
    category: 'risk',
    estimatedTime: '10-15 minutes',
    scoringType: 'numeric',
    color: 'blue'
  },
  cfl: {
    id: 'cfl',
    name: 'Capacity for Loss',
    shortName: 'CFL',
    description: 'Evaluates financial ability to absorb investment losses',
    icon: TrendingUp,
    route: '/assessments/cfl',
    required: true,
    category: 'risk',
    estimatedTime: '5-10 minutes',
    scoringType: 'numeric',
    color: 'green'
  },
  persona: {
    id: 'persona',
    name: 'Investor Persona',
    shortName: 'Persona',
    description: 'Behavioral profiling for personalized advice delivery',
    icon: User,
    route: '/assessments/persona-assessment',
    required: true,
    category: 'compliance',
    estimatedTime: '5 minutes',
    scoringType: 'category',
    color: 'purple'
  },
  suitability: {
    id: 'suitability',
    name: 'Full Suitability',
    shortName: 'Suitability',
    description: 'Comprehensive suitability assessment',
    icon: FileText,
    route: '/assessments/suitability',
    required: true,
    category: 'compliance',
    estimatedTime: '30-45 minutes',
    prerequisites: ['atr', 'cfl'],
    scoringType: 'percentage',
    color: 'orange'
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
    scoringType: 'percentage',
    color: 'indigo'
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
    scoringType: 'numeric',
    color: 'teal'
  }
};

// Get required assessments
export const requiredAssessments = Object.values(assessmentTypes).filter(a => a.required);

// Get optional assessments
export const optionalAssessments = Object.values(assessmentTypes).filter(a => !a.required);

// Get assessment by ID
export const getAssessmentType = (id: string): AssessmentTypeConfig | undefined => {
  return assessmentTypes[id];
};

// Check if all prerequisites are met
export const checkPrerequisites = (
  assessmentId: string, 
  completedAssessments: string[]
): { met: boolean; missing: string[] } => {
  const assessment = assessmentTypes[assessmentId];
  if (!assessment || !assessment.prerequisites) {
    return { met: true, missing: [] };
  }
  
  const missing = assessment.prerequisites.filter(
    prereq => !completedAssessments.includes(prereq)
  );
  
  return {
    met: missing.length === 0,
    missing
  };
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

// Calculate overall completion percentage
export const calculateOverallProgress = (
  completedAssessments: string[],
  includeOptional: boolean = false
): number => {
  const assessmentsToCheck = includeOptional 
    ? Object.keys(assessmentTypes)
    : requiredAssessments.map(a => a.id);
    
  const completed = assessmentsToCheck.filter(id => 
    completedAssessments.includes(id)
  ).length;
  
  return Math.round((completed / assessmentsToCheck.length) * 100);
};

// Get next recommended assessment
export const getNextAssessment = (
  completedAssessments: string[]
): AssessmentTypeConfig | null => {
  // First check required assessments
  for (const assessment of requiredAssessments) {
    if (!completedAssessments.includes(assessment.id)) {
      // Check prerequisites
      const prereqCheck = checkPrerequisites(assessment.id, completedAssessments);
      if (prereqCheck.met) {
        return assessment;
      }
    }
  }
  
  // Then check optional assessments
  for (const assessment of optionalAssessments) {
    if (!completedAssessments.includes(assessment.id)) {
      const prereqCheck = checkPrerequisites(assessment.id, completedAssessments);
      if (prereqCheck.met) {
        return assessment;
      }
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
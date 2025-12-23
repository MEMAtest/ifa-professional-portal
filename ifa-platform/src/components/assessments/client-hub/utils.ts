import { assessmentTypes } from './assessmentTypes'

export const getAssessmentColorClasses = (color: string) => {
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    blue: { bg: 'bg-blue-100', text: 'text-blue-600', border: 'border-blue-200' },
    green: { bg: 'bg-green-100', text: 'text-green-600', border: 'border-green-200' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-600', border: 'border-purple-200' },
    orange: { bg: 'bg-orange-100', text: 'text-orange-600', border: 'border-orange-200' },
    indigo: { bg: 'bg-indigo-100', text: 'text-indigo-600', border: 'border-indigo-200' },
    teal: { bg: 'bg-teal-100', text: 'text-teal-600', border: 'border-teal-200' }
  }
  return colorMap[color] || colorMap.blue
}

export const calculateOverallProgress = (completedAssessments: string[]): number => {
  const totalAssessments = Object.keys(assessmentTypes).length
  return totalAssessments > 0 ? Math.round((completedAssessments.length / totalAssessments) * 100) : 0
}

export const getNextAssessment = (completedAssessments: string[]) => {
  const allAssessments = Object.values(assessmentTypes).sort((a, b) => a.order - b.order)
  for (const assessment of allAssessments) {
    if (!completedAssessments.includes(assessment.id)) {
      return assessment
    }
  }
  return null
}


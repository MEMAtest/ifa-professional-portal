// src/lib/pdf/ChartRenderer.ts
// Server-side chart rendering using QuickChart.io API
// Generates PNG data URLs for embedding in PDF reports

// Color palette matching the app theme
const COLORS = {
  primary: '#3b82f6',    // Blue
  success: '#22c55e',    // Green
  warning: '#f59e0b',    // Amber
  danger: '#ef4444',     // Red
  purple: '#8b5cf6',     // Purple
  gray: '#6b7280',       // Gray

  // Risk levels
  conservative: '#22c55e',
  balanced: '#3b82f6',
  growth: '#f59e0b',
  aggressive: '#ef4444',
}

/**
 * Generate chart using QuickChart.io API
 */
async function generateQuickChart(config: object): Promise<string> {
  const chartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(config))}&w=500&h=300&bkg=white&f=png`

  try {
    const response = await fetch(chartUrl)
    if (!response.ok) {
      throw new Error(`QuickChart API error: ${response.status}`)
    }
    const buffer = await response.arrayBuffer()
    const base64 = Buffer.from(buffer).toString('base64')
    return `data:image/png;base64,${base64}`
  } catch (error) {
    console.error('QuickChart generation failed:', error)
    throw error
  }
}

/**
 * Generate Risk Distribution Doughnut Chart
 */
export async function generateRiskDistributionChart(data: {
  conservative?: number
  balanced?: number
  growth?: number
  aggressive?: number
}): Promise<string> {
  const config = {
    type: 'doughnut',
    data: {
      labels: ['Conservative', 'Balanced', 'Growth', 'Aggressive'],
      datasets: [{
        data: [
          data.conservative || 0,
          data.balanced || 0,
          data.growth || 0,
          data.aggressive || 0
        ],
        backgroundColor: [
          COLORS.conservative,
          COLORS.balanced,
          COLORS.growth,
          COLORS.aggressive
        ],
        borderWidth: 2,
        borderColor: '#ffffff'
      }]
    },
    options: {
      plugins: {
        title: {
          display: true,
          text: 'Risk Distribution',
          font: { size: 16, weight: 'bold' }
        },
        legend: {
          position: 'bottom'
        }
      }
    }
  }

  return generateQuickChart(config)
}

/**
 * Generate ATR Score Gauge Chart
 */
export async function generateATRGaugeChart(score: number, maxScore: number = 10): Promise<string> {
  const percentage = Math.min(100, Math.round((score / maxScore) * 100))

  let color = COLORS.balanced
  if (score <= 3) color = COLORS.conservative
  else if (score <= 5) color = COLORS.balanced
  else if (score <= 7) color = COLORS.growth
  else color = COLORS.aggressive

  const config = {
    type: 'doughnut',
    data: {
      labels: ['Score', 'Remaining'],
      datasets: [{
        data: [percentage, 100 - percentage],
        backgroundColor: [color, '#e5e7eb'],
        borderWidth: 0
      }]
    },
    options: {
      circumference: 180,
      rotation: -90,
      cutout: '70%',
      plugins: {
        title: {
          display: true,
          text: `Attitude to Risk: ${score}/${maxScore}`,
          font: { size: 16, weight: 'bold' }
        },
        legend: {
          display: false
        },
        datalabels: {
          display: true,
          formatter: () => `${score}`,
          font: { size: 32, weight: 'bold' },
          color: color
        }
      }
    }
  }

  return generateQuickChart(config)
}

/**
 * Generate Capacity for Loss Bar Chart
 */
export async function generateCapacityChart(data: {
  capacityScore?: number
  capacityLevel?: string
  maxLossPercentage?: number
}): Promise<string> {
  let score = data.capacityScore || 50
  if (data.capacityLevel) {
    const level = data.capacityLevel.toLowerCase()
    if (level.includes('low') || level.includes('limited')) score = 25
    else if (level.includes('medium') || level.includes('moderate')) score = 50
    else if (level.includes('high') || level.includes('significant')) score = 75
  }

  const maxLoss = data.maxLossPercentage || Math.round(score * 0.5)

  const config = {
    type: 'bar',
    data: {
      labels: ['Capacity Score', 'Max Acceptable Loss'],
      datasets: [{
        data: [score, maxLoss],
        backgroundColor: [COLORS.primary, COLORS.warning],
        borderRadius: 6
      }]
    },
    options: {
      indexAxis: 'y',
      scales: {
        x: {
          beginAtZero: true,
          max: 100,
          ticks: {
            callback: (value: number) => `${value}%`
          }
        }
      },
      plugins: {
        title: {
          display: true,
          text: 'Capacity for Loss Assessment',
          font: { size: 16, weight: 'bold' }
        },
        legend: {
          display: false
        }
      }
    }
  }

  return generateQuickChart(config)
}

/**
 * Generate Assessment Progress Chart
 */
export async function generateProgressChart(percentage: number): Promise<string> {
  const completed = Math.min(100, Math.max(0, percentage))
  const remaining = 100 - completed

  let color = COLORS.danger
  if (completed >= 80) color = COLORS.success
  else if (completed >= 50) color = COLORS.warning

  const config = {
    type: 'doughnut',
    data: {
      labels: ['Completed', 'Remaining'],
      datasets: [{
        data: [completed, remaining],
        backgroundColor: [color, '#e5e7eb'],
        borderWidth: 0
      }]
    },
    options: {
      cutout: '65%',
      plugins: {
        title: {
          display: true,
          text: 'Assessment Completion',
          font: { size: 16, weight: 'bold' }
        },
        legend: {
          display: false
        },
        datalabels: {
          display: true,
          formatter: () => `${completed}%`,
          font: { size: 28, weight: 'bold' },
          color: color
        }
      }
    }
  }

  return generateQuickChart(config)
}

/**
 * Generate Category Scores Radar Chart
 */
export async function generateCategoryRadarChart(categoryScores: Record<string, number>): Promise<string> {
  const labels = Object.keys(categoryScores).map(key =>
    key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  )
  const data = Object.values(categoryScores)

  const config = {
    type: 'radar',
    data: {
      labels,
      datasets: [{
        label: 'Score',
        data,
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderColor: COLORS.primary,
        borderWidth: 2,
        pointBackgroundColor: COLORS.primary,
        pointRadius: 4
      }]
    },
    options: {
      scales: {
        r: {
          beginAtZero: true,
          max: 100,
          ticks: {
            stepSize: 20
          }
        }
      },
      plugins: {
        title: {
          display: true,
          text: 'Assessment Category Scores',
          font: { size: 16, weight: 'bold' }
        },
        legend: {
          display: false
        }
      }
    }
  }

  return generateQuickChart(config)
}

/**
 * Generate Risk Alignment Comparison Chart
 */
export async function generateRiskAlignmentChart(data: {
  attitudeToRisk: number
  capacityForLoss: number
  knowledgeExperience?: number
}): Promise<string> {
  const config = {
    type: 'bar',
    data: {
      labels: ['Attitude to Risk', 'Capacity for Loss', 'Knowledge & Experience'],
      datasets: [{
        data: [
          data.attitudeToRisk * 10,
          data.capacityForLoss,
          data.knowledgeExperience || 0
        ],
        backgroundColor: [COLORS.primary, COLORS.success, COLORS.purple],
        borderRadius: 6
      }]
    },
    options: {
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: {
            callback: (value: number) => `${value}%`
          }
        }
      },
      plugins: {
        title: {
          display: true,
          text: 'Risk Profile Alignment',
          font: { size: 16, weight: 'bold' }
        },
        legend: {
          display: false
        }
      }
    }
  }

  return generateQuickChart(config)
}

/**
 * Main function to generate all charts for an assessment
 */
export async function generateAssessmentCharts(assessment: {
  total_score?: number
  risk_level?: number
  risk_category?: string
  risk_distribution?: {
    conservative?: number
    balanced?: number
    growth?: number
    aggressive?: number
  }
  capacity_score?: number
  capacity_level?: string
  capacity_for_loss?: number
  max_loss_percentage?: number
  completion_percentage?: number
  category_scores?: Record<string, number>
  attitude_to_risk?: number
  knowledge_experience?: number
}): Promise<{
  riskChart?: string
  capacityChart?: string
  progressChart?: string
  categoryChart?: string
  alignmentChart?: string
}> {
  const charts: {
    riskChart?: string
    capacityChart?: string
    progressChart?: string
    categoryChart?: string
    alignmentChart?: string
  } = {}

  try {
    // Generate charts in parallel for speed
    const promises: Promise<void>[] = []

    // Risk Distribution Chart
    if (assessment.risk_distribution) {
      promises.push(
        generateRiskDistributionChart(assessment.risk_distribution)
          .then(chart => { charts.riskChart = chart })
          .catch(err => console.warn('Risk chart failed:', err))
      )
    } else if (assessment.risk_level !== undefined) {
      promises.push(
        generateATRGaugeChart(assessment.risk_level, 10)
          .then(chart => { charts.riskChart = chart })
          .catch(err => console.warn('ATR gauge failed:', err))
      )
    }

    // Capacity for Loss Chart
    if (assessment.capacity_score !== undefined || assessment.capacity_level) {
      promises.push(
        generateCapacityChart({
          capacityScore: assessment.capacity_score,
          capacityLevel: assessment.capacity_level,
          maxLossPercentage: assessment.max_loss_percentage
        })
          .then(chart => { charts.capacityChart = chart })
          .catch(err => console.warn('Capacity chart failed:', err))
      )
    }

    // Progress Chart
    if (assessment.completion_percentage !== undefined) {
      promises.push(
        generateProgressChart(assessment.completion_percentage)
          .then(chart => { charts.progressChart = chart })
          .catch(err => console.warn('Progress chart failed:', err))
      )
    }

    // Category Scores Radar Chart
    if (assessment.category_scores && Object.keys(assessment.category_scores).length > 0) {
      promises.push(
        generateCategoryRadarChart(assessment.category_scores)
          .then(chart => { charts.categoryChart = chart })
          .catch(err => console.warn('Category chart failed:', err))
      )
    }

    // Risk Alignment Chart
    if (assessment.attitude_to_risk !== undefined || assessment.risk_level !== undefined) {
      const atr = assessment.attitude_to_risk || assessment.risk_level || 5
      const cfl = assessment.capacity_for_loss || assessment.capacity_score || 50
      promises.push(
        generateRiskAlignmentChart({
          attitudeToRisk: atr,
          capacityForLoss: cfl,
          knowledgeExperience: assessment.knowledge_experience
        })
          .then(chart => { charts.alignmentChart = chart })
          .catch(err => console.warn('Alignment chart failed:', err))
      )
    }

    await Promise.all(promises)
    return charts
  } catch (error) {
    console.error('Error generating assessment charts:', error)
    return charts
  }
}

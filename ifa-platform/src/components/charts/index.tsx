// src/components/charts/index.tsx
// ================================================================
// CHART.JS COMPONENTS FOR FINANCIAL VISUALIZATIONS
// ================================================================

import React from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  RadialLinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
  TooltipItem
} from 'chart.js'
import { Line, Pie, Doughnut, Radar, Bar } from 'react-chartjs-2'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Download, Maximize2, Loader2 } from 'lucide-react'
import { ChartData as ChartDataType } from '@/types/assessment'

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  RadialLinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

// ================================================================
// BASE CHART WRAPPER COMPONENT
// ================================================================

interface BaseChartProps {
  data: ChartDataType
  height?: number
  loading?: boolean
  onExport?: () => void
  onFullscreen?: () => void
  className?: string
}

const BaseChart: React.FC<BaseChartProps & { children: React.ReactNode }> = ({
  data,
  height = 300,
  loading = false,
  onExport,
  onFullscreen,
  className = '',
  children
}) => {
  return (
    <Card className={className}>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg font-semibold">{data.title}</CardTitle>
            {data.description && (
              <p className="text-sm text-gray-600 mt-1">{data.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {onFullscreen && (
              <Button size="sm" variant="outline" onClick={onFullscreen}>
                <Maximize2 className="h-4 w-4" />
              </Button>
            )}
            {onExport && (
              <Button size="sm" variant="outline" onClick={onExport}>
                <Download className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div style={{ height: `${height}px`, position: 'relative' }}>
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
            children
          )}
        </div>
      </CardContent>
    </Card>
  )
}

// ================================================================
// FINANCIAL PIE/DOUGHNUT CHART
// ================================================================

export const FinancialBreakdownChart: React.FC<BaseChartProps> = (props) => {
  const chartRef = React.useRef<any>(null)

  const handleExport = () => {
    if (chartRef.current) {
      const url = chartRef.current.toBase64Image()
      const link = document.createElement('a')
      link.download = `${props.data.title.replace(/\s+/g, '_')}.png`
      link.href = url
      link.click()
    }
  }

  const options: ChartOptions<'pie' | 'doughnut'> = {
    ...props.data.options,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      ...props.data.options?.plugins,
      tooltip: {
        ...props.data.options?.plugins?.tooltip,
        callbacks: {
          label: (context: TooltipItem<'pie' | 'doughnut'>) => {
            const label = context.label || ''
            const value = context.parsed || 0
            const dataset = context.dataset.data as number[]
            const total = dataset.reduce((a, b) => a + b, 0)
            const percentage = ((value / total) * 100).toFixed(1)
            return `${label}: £${value.toLocaleString()} (${percentage}%)`
          }
        }
      }
    }
  }

  const ChartComponent = props.data.type === 'doughnut' ? Doughnut : Pie

  return (
    <BaseChart {...props} onExport={handleExport}>
      <ChartComponent 
        ref={chartRef}
        data={props.data.data} 
        options={options} 
      />
    </BaseChart>
  )
}

// ================================================================
// RISK PROFILE RADAR CHART
// ================================================================

export const RiskProfileChart: React.FC<BaseChartProps> = (props) => {
  const chartRef = React.useRef<any>(null)

  const handleExport = () => {
    if (chartRef.current) {
      const url = chartRef.current.toBase64Image()
      const link = document.createElement('a')
      link.download = 'risk_profile.png'
      link.href = url
      link.click()
    }
  }

  const options: ChartOptions<'radar'> = {
    ...props.data.options,
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      r: {
        beginAtZero: true,
        max: 100,
        ticks: {
          stepSize: 25,
          callback: (value) => `${value}%`
        },
        pointLabels: {
          font: {
            size: 12
          }
        }
      }
    },
    plugins: {
      ...props.data.options?.plugins,
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 20,
          usePointStyle: true
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            return `${context.dataset.label}: ${context.parsed.r}%`
          }
        }
      }
    }
  }

  return (
    <BaseChart {...props} onExport={handleExport}>
      <Radar 
        ref={chartRef}
        data={props.data.data} 
        options={options} 
      />
    </BaseChart>
  )
}

// ================================================================
// INVESTMENT PROJECTION LINE CHART
// ================================================================

export const ProjectionChart: React.FC<BaseChartProps> = (props) => {
  const chartRef = React.useRef<any>(null)

  const handleExport = () => {
    if (chartRef.current) {
      const url = chartRef.current.toBase64Image()
      const link = document.createElement('a')
      link.download = 'investment_projection.png'
      link.href = url
      link.click()
    }
  }

  const options: ChartOptions<'line'> = {
    ...props.data.options,
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false
    },
    scales: {
      x: {
        grid: {
          display: false
        }
      },
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => `£${(Number(value) / 1000).toFixed(0)}k`
        },
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      }
    },
    plugins: {
      ...props.data.options?.plugins,
      legend: {
        position: 'top' as const,
        labels: {
          usePointStyle: true,
          padding: 20
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        callbacks: {
          label: (context) => {
            const value = context.parsed.y ?? 0
            return `${context.dataset.label}: £${value.toLocaleString()}`
          }
        }
      }
    }
  }

  return (
    <BaseChart {...props} onExport={handleExport}>
      <Line 
        ref={chartRef}
        data={props.data.data} 
        options={options} 
      />
    </BaseChart>
  )
}

// ================================================================
// ASSET ALLOCATION DOUGHNUT CHART
// ================================================================

export const AllocationChart: React.FC<BaseChartProps> = (props) => {
  const chartRef = React.useRef<any>(null)

  const handleExport = () => {
    if (chartRef.current) {
      const url = chartRef.current.toBase64Image()
      const link = document.createElement('a')
      link.download = 'asset_allocation.png'
      link.href = url
      link.click()
    }
  }

  const options: ChartOptions<'doughnut'> = {
    ...props.data.options,
    responsive: true,
    maintainAspectRatio: false,
    cutout: '60%', // Makes the center hole larger
    plugins: {
      ...props.data.options?.plugins,
      legend: {
        position: 'bottom' as const,
        labels: {
          padding: 20,
          usePointStyle: true,
          font: {
            size: 14
          }
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            return `${context.label}: ${context.parsed}%`
          }
        }
      }
    }
  }

  // Add center text for total
  const plugins = [{
    id: 'centerText',
    beforeDraw: (chart: any) => {
      const { width, height, ctx } = chart
      ctx.restore()
      const fontSize = (height / 160).toFixed(2)
      ctx.font = `${fontSize}em sans-serif`
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#374151'
      const text = '100%'
      const textX = Math.round((width - ctx.measureText(text).width) / 2)
      const textY = height / 2
      ctx.fillText(text, textX, textY)
      ctx.save()
    }
  }]

  return (
    <BaseChart {...props} onExport={handleExport}>
      <Doughnut 
        ref={chartRef}
        data={props.data.data} 
        options={options}
        plugins={plugins}
      />
    </BaseChart>
  )
}

// ================================================================
// COMPARISON BAR CHART
// ================================================================

export const ComparisonChart: React.FC<BaseChartProps> = (props) => {
  const chartRef = React.useRef<any>(null)

  const handleExport = () => {
    if (chartRef.current) {
      const url = chartRef.current.toBase64Image()
      const link = document.createElement('a')
      link.download = 'comparison.png'
      link.href = url
      link.click()
    }
  }

  const options: ChartOptions<'bar'> = {
    ...props.data.options,
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y' as const, // Horizontal bars
    scales: {
      x: {
        beginAtZero: true,
        ticks: {
          callback: (value) => `£${Number(value).toLocaleString()}`
        }
      },
      y: {
        grid: {
          display: false
        }
      }
    },
    plugins: {
      ...props.data.options?.plugins,
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.parsed.x ?? 0
            return `£${value.toLocaleString()}`
          }
        }
      }
    }
  }

  return (
    <BaseChart {...props} onExport={handleExport}>
      <Bar 
        ref={chartRef}
        data={props.data.data} 
        options={options} 
      />
    </BaseChart>
  )
}

// ================================================================
// GAUGE CHART (CUSTOM IMPLEMENTATION)
// ================================================================

export const GaugeChart: React.FC<BaseChartProps & { value: number; max?: number }> = (props) => {
  const { value, max = 100 } = props
  const percentage = (value / max) * 100

  // Create data for a half doughnut that looks like a gauge
  const gaugeData = {
    datasets: [{
      data: [percentage, 100 - percentage],
      backgroundColor: [
        percentage > 75 ? '#10B981' : percentage > 50 ? '#F59E0B' : '#EF4444',
        '#E5E7EB'
      ],
      borderWidth: 0
    }]
  }

  const options: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    rotation: -90,
    circumference: 180,
    cutout: '75%',
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        enabled: false
      }
    }
  }

  const plugins = [{
    id: 'gaugeText',
    beforeDraw: (chart: any) => {
      const { width, height, ctx } = chart
      ctx.restore()
      
      // Value text
      const fontSize = (height / 100).toFixed(2)
      ctx.font = `bold ${fontSize}em sans-serif`
      ctx.textBaseline = 'middle'
      ctx.fillStyle = '#111827'
      const text = `${value}`
      const textX = Math.round((width - ctx.measureText(text).width) / 2)
      const textY = height / 1.4
      ctx.fillText(text, textX, textY)
      
      // Label text
      ctx.font = `${Number(fontSize) * 0.5}em sans-serif`
      ctx.fillStyle = '#6B7280'
      const label = props.data.title
      const labelX = Math.round((width - ctx.measureText(label).width) / 2)
      const labelY = height / 1.2
      ctx.fillText(label, labelX, labelY)
      
      ctx.save()
    }
  }]

  return (
    <BaseChart {...props} height={200}>
      <Doughnut 
        data={gaugeData} 
        options={options}
        plugins={plugins}
      />
    </BaseChart>
  )
}

// ================================================================
// CHART CONTAINER FOR SECTIONS
// ================================================================

interface SectionChartsProps {
  sectionId: string
  chartData?: ChartDataType
  loading?: boolean
}

export const SectionCharts: React.FC<SectionChartsProps> = ({ 
  sectionId, 
  chartData, 
  loading = false 
}) => {
  if (!chartData) return null

  const renderChart = () => {
    switch (chartData.type) {
      case 'pie':
      case 'doughnut':
        if (sectionId === 'financial_situation') {
          return <FinancialBreakdownChart data={chartData} loading={loading} />
        } else if (sectionId === 'recommendation') {
          return <AllocationChart data={chartData} loading={loading} />
        }
        return <FinancialBreakdownChart data={chartData} loading={loading} />
      
      case 'radar':
        return <RiskProfileChart data={chartData} loading={loading} />
      
      case 'line':
        return <ProjectionChart data={chartData} loading={loading} />
      
      case 'bar':
        return <ComparisonChart data={chartData} loading={loading} />
      
      case 'gauge':
        // For gauge charts, we'd need to extract the value from the data
        const gaugeValue = chartData.data?.datasets?.[0]?.data?.[0] || 0
        return <GaugeChart data={chartData} value={gaugeValue} loading={loading} />
      
      default:
        return null
    }
  }

  return (
    <div className="mt-6">
      {renderChart()}
    </div>
  )
}

// ================================================================
// EXPORT ALL COMPONENTS
// ================================================================

const Charts = {
  FinancialBreakdownChart,
  RiskProfileChart,
  ProjectionChart,
  AllocationChart,
  ComparisonChart,
  GaugeChart,
  SectionCharts
}

export default Charts

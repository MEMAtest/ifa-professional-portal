// src/components/charts/ChartDemo.tsx
// ================================================================
// CHART DEMO COMPONENT - Test all chart types
// ================================================================

import React from 'react'
import { 
  FinancialBreakdownChart, 
  RiskProfileChart, 
  ProjectionChart, 
  AllocationChart,
  ComparisonChart,
  GaugeChart
} from '@/components/charts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { ChartData } from '@/types/assessment'

const ChartDemo: React.FC = () => {
  // Sample data for each chart type
  const financialData: ChartData = {
    type: 'pie',
    title: 'Net Worth Breakdown',
    description: 'Visual representation of your current financial position',
    data: {
      labels: ['Liquid Assets', 'Property Equity', 'Investments', 'Liabilities'],
      datasets: [{
        data: [75000, 250000, 125000, 50000],
        backgroundColor: ['#10B981', '#3B82F6', '#8B5CF6', '#EF4444'],
        borderWidth: 2,
        borderColor: '#fff'
      }]
    }
  }

  const riskData: ChartData = {
    type: 'radar',
    title: 'Risk Profile Analysis',
    description: 'Multi-dimensional view of your risk characteristics',
    data: {
      labels: ['Risk Tolerance', 'Risk Capacity', 'Investment Knowledge', 'Time Horizon', 'Loss Acceptance'],
      datasets: [{
        label: 'Your Profile',
        data: [65, 75, 55, 80, 60],
        backgroundColor: 'rgba(59, 130, 246, 0.2)',
        borderColor: 'rgb(59, 130, 246)',
        pointBackgroundColor: 'rgb(59, 130, 246)',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: 'rgb(59, 130, 246)'
      }, {
        label: 'Balanced Profile',
        data: [50, 50, 50, 50, 50],
        backgroundColor: 'rgba(156, 163, 175, 0.1)',
        borderColor: 'rgb(156, 163, 175)',
        borderDash: [5, 5],
        pointRadius: 0
      }]
    }
  }

  const projectionData: ChartData = {
    type: 'line',
    title: 'Investment Growth Projection',
    description: 'Projected portfolio value over your investment timeline',
    data: {
      labels: ['Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5', 'Year 6', 'Year 7', 'Year 8', 'Year 9', 'Year 10'],
      datasets: [{
        label: 'Conservative (3% p.a.)',
        data: [103000, 106090, 109273, 112551, 115928, 119405, 122987, 126677, 130477, 134392],
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4
      }, {
        label: 'Moderate (5% p.a.)',
        data: [105000, 110250, 115763, 121551, 127628, 134010, 140710, 147746, 155133, 162889],
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4
      }, {
        label: 'Growth (7% p.a.)',
        data: [107000, 114490, 122504, 131080, 140255, 150073, 160578, 171819, 183846, 196715],
        borderColor: 'rgb(245, 158, 11)',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        tension: 0.4
      }]
    }
  }

  const allocationData: ChartData = {
    type: 'doughnut',
    title: 'Recommended Asset Allocation',
    description: 'Strategic allocation based on your risk profile',
    data: {
      labels: ['UK Equities', 'International Equities', 'Bonds', 'Property', 'Alternatives'],
      datasets: [{
        data: [25, 35, 25, 10, 5],
        backgroundColor: ['#3B82F6', '#6366F1', '#10B981', '#F59E0B', '#EF4444'],
        borderWidth: 2,
        borderColor: '#fff'
      }]
    }
  }

  const comparisonData: ChartData = {
    type: 'bar',
    title: 'Income vs Expenses',
    description: 'Monthly financial flow comparison',
    data: {
      labels: ['Income', 'Housing', 'Transport', 'Food', 'Utilities', 'Savings'],
      datasets: [{
        data: [5000, -1500, -400, -600, -300, -1200],
        backgroundColor: (context: any) => {
          return context.raw >= 0 ? '#10B981' : '#EF4444'
        }
      }]
    }
  }

  const gaugeData: ChartData = {
    type: 'gauge',
    title: 'Portfolio Health Score',
    description: 'Overall assessment of your investment portfolio',
    data: {
      datasets: [{
        data: [78, 22],
        backgroundColor: ['#10B981', '#E5E7EB']
      }]
    }
  }

  return (
    <div className="space-y-8 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Chart.js Component Demo</CardTitle>
          <p className="text-sm text-gray-600">
            Interactive financial charts with export functionality
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-8">
            {/* Financial Breakdown */}
            <div>
              <h3 className="text-lg font-semibold mb-4">1. Financial Breakdown (Pie Chart)</h3>
              <FinancialBreakdownChart data={financialData} />
            </div>

            {/* Risk Profile */}
            <div>
              <h3 className="text-lg font-semibold mb-4">2. Risk Profile (Radar Chart)</h3>
              <RiskProfileChart data={riskData} />
            </div>

            {/* Investment Projection */}
            <div>
              <h3 className="text-lg font-semibold mb-4">3. Investment Projection (Line Chart)</h3>
              <ProjectionChart data={projectionData} />
            </div>

            {/* Asset Allocation */}
            <div>
              <h3 className="text-lg font-semibold mb-4">4. Asset Allocation (Doughnut Chart)</h3>
              <AllocationChart data={allocationData} />
            </div>

            {/* Comparison */}
            <div>
              <h3 className="text-lg font-semibold mb-4">5. Income vs Expenses (Bar Chart)</h3>
              <ComparisonChart data={comparisonData} />
            </div>

            {/* Gauge */}
            <div>
              <h3 className="text-lg font-semibold mb-4">6. Portfolio Health (Gauge Chart)</h3>
              <GaugeChart data={gaugeData} value={78} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Usage Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Integration Instructions</CardTitle>
        </CardHeader>
        <CardContent className="prose prose-sm max-w-none">
          <h4>1. Install Dependencies</h4>
          <pre className="bg-gray-100 p-3 rounded">
            npm install chart.js react-chartjs-2
          </pre>

          <h4>2. Import Components</h4>
          <pre className="bg-gray-100 p-3 rounded">
{`import { 
  FinancialBreakdownChart, 
  RiskProfileChart, 
  ProjectionChart, 
  AllocationChart 
} from '@/components/charts'`}
          </pre>

          <h4>3. Use in Your Components</h4>
          <pre className="bg-gray-100 p-3 rounded">
{`<FinancialBreakdownChart 
  data={chartData}
  loading={isLoading}
/>`}
          </pre>

          <h4>Features</h4>
          <ul>
            <li>✅ Responsive design</li>
            <li>✅ Export to PNG</li>
            <li>✅ Interactive tooltips</li>
            <li>✅ Loading states</li>
            <li>✅ Customizable height</li>
            <li>✅ TypeScript support</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  )
}

export default ChartDemo

// Route: /charts-demo
// Add to your routes to test all charts
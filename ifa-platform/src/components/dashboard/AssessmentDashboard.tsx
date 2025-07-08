// src/components/dashboard/AssessmentDashboard.tsx - Analytics and reporting (FIXED)
'use client'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts'
import { 
  Users, AlertTriangle, TrendingUp, FileText, 
  Download, Filter, Search 
} from 'lucide-react'

// Mock Assessment type for standalone operation
interface Assessment {
  id: string;
  clientProfile: {
    firstName: string;
    lastName: string;
    clientRef: string;
  };
  riskProfile: {
    finalRiskProfile: number;
  };
  vulnerabilityAssessment: {
    hasVulnerabilities: boolean;
  };
  suitabilityAssessment: {
    suitabilityScore: number;
  };
  status: 'draft' | 'in_progress' | 'completed' | 'reviewed' | 'archived';
  adviceType: 'initial' | 'ongoing' | 'review' | 'pension_transfer' | 'protection';
  createdAt: string;
}

// Mock data for demonstration
const MOCK_ASSESSMENTS: Assessment[] = [
  {
    id: 'assessment_001',
    clientProfile: {
      firstName: 'Geoffrey',
      lastName: 'Clarkson',
      clientRef: 'C250626917'
    },
    riskProfile: {
      finalRiskProfile: 3
    },
    vulnerabilityAssessment: {
      hasVulnerabilities: false
    },
    suitabilityAssessment: {
      suitabilityScore: 85
    },
    status: 'completed',
    adviceType: 'review',
    createdAt: '2024-06-26T09:15:00Z'
  },
  {
    id: 'assessment_002',
    clientProfile: {
      firstName: 'Eddie',
      lastName: 'Sauna',
      clientRef: 'C250625166'
    },
    riskProfile: {
      finalRiskProfile: 5
    },
    vulnerabilityAssessment: {
      hasVulnerabilities: true
    },
    suitabilityAssessment: {
      suitabilityScore: 78
    },
    status: 'completed',
    adviceType: 'initial',
    createdAt: '2024-06-25T11:20:00Z'
  }
]

interface DashboardProps {
  assessments?: Assessment[]
}

export const AssessmentDashboard = ({ assessments = MOCK_ASSESSMENTS }: DashboardProps) => {
  const [filteredAssessments, setFilteredAssessments] = useState<Assessment[]>(assessments)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [vulnerabilityFilter, setVulnerabilityFilter] = useState<string>('all')

  useEffect(() => {
    let filtered = assessments

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(assessment => 
        `${assessment.clientProfile.firstName} ${assessment.clientProfile.lastName}`
          .toLowerCase().includes(searchTerm.toLowerCase()) ||
        assessment.clientProfile.clientRef.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(assessment => assessment.status === statusFilter)
    }

    // Vulnerability filter
    if (vulnerabilityFilter === 'vulnerable') {
      filtered = filtered.filter(assessment => assessment.vulnerabilityAssessment.hasVulnerabilities)
    } else if (vulnerabilityFilter === 'not_vulnerable') {
      filtered = filtered.filter(assessment => !assessment.vulnerabilityAssessment.hasVulnerabilities)
    }

    setFilteredAssessments(filtered)
  }, [assessments, searchTerm, statusFilter, vulnerabilityFilter])

  // Calculate summary statistics
  const totalAssessments = filteredAssessments.length
  const vulnerableClients = filteredAssessments.filter(a => a.vulnerabilityAssessment.hasVulnerabilities).length
  const averageRisk = filteredAssessments.reduce((sum, a) => sum + a.riskProfile.finalRiskProfile, 0) / totalAssessments || 0
  const averageSuitabilityScore = filteredAssessments.reduce((sum, a) => sum + a.suitabilityAssessment.suitabilityScore, 0) / totalAssessments || 0

  // Chart data preparation
  const riskDistribution = Array.from({ length: 7 }, (_, i) => ({
    risk: i + 1,
    count: filteredAssessments.filter(a => a.riskProfile.finalRiskProfile === i + 1).length
  }))

  const adviceTypeDistribution = [
    { name: 'Initial', value: filteredAssessments.filter(a => a.adviceType === 'initial').length },
    { name: 'Review', value: filteredAssessments.filter(a => a.adviceType === 'review').length },
    { name: 'Ongoing', value: filteredAssessments.filter(a => a.adviceType === 'ongoing').length },
    { name: 'Pension Transfer', value: filteredAssessments.filter(a => a.adviceType === 'pension_transfer').length }
  ].filter(item => item.value > 0)

  const suitabilityTrend = filteredAssessments
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((assessment, index) => ({
      index: index + 1,
      score: assessment.suitabilityAssessment.suitabilityScore,
      date: new Date(assessment.createdAt).toLocaleDateString()
    }))

  const COLORS = ['#4472C4', '#5B9BD5', '#84B5E3', '#A5C9E8', '#C9DDF2']

  const exportData = () => {
    const csvData = filteredAssessments.map(assessment => ({
      'Client Ref': assessment.clientProfile.clientRef,
      'Client Name': `${assessment.clientProfile.firstName} ${assessment.clientProfile.lastName}`,
      'Risk Profile': assessment.riskProfile.finalRiskProfile,
      'Suitability Score': assessment.suitabilityAssessment.suitabilityScore,
      'Vulnerable': assessment.vulnerabilityAssessment.hasVulnerabilities ? 'Yes' : 'No',
      'Status': assessment.status,
      'Advice Type': assessment.adviceType,
      'Created Date': new Date(assessment.createdAt).toLocaleDateString()
    }))
    
    const csv = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map(row => Object.values(row).join(','))
    ].join('\n')
    
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'assessment_data.csv'
    a.click()
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assessment Analytics</h1>
          <p className="text-gray-600 mt-1">Monitor assessment completion and client risk profiles</p>
        </div>
        <Button onClick={exportData} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Export Data
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search clients..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="reviewed">Reviewed</option>
            </select>
            
            <select
              value={vulnerabilityFilter}
              onChange={(e) => setVulnerabilityFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Clients</option>
              <option value="vulnerable">Vulnerable Only</option>
              <option value="not_vulnerable">Non-Vulnerable Only</option>
            </select>
            
            <Button variant="outline">
              <Filter className="h-4 w-4 mr-2" />
              Advanced Filters
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Users className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Total Assessments</p>
                <p className="text-2xl font-bold text-gray-900">{totalAssessments}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Vulnerable Clients</p>
                <p className="text-2xl font-bold text-gray-900">{vulnerableClients}</p>
                <p className="text-xs text-gray-500">
                  {totalAssessments > 0 ? Math.round((vulnerableClients / totalAssessments) * 100) : 0}% of total
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Average Risk Level</p>
                <p className="text-2xl font-bold text-gray-900">{averageRisk.toFixed(1)}</p>
                <p className="text-xs text-gray-500">Scale 1-7</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <FileText className="h-5 w-5 text-purple-600" />
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Suitability Score</p>
                <p className="text-2xl font-bold text-gray-900">{Math.round(averageSuitabilityScore)}</p>
                <p className="text-xs text-gray-500">Out of 100</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Risk Profile Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Risk Profile Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={riskDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="risk" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#4472C4" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Advice Type Distribution - FIXED: Handle percent undefined */}
        <Card>
          <CardHeader>
            <CardTitle>Advice Type Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={adviceTypeDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {adviceTypeDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Suitability Score Trend */}
      <Card>
        <CardHeader>
          <CardTitle>Suitability Score Trend</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={suitabilityTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="index" />
              <YAxis domain={[0, 100]} />
              <Tooltip 
                labelFormatter={(value) => `Assessment ${value}`}
                formatter={(value, name) => [`${value}%`, 'Suitability Score']}
              />
              <Line 
                type="monotone" 
                dataKey="score" 
                stroke="#4472C4" 
                strokeWidth={2}
                dot={{ fill: '#4472C4' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Assessment List */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Assessments</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Client</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Risk Level</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Suitability Score</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Status</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Vulnerable</th>
                  <th className="text-left py-3 px-4 font-medium text-gray-900">Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredAssessments.slice(0, 10).map((assessment) => (
                  <tr key={assessment.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div>
                        <p className="font-medium text-gray-900">
                          {assessment.clientProfile.firstName} {assessment.clientProfile.lastName}
                        </p>
                        <p className="text-xs text-gray-500">{assessment.clientProfile.clientRef}</p>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        Level {assessment.riskProfile.finalRiskProfile}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{assessment.suitabilityAssessment.suitabilityScore}%</span>
                        <div className="w-12 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-green-500 h-2 rounded-full" 
                            style={{ width: `${assessment.suitabilityAssessment.suitabilityScore}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        assessment.status === 'completed' ? 'bg-green-100 text-green-800' :
                        assessment.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {assessment.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {assessment.vulnerabilityAssessment.hasVulnerabilities ? (
                        <span className="inline-flex items-center text-amber-600">
                          <AlertTriangle className="h-4 w-4 mr-1" />
                          Yes
                        </span>
                      ) : (
                        <span className="text-gray-500">No</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-500">
                      {new Date(assessment.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
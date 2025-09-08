// src/app/api/documents/preview-assessment/route.ts
export const dynamic = 'force-dynamic'

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { assessmentType, assessmentId, clientId } = body

    // Fetch assessment data
    const assessmentTable = `${assessmentType}_assessments`
    const { data: assessment } = await supabase
      .from(assessmentTable)
      .select('*')
      .eq('id', assessmentId)
      .single()

    // Fetch client data
    const { data: client } = await supabase
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single()

    if (!assessment || !client) {
      return NextResponse.json({ error: 'Data not found' }, { status: 404 })
    }

    // Generate HTML preview
    const htmlContent = generateHTMLPreview(assessment, client, assessmentType)

    return NextResponse.json({
      success: true,
      htmlContent
    })

  } catch (error) {
    return NextResponse.json(
      { error: 'Preview generation failed' },
      { status: 500 }
    )
  }
}

function generateHTMLPreview(assessment: any, client: any, type: string): string {
  const clientName = `${client.personal_details?.title || ''} ${client.personal_details?.firstName || ''} ${client.personal_details?.lastName || ''}`.trim()
  const currentDate = new Date().toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

  return `
<!DOCTYPE html>
<html lang="en-GB">
<head>
  <meta charset="UTF-8">
  <title>${type.toUpperCase()} Assessment Report - ${clientName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
      line-height: 1.6;
      color: #333;
      background: #fff;
      padding: 40px;
      max-width: 210mm;
      margin: 0 auto;
    }
    
    .header {
      text-align: center;
      padding-bottom: 30px;
      border-bottom: 3px solid #002147;
      margin-bottom: 30px;
    }
    
    .header h1 {
      color: #002147;
      font-size: 28px;
      margin-bottom: 10px;
    }
    
    .header .subtitle {
      color: #666;
      font-size: 16px;
    }
    
    .info-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin: 30px 0;
      padding: 20px;
      background: #f8f9fa;
      border-radius: 8px;
    }
    
    .info-item {
      text-align: center;
    }
    
    .info-label {
      font-size: 12px;
      color: #666;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 5px;
    }
    
    .info-value {
      font-size: 16px;
      font-weight: 600;
      color: #002147;
    }
    
    .section {
      margin: 30px 0;
    }
    
    .section h2 {
      color: #002147;
      font-size: 20px;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 2px solid #e0e0e0;
    }
    
    .results-box {
      background: #f0f8ff;
      border: 2px solid #002147;
      border-radius: 8px;
      padding: 25px;
      margin: 20px 0;
      text-align: center;
    }
    
    .score-display {
      font-size: 48px;
      font-weight: bold;
      color: #002147;
      margin: 10px 0;
    }
    
    .risk-category {
      font-size: 24px;
      color: #666;
      margin-bottom: 10px;
    }
    
    .risk-bar {
      width: 100%;
      height: 30px;
      background: #e0e0e0;
      border-radius: 15px;
      overflow: hidden;
      margin: 20px 0;
      position: relative;
    }
    
    .risk-fill {
      height: 100%;
      background: linear-gradient(to right, #28a745, #ffc107, #dc3545);
      transition: width 0.3s ease;
    }
    
    .findings-list {
      list-style: none;
      padding: 0;
      margin: 20px 0;
    }
    
    .findings-list li {
      padding: 15px;
      margin-bottom: 10px;
      background: #f8f9fa;
      border-left: 4px solid #002147;
      border-radius: 4px;
    }
    
    .recommendations {
      background: #e8f5e9;
      border: 1px solid #4caf50;
      border-radius: 8px;
      padding: 20px;
      margin: 20px 0;
    }
    
    .recommendations h3 {
      color: #2e7d32;
      margin-bottom: 15px;
    }
    
    .recommendations ul {
      list-style: none;
      padding: 0;
    }
    
    .recommendations li {
      padding: 10px 0;
      border-bottom: 1px solid #c8e6c9;
    }
    
    .recommendations li:before {
      content: "✓ ";
      color: #4caf50;
      font-weight: bold;
      margin-right: 10px;
    }
    
    .footer {
      margin-top: 50px;
      padding-top: 30px;
      border-top: 2px solid #e0e0e0;
      text-align: center;
      font-size: 12px;
      color: #666;
    }
    
    @media print {
      body { padding: 0; }
      .section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>PROFESSIONAL FINANCIAL ADVISORY SERVICES</h1>
    <div class="subtitle">${getAssessmentTitle(type)}</div>
  </div>

  <div class="info-grid">
    <div class="info-item">
      <div class="info-label">Client</div>
      <div class="info-value">${clientName}</div>
    </div>
    <div class="info-item">
      <div class="info-label">Date</div>
      <div class="info-value">${currentDate}</div>
    </div>
    <div class="info-item">
      <div class="info-label">Reference</div>
      <div class="info-value">${client.client_ref || 'N/A'}</div>
    </div>
  </div>

  <section class="section">
    <h2>Assessment Results</h2>
    <div class="results-box">
      <div class="risk-category">${assessment.risk_category || 'Assessment Complete'}</div>
      <div class="score-display">${assessment.total_score || 0}/100</div>
      <div class="risk-bar">
        <div class="risk-fill" style="width: ${assessment.total_score || 0}%"></div>
      </div>
      <p>Risk Level: ${assessment.risk_level || 3}/5</p>
    </div>
  </section>

  <section class="section">
    <h2>Key Findings</h2>
    <ul class="findings-list">
      ${generateFindings(type, assessment)}
    </ul>
  </section>

  <section class="section">
    <div class="recommendations">
      <h3>Our Recommendations</h3>
      <ul>
        ${generateRecommendations(type, assessment)}
      </ul>
    </div>
  </section>

  <section class="section">
    <h2>Next Steps</h2>
    <p>We recommend scheduling a consultation to discuss these results in detail and develop a tailored financial strategy that aligns with your assessment outcomes.</p>
  </section>

  <div class="footer">
    <p><strong>Important:</strong> This assessment is based on the information provided and current market conditions.</p>
    <p>Regular reviews are recommended to ensure continued suitability.</p>
    <p>© ${new Date().getFullYear()} Professional Financial Advisory Services | FCA Registration: 123456</p>
  </div>
</body>
</html>
  `
}

function getAssessmentTitle(type: string): string {
  const titles: Record<string, string> = {
    'atr': 'Attitude to Risk Assessment Report',
    'cfl': 'Capacity for Loss Assessment Report',
    'vulnerability': 'Vulnerability Assessment Report',
    'suitability': 'Suitability Assessment Report'
  }
  return titles[type] || 'Assessment Report'
}

function generateFindings(type: string, assessment: any): string {
  const findings = getAssessmentFindings(type, assessment)
  return findings.map(finding => `<li>${finding}</li>`).join('')
}

function generateRecommendations(type: string, assessment: any): string {
  const recommendations = assessment.recommendations || getDefaultRecommendations(type)
  return recommendations.slice(0, 5).map((rec: string) => `<li>${rec}</li>`).join('')
}

function getAssessmentFindings(type: string, assessment: any): string[] {
  // Same logic from your jsPDF implementation
  if (type === 'atr') {
    return [
      `Your risk tolerance score is ${assessment.total_score || 0} out of 100`,
      `This places you in the "${assessment.risk_category || 'Moderate'}" risk category`,
      `Your risk level is ${assessment.risk_level || 3} on a scale of 1-5`
    ]
  }
  // Add other types...
  return ['Assessment completed successfully']
}

function getDefaultRecommendations(type: string): string[] {
  return [
    'Schedule a detailed consultation to discuss these results',
    'Review and update your assessment annually',
    'Consider how these results align with your financial objectives'
  ]
}
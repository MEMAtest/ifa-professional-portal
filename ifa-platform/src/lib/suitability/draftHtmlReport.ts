import type { SuitabilityFormData } from '@/types/suitability'

type Args = {
  formData: SuitabilityFormData
  completionScore: number
  clientRef: string
  reportDate?: Date
}

const escapeHtml = (value: unknown): string => {
  const text = String(value ?? '')
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

const formatDateLongGb = (date: Date): string =>
  date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

const renderField = (label: string, value: unknown) => {
  const rendered = value === null || value === undefined || value === '' ? 'Not provided' : String(value)
  return `<div class="field"><span class="field-label">${escapeHtml(label)}:</span> <span class="field-value">${escapeHtml(
    rendered
  )}</span></div>`
}

export function buildSuitabilityDraftHtml(args: Args): string {
  const reportDate = args.reportDate ?? new Date()
  const clientName = args.formData.personal_information?.client_name || 'Client'
  const badgeClass = args.completionScore >= 80 ? 'badge-complete' : 'badge-draft'

  const addressRaw = args.formData.contact_details?.address
  const address =
    typeof addressRaw === 'string'
      ? addressRaw
      : addressRaw && typeof addressRaw === 'object'
        ? JSON.stringify(addressRaw)
        : ''

  const investmentAmountRaw = (args.formData.objectives as any)?.investment_amount
  const investmentAmount =
    typeof investmentAmountRaw === 'number'
      ? `£${investmentAmountRaw.toLocaleString()}`
      : investmentAmountRaw
        ? `£${Number(investmentAmountRaw).toLocaleString()}`
        : ''

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Suitability Assessment - ${escapeHtml(clientName)}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; max-width: 900px; margin: 0 auto; padding: 40px; color: #1a1a1a; }
    h1 { color: #1e40af; border-bottom: 3px solid #1e40af; padding-bottom: 10px; }
    h2 { color: #1e3a8a; margin-top: 30px; border-bottom: 1px solid #ddd; padding-bottom: 8px; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; }
    .header-info { text-align: right; font-size: 14px; color: #666; }
    .section { background: #f8fafc; border-radius: 8px; padding: 20px; margin: 15px 0; }
    .field { margin: 10px 0; }
    .field-label { font-weight: 600; color: #4b5563; display: inline-block; min-width: 200px; }
    .field-value { color: #1a1a1a; }
    .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .badge-complete { background: #dcfce7; color: #166534; }
    .badge-draft { background: #fef3c7; color: #92400e; }
    .progress-bar { height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden; margin: 10px 0; }
    .progress-fill { height: 100%; background: #1e40af; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
    @media print { body { padding: 20px; } .section { break-inside: avoid; } }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <h1>Suitability Assessment Report</h1>
      <p style="font-size: 14px; color: #666;">Draft for Review</p>
    </div>
    <div class="header-info">
      <p><strong>Client:</strong> ${escapeHtml(clientName)}</p>
      <p><strong>Reference:</strong> ${escapeHtml(args.clientRef)}</p>
      <p><strong>Date:</strong> ${escapeHtml(formatDateLongGb(reportDate))}</p>
      <p><span class="badge ${badgeClass}">${escapeHtml(args.completionScore)}% Complete</span></p>
    </div>
  </div>

  <div class="progress-bar">
    <div class="progress-fill" style="width: ${escapeHtml(args.completionScore)}%"></div>
  </div>

  <h2>1. Personal Information</h2>
  <div class="section">
    ${renderField('Full Name', args.formData.personal_information?.client_name)}
    ${renderField('Date of Birth', args.formData.personal_information?.date_of_birth)}
    ${renderField('National Insurance', (args.formData.personal_information as any)?.national_insurance_number)}
    ${renderField('Marital Status', args.formData.personal_information?.marital_status)}
    ${renderField('Employment Status', args.formData.personal_information?.employment_status)}
    ${renderField('Occupation', (args.formData.personal_information as any)?.occupation)}
  </div>

  <h2>2. Contact Details</h2>
  <div class="section">
    ${renderField('Email', args.formData.contact_details?.email)}
    ${renderField('Phone', (args.formData.contact_details as any)?.phone_number ?? args.formData.contact_details?.phone)}
    ${renderField('Address', address)}
    ${renderField('Preferred Contact', args.formData.contact_details?.preferred_contact)}
    ${renderField('Best Contact Time', args.formData.contact_details?.best_contact_time)}
  </div>

  <h2>3. Financial Situation</h2>
  <div class="section">
    ${renderField('Annual Income', (args.formData.financial_situation as any)?.annual_income)}
    ${renderField('Monthly Expenses', (args.formData.financial_situation as any)?.monthly_expenses)}
    ${renderField('Savings', (args.formData.financial_situation as any)?.savings)}
    ${renderField('Emergency Fund', (args.formData.financial_situation as any)?.emergency_fund)}
    ${renderField('Monthly Surplus', (args.formData.financial_situation as any)?.monthly_surplus)}
    ${renderField('Net Worth', (args.formData.financial_situation as any)?.net_worth)}
  </div>

	  <h2>4. Objectives</h2>
	  <div class="section">
	    ${renderField('Primary Objective', (args.formData.objectives as any)?.primary_objective)}
	    ${renderField('Investment Amount', investmentAmount)}
	    ${renderField('Time Horizon', (args.formData.objectives as any)?.investment_timeline)}
	    ${renderField(
	      'Income Required From Investments',
	      (args.formData.objectives as any)?.requires_investment_income ?? (args.formData.objectives as any)?.income_requirement
	    )}
	    ${renderField(
	      'Required Monthly Income',
	      (args.formData.objectives as any)?.required_monthly_income ??
	        (typeof (args.formData.objectives as any)?.income_requirement === 'number'
	          ? (args.formData.objectives as any)?.income_requirement
	          : undefined)
	    )}
	  </div>

  <h2>5. Risk Assessment</h2>
  <div class="section">
    ${renderField('Attitude to Risk', (args.formData.risk_assessment as any)?.attitude_to_risk)}
    ${renderField('Capacity for Loss', (args.formData.risk_assessment as any)?.capacity_for_loss)}
    ${renderField('Risk Score', (args.formData.risk_assessment as any)?.risk_score)}
  </div>

  <h2>6. Knowledge &amp; Experience</h2>
  <div class="section">
    ${renderField('Investment Experience', (args.formData.knowledge_experience as any)?.investment_experience)}
    ${renderField('Previous Investments', (args.formData.knowledge_experience as any)?.previous_investments)}
    ${renderField('Financial Qualifications', (args.formData.knowledge_experience as any)?.financial_qualifications)}
  </div>

  <h2>7. Existing Arrangements</h2>
  <div class="section">
    ${renderField('Existing Pensions', (args.formData.existing_arrangements as any)?.existing_pensions)}
    ${renderField('Existing ISAs', (args.formData.existing_arrangements as any)?.existing_isas)}
    ${renderField('Other Investments', (args.formData.existing_arrangements as any)?.other_investments)}
  </div>

  <h2>8. Vulnerability Assessment</h2>
  <div class="section">
    ${renderField('Health Considerations', (args.formData.vulnerability_assessment as any)?.health_issues)}
    ${renderField('Life Events', (args.formData.vulnerability_assessment as any)?.life_events)}
    ${renderField('Support Needs', (args.formData.vulnerability_assessment as any)?.support_needs)}
  </div>

  <h2>9. Recommendation Summary</h2>
  <div class="section">
    ${renderField('Recommendation', (args.formData.recommendation as any)?.recommendation_summary)}
    ${renderField('Rationale', (args.formData.recommendation as any)?.recommendation_rationale)}
  </div>

  <div class="footer">
    <p><strong>Important:</strong> This is a draft report for review purposes only. The final suitability report should be reviewed and approved before being provided to the client.</p>
    <p>Generated: ${escapeHtml(new Date().toLocaleString('en-GB'))} | Completion: ${escapeHtml(args.completionScore)}%</p>
    <p>This assessment is conducted in accordance with FCA COBS 9.2 requirements.</p>
  </div>
</body>
</html>`
}

export const DEFAULT_TEMPLATE_CONTENT = `
<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <h1 style="color: #2c3e50;">{{DOCUMENT_TITLE}}</h1>

  <p><strong>Date:</strong> {{REPORT_DATE}}</p>
  <p><strong>Client Reference:</strong> {{CLIENT_REF}}</p>
  <p><strong>Firm:</strong> {{FIRM_NAME}}</p>
  <p><strong>FCA Number:</strong> {{FIRM_FCA_NUMBER}}</p>
  <p><strong>Firm Address:</strong> {{FIRM_ADDRESS}}</p>
  
  <h2>Client Information</h2>
  <p><strong>Name:</strong> {{CLIENT_NAME}}</p>
  <p><strong>Email:</strong> {{CLIENT_EMAIL}}</p>
  
  <h2>Financial Summary</h2>
  <p><strong>Annual Income:</strong> £{{ANNUAL_INCOME}}</p>
  <p><strong>Net Worth:</strong> £{{NET_WORTH}}</p>
  <p><strong>Investment Amount:</strong> £{{INVESTMENT_AMOUNT}}</p>
  
  <h2>Risk Assessment</h2>
  <p><strong>Risk Profile:</strong> {{RISK_PROFILE}}</p>
  
  <h2>Recommendation</h2>
  <p>{{RECOMMENDATION}}</p>
  
  <p style="margin-top: 40px;">Prepared by: {{ADVISOR_NAME}}</p>
</div>
`

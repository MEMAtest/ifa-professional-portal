import { wrapWithStandardSigningShell } from '@/lib/documents/documentTemplateShell'
import { adjustPlanneticDocxTemplateHtml } from '@/lib/documents/planneticDocxTemplateAdjuster'

export type StandardSigningTemplate = {
  assessment_type: string
  name: string
  description: string
  requires_signature: boolean
  template_content: string
}

type RawTemplate = Omit<StandardSigningTemplate, 'template_content'> & {
  innerHtml: string
}

const RAW_PLANNETIC_SIGNING_TEMPLATES: RawTemplate[] = [
  {
    assessment_type: 'plannetic_about_our_services',
    name: 'About Our Services',
    description: 'Standard template: About Our Services (FCA disclosure)',
    requires_signature: false,
    innerHtml:
      '<h2>Overview</h2><p>This document explains who we are, the services we provide, and how we charge.</p><p>Please read it carefully before deciding whether to proceed.</p><h2>Regulatory Status</h2><p>[FIRM NAME] is authorised and regulated by the Financial Conduct Authority.</p>{{#if FIRM_FCA_NUMBER}}<p>FCA Firm Reference Number: [FRN]</p>{{/if}}<h2>Our Advice Service</h2><p>We provide regulated investment advice to retail clients.</p>{{#if ADVICE_TYPE}}<p><strong>Advice type:</strong> [independent / restricted]</p>{{/if}}<p>Our advice is based on your personal circumstances, objectives, and attitude to risk.</p><h2>Charges</h2><p>Our charges will be agreed with you in advance and confirmed in writing.</p>{{#if INITIAL_ADVICE_FEE}}<p><strong>Initial advice fee:</strong> [\u00A3 / %]</p>{{/if}}{{#if ONGOING_ADVICE_FEE}}<p><strong>Ongoing advice fee:</strong> [\u00A3 / %]</p>{{/if}}<h2>Complaints</h2><p>If you are unhappy with our service, you may complain to us directly.</p><p>You may also be entitled to refer your complaint to the Financial Ombudsman Service.</p>'
  },
  {
    assessment_type: 'plannetic_client_agreement',
    name: 'Client Agreement / Terms of Business',
    description: 'Standard template: Client agreement / terms of business',
    requires_signature: true,
    innerHtml:
      '<h2>Agreement</h2><p>This agreement sets out the terms under which [FIRM NAME] provides investment advice.</p><h2>Scope of Services</h2><ul><li>We will provide regulated investment advice based on the information you provide.</li><li>We will confirm our recommendations and any agreed charges in writing.</li></ul><h2>Your Responsibilities</h2><ul><li>You agree to provide complete and accurate information and notify us promptly of any changes.</li></ul><h2>Fees</h2><p>Fees are set out in the accompanying fee schedule and agreed in advance.</p><h2>Termination</h2><p>Either party may terminate this agreement by providing written notice.</p><h2>Signatures</h2><table><tbody><tr><td style="width: 50%;"><strong>Client signature</strong><br/>__________________________<br/><span class="muted">{{CLIENT_NAME}}</span><br/>Date: __________________</td><td><strong>Advisor signature</strong><br/>__________________________<br/><span class="muted">{{ADVISOR_NAME}}</span><br/>Date: __________________</td></tr></tbody></table>'
  },
  {
    assessment_type: 'plannetic_privacy_acknowledgement',
    name: 'Privacy Notice Acknowledgement',
    description: 'Standard template: Privacy notice acknowledgement',
    requires_signature: true,
    innerHtml:
      '<h2>Acknowledgement</h2><p>We process your personal data in accordance with our Privacy Notice.</p><p>By signing below, you confirm you have received and understood our Privacy Notice.</p><h2>Signature</h2><p><strong>Client signature:</strong> ____________________________</p><p class="muted">{{CLIENT_NAME}}</p><p><strong>Date:</strong> ____________________________</p>'
  },
  {
    assessment_type: 'plannetic_client_take_on_declaration',
    name: 'Client Take-on Declaration',
    description: 'Standard template: Client take-on declaration',
    requires_signature: true,
    innerHtml:
      '<h2>Declaration</h2><p>You confirm that the information provided during the advice process is complete, accurate, and up to date.</p><p>You agree to inform us promptly of any material changes.</p><h2>Signature</h2><p><strong>Client signature:</strong> ____________________________</p><p class="muted">{{CLIENT_NAME}}</p><p><strong>Date:</strong> ____________________________</p>'
  },
  {
    assessment_type: 'plannetic_risk_profiling_acknowledgement',
    name: 'Risk Profiling & Capacity for Loss Acknowledgement',
    description: 'Standard template: Risk profiling & capacity for loss acknowledgement',
    requires_signature: true,
    innerHtml:
      '<h2>Acknowledgement</h2><p>You confirm that you have completed the risk profiling questionnaire honestly and understand the risks associated with investing.</p><p>This includes your capacity for loss and the potential impact of market movements.</p><h2>Signature</h2><p><strong>Client signature:</strong> ____________________________</p><p class="muted">{{CLIENT_NAME}}</p><p><strong>Date:</strong> ____________________________</p>'
  },
  {
    assessment_type: 'plannetic_costs_and_charges_disclosure',
    name: 'Costs and Charges Disclosure',
    description: 'Standard template: Costs and charges disclosure',
    requires_signature: true,
    innerHtml:
      '<h2>Disclosure</h2><p>This document outlines the costs and charges associated with our advice and any recommended investments.</p><p>You acknowledge receipt of this information.</p><h2>Signature</h2><p><strong>Client signature:</strong> ____________________________</p><p class="muted">{{CLIENT_NAME}}</p><p><strong>Date:</strong> ____________________________</p>'
  },
  {
    assessment_type: 'plannetic_ongoing_service_agreement',
    name: 'Ongoing Service Agreement',
    description: 'Standard template: Ongoing service agreement',
    requires_signature: true,
    innerHtml:
      '<h2>Agreement</h2><p>This agreement sets out the ongoing advice services provided to you.</p><p>Services may include periodic reviews, ongoing suitability assessments, and support with changes to your circumstances.</p><h2>Signature</h2><p><strong>Client signature:</strong> ____________________________</p><p class="muted">{{CLIENT_NAME}}</p><p><strong>Date:</strong> ____________________________</p>'
  },
  {
    assessment_type: 'plannetic_annual_review_letter',
    name: 'Annual Review Letter',
    description: 'Standard template: Annual review letter',
    requires_signature: false,
    innerHtml:
      '<h2>Annual Review</h2><p>This letter confirms our annual review of your investment arrangements.</p><p>Please notify us of any changes to your circumstances that may affect our advice.</p><p class="muted">No signature is required.</p>'
  }
]

function buildTemplateContent(innerHtml: string): string {
  const adjusted = adjustPlanneticDocxTemplateHtml(innerHtml).html
  return wrapWithStandardSigningShell(adjusted)
}

export function getPlanneticSigningStandardTemplates(): StandardSigningTemplate[] {
  return RAW_PLANNETIC_SIGNING_TEMPLATES.map((t) => ({
    assessment_type: t.assessment_type,
    name: t.name,
    description: t.description,
    requires_signature: t.requires_signature,
    template_content: buildTemplateContent(t.innerHtml)
  }))
}

export function findPlanneticSigningStandardTemplate(idOrNameOrAssessmentType: string): StandardSigningTemplate | null {
  const normalized = (idOrNameOrAssessmentType || '').trim().toLowerCase()
  if (!normalized) return null

  const raw = RAW_PLANNETIC_SIGNING_TEMPLATES.find((t) => {
    return (
      t.assessment_type.toLowerCase() === normalized ||
      t.name.toLowerCase() === normalized
    )
  })

  if (!raw) return null

  return {
    assessment_type: raw.assessment_type,
    name: raw.name,
    description: raw.description,
    requires_signature: raw.requires_signature,
    template_content: buildTemplateContent(raw.innerHtml)
  }
}

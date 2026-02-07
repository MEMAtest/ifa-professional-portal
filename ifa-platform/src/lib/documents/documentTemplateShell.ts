export function wrapWithStandardSigningShell(innerHtml: string): string {
  const content = (innerHtml || '').trim()

  return `
<div class="plannetic-signing-shell" style="max-width: 820px; margin: 0 auto;">
  <style>
    :root { --plannetic-brand: #111827; --plannetic-accent: #0f766e; --plannetic-muted: #6b7280; }
    {{#if FIRM_PRIMARY_COLOR}}:root { --plannetic-brand: {{FIRM_PRIMARY_COLOR}}; }{{/if}}
    {{#if FIRM_ACCENT_COLOR}}:root { --plannetic-accent: {{FIRM_ACCENT_COLOR}}; }{{/if}}
    .plannetic-signing-shell { font-family: "Helvetica Neue", Arial, sans-serif; font-size: 13px; line-height: 1.55; color: #111827; }
    .plannetic-signing-shell h1 { color: var(--plannetic-brand); font-size: 20px; line-height: 1.2; margin: 0 0 8px; }
    .plannetic-signing-shell h2 { color: var(--plannetic-brand); margin: 22px 0 10px; font-size: 13px; letter-spacing: 0.06em; text-transform: uppercase; }
    .plannetic-signing-shell p { margin: 0 0 12px; }
    .plannetic-signing-shell ul { margin: 0 0 12px 18px; padding: 0; }
    .plannetic-signing-shell li { margin: 0 0 6px; }
    .plannetic-signing-shell table { width: 100%; border-collapse: collapse; margin: 10px 0 16px; }
    .plannetic-signing-shell th, .plannetic-signing-shell td { border: 1px solid #e5e7eb; padding: 8px 10px; font-size: 12px; vertical-align: top; }
    .plannetic-signing-shell .muted { color: var(--plannetic-muted); }
  </style>

  <div style="border-bottom: 2px solid var(--plannetic-brand); padding-bottom: 16px; margin-bottom: 24px;">
    <div style="display: flex; gap: 24px; justify-content: space-between; align-items: flex-start; flex-wrap: wrap;">
      <div style="min-width: 260px;">
        <h1>{{DOCUMENT_TITLE}}</h1>
        <div class="muted"><strong>Client:</strong> {{CLIENT_NAME}}</div>
        <div class="muted"><strong>Date:</strong> {{REPORT_DATE}}</div>
      </div>

      <div style="text-align: right; font-size: 12px; color: #374151;">
        {{#if FIRM_LOGO_URL}}<div style="margin: 0 0 8px;"><img src="{{FIRM_LOGO_URL}}" alt="{{FIRM_NAME}} logo" style="max-height: 48px; max-width: 220px; object-fit: contain;" /></div>{{/if}}
        <div style="font-weight: 700;">{{FIRM_NAME}}</div>
        {{#if FIRM_FCA_NUMBER}}<div>FCA FRN: {{FIRM_FCA_NUMBER}}</div>{{/if}}
        {{#if FIRM_ADDRESS}}<div>{{FIRM_ADDRESS}}</div>{{/if}}
        {{#if FIRM_EMAIL}}<div>{{FIRM_EMAIL}}</div>{{/if}}
        {{#if FIRM_PHONE}}<div>{{FIRM_PHONE}}</div>{{/if}}
        {{#if FIRM_WEBSITE}}<div>{{FIRM_WEBSITE}}</div>{{/if}}
      </div>
    </div>
  </div>

  <div>
    ${content}
  </div>

  {{#if FIRM_FOOTER_TEXT}}
    <div style="margin-top: 28px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #6b7280;">
      {{FIRM_FOOTER_TEXT}}
    </div>
  {{/if}}
</div>
  `.trim()
}

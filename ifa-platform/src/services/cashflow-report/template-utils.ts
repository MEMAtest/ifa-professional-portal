import type { ReportTemplateType } from './types';

export const populateTemplate = (content: string, variables: Record<string, any>): string => {
  console.log('🔍 populateTemplate called:', {
    contentLength: content?.length,
    variableKeys: Object.keys(variables || {}),
    contentType: typeof content
  });
  if (!content || typeof content !== 'string') {
    console.error('❌ populateTemplate: Invalid content:', { content, type: typeof content });
    return content || '';
  }

  let populated = content;

  // Handle conditional sections ({{#if CONDITION}} ... {{/if}})
  const conditionalRegex = /{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g;
  populated = populated.replace(conditionalRegex, (match, condition, innerContent) => {
    const conditionValue = variables[condition];

    if (
      conditionValue === 'true' ||
      conditionValue === true ||
      (typeof conditionValue === 'string' && conditionValue.length > 0) ||
      (typeof conditionValue === 'number' && conditionValue > 0)
    ) {
      return innerContent;
    }
    return '';
  });

  for (const key in variables) {
    const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
    populated = populated.replace(regex, String(variables[key] || ''));
  }

  populated = populated.replace(/{{[^}]*}}/g, '');

  return populated;
};

export const generateChartPlaceholders = (chartTypes: string[]): string[] => {
  console.log('🔍 generateChartPlaceholders called:', { chartTypes, length: chartTypes?.length });
  return chartTypes.map((type, index) => {
    console.log('🔍 Processing chart type:', { index, type, typeOf: typeof type });
    return `data:image/svg+xml;base64,${btoa(`
        <svg width="800" height="400" xmlns="http://www.w3.org/2000/svg">
          <rect width="100%" height="100%" fill="#f8f9fa" stroke="#dee2e6"/>
          <text x="50%" y="50%" text-anchor="middle" dy=".3em" font-family="Arial" font-size="16" fill="#6c757d">
            ${(type || 'chart').replace('_', ' ').toUpperCase()} CHART PREVIEW
          </text>
        </svg>
      `)}`;
  });
};

export const inferTemplateType = (templateId: string): ReportTemplateType => {
  if (templateId.includes('cashflow') || templateId.includes('cash-flow')) {
    return 'cashflow';
  }
  if (templateId.includes('suitability')) {
    return 'suitability';
  }
  if (templateId.includes('review')) {
    return 'review';
  }
  return 'cashflow';
};

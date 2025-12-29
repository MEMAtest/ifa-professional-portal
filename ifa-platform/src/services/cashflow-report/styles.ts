import type { AccessibilityFontSize } from './types';

const FONT_SIZES = {
  small: { body: '12px', h1: '24px', h2: '20px', h3: '16px', h4: '14px', p: '12px', small: '10px' },
  medium: { body: '14px', h1: '28px', h2: '24px', h3: '18px', h4: '16px', p: '14px', small: '12px' },
  large: { body: '18px', h1: '36px', h2: '30px', h3: '22px', h4: '20px', p: '18px', small: '16px' }
} as const;

export const getFontSize = (size: AccessibilityFontSize, element: string): string => {
  const scale = FONT_SIZES[size] || FONT_SIZES.medium;
  return (scale as Record<string, string>)[element] || scale.body;
};

export const getBaseStyles = (theme: string, isHighContrast: boolean, fontSize: AccessibilityFontSize): string => {
  return `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        line-height: 1.6;
        color: ${isHighContrast ? '#000' : '#333'};
        background: ${theme === 'dark' ? '#1a1a1a' : '#fff'};
        font-size: ${getFontSize(fontSize, 'body')};
      }
      
      .container {
        max-width: 210mm;
        margin: 0 auto;
        padding: 20mm;
        background: ${theme === 'dark' ? '#2a2a2a' : '#fff'};
      }
      
      .header {
        text-align: center;
        margin-bottom: 40px;
        padding-bottom: 30px;
        border-bottom: 3px solid ${isHighContrast ? '#000' : '#007acc'};
      }
      
      .section {
        margin-bottom: 40px;
        page-break-inside: avoid;
      }
      
      table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 20px;
      }
      
      th, td {
        padding: 12px;
        text-align: left;
        border: 1px solid ${isHighContrast ? '#000' : '#dee2e6'};
      }
    `;
};

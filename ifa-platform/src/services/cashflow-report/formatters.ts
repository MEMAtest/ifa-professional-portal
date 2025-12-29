export const getLocalizedText = (key: string, locale?: string): string => {
  const translations: Record<string, Record<string, string>> = {
    'en-GB': {
      ENHANCED_CASH_FLOW_ANALYSIS: 'Enhanced Cash Flow Analysis',
      PROFESSIONAL_ADVISOR: 'Professional Advisor',
      FINANCIAL_ADVISORY_SERVICES: 'Financial Advisory Services',
      YES: 'Yes',
      NO: 'No',
      YEAR: 'Year',
      AGE: 'Age',
      TOTAL_INCOME: 'Total Income',
      TOTAL_EXPENSES: 'Total Expenses',
      PORTFOLIO_VALUE: 'Portfolio Value',
      ANNUAL_SURPLUS: 'Annual Surplus',
      INFLATION_RATE: 'Inflation Rate',
      REAL_EQUITY_RETURN: 'Real Equity Return',
      REAL_BOND_RETURN: 'Real Bond Return',
      REAL_CASH_RETURN: 'Real Cash Return',
      RETIREMENT_AGE: 'Retirement Age',
      LIFE_EXPECTANCY: 'Life Expectancy',
      ASSUMPTION: 'Assumption',
      VALUE: 'Value',
      SHORTFALL_RISK: 'Shortfall Risk',
      LONGEVITY_RISK: 'Longevity Risk',
      INFLATION_RISK: 'Inflation Risk',
      SEQUENCE_RISK: 'Sequence Risk',
      RISK_ANALYSIS_SUMMARY: 'Risk Analysis Summary',
      ANALYSIS_CHARTS: 'Analysis Charts',
      FINANCIAL_REPORT: 'Financial Report',
      CHARTS_AND_VISUALIZATIONS: 'Charts and Visualizations',
      FINANCIAL_DATA_TABLE: 'Financial Data Table',
      RISK_ANALYSIS_SECTION: 'Risk Analysis Section'
    }
  };

  return translations[locale || 'en-GB']?.[key] || key;
};

export const formatDate = (date: Date, locale?: string): string => {
  return new Intl.DateTimeFormat(locale || 'en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }).format(date);
};

export const formatCurrency = (amount: number, locale?: string): string => {
  return new Intl.NumberFormat(locale || 'en-GB', {
    style: 'currency',
    currency: locale?.startsWith('en') ? 'GBP' : 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount || 0);
};

export const formatPercentage = (rate: number, locale?: string): string => {
  return new Intl.NumberFormat(locale || 'en-GB', {
    style: 'percent',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format((rate || 0) / 100);
};

export const formatSignedPercentage = (value: number, locale?: string): string => {
  const formatted = formatPercentage(value, locale);
  if (value > 0 && !formatted.startsWith('+')) {
    return `+${formatted}`;
  }
  return formatted;
};

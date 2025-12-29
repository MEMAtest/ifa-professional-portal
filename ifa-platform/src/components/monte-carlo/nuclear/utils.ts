export const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value);

export const formatPercent = (value: number) => `${value.toFixed(1)}%`;

export const getRiskAllocation = (riskScore: number) => {
  const clampedScore = Math.max(1, Math.min(10, riskScore));
  return {
    equity: 0.1 + (clampedScore - 1) * 0.08,
    bonds: 0.8 - (clampedScore - 1) * 0.07,
    cash: 0.1
  };
};

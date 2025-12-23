export const formatCurrency = (amount: number | undefined): string => {
  // FIX Issue 14: Guard against NaN, Infinity, and invalid values
  if (amount === undefined || amount === null) return 'Not provided'
  if (!Number.isFinite(amount)) return 'Not provided'
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP'
  }).format(amount)
}

export const formatDate = (dateString: string | undefined): string => {
  if (!dateString) return 'Not provided'
  const d = new Date(dateString)
  if (Number.isNaN(d.getTime())) return 'Not provided'
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
}

export const formatPercentage = (value: number | undefined): string => {
  // FIX Issue 14: Guard against NaN, Infinity, and invalid values
  if (value === undefined || value === null) return 'Not provided'
  if (!Number.isFinite(value)) return 'Not provided'
  return `${value}%`
}

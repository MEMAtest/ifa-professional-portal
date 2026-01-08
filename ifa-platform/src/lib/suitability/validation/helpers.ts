export const ensureString = (value: any): string => {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

export const ensureNumber = (value: any): number => {
  const num = parseFloat(value)
  return isNaN(num) ? 0 : num
}

export const ensureArray = (value: any): any[] => {
  return Array.isArray(value) ? value : []
}

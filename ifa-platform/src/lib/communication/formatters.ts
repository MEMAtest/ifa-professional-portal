export const formatRelativeDate = (dateString: string): string => {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffHours = diffMs / (1000 * 60 * 60)

  if (diffHours < 1) {
    return `${Math.round(diffMs / (1000 * 60))}m ago`
  }
  if (diffHours < 24) {
    return `${Math.round(diffHours)}h ago`
  }
  if (diffHours < 48) {
    return 'Yesterday'
  }
  return date.toLocaleDateString('en-UK', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

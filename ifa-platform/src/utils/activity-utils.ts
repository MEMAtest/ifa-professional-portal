// ===================================================================
// File: src/utils/activity-utils.ts
// Shared utility functions for activity feeds and documents
// ===================================================================

export function getActionIcon(action: string): string {
  switch (action) {
    case 'created': return '📄'
    case 'sent': return '📤'
    case 'viewed': return '👁️'
    case 'signed': return '✅'
    case 'downloaded': return '⬇️'
    case 'archived': return '📦'
    case 'deleted': return '🗑️'
    case 'updated': return '✏️'
    default: return '📋'
  }
}

export function getActionColor(action: string): string {
  switch (action) {
    case 'signed': return 'green'
    case 'sent': return 'blue'
    case 'viewed': return 'yellow'
    case 'created': return 'blue'
    case 'archived': return 'gray'
    case 'deleted': return 'red'
    case 'updated': return 'purple'
    default: return 'gray'
  }
}

export function formatUserId(userId: string): string {
  if (userId === 'system') return 'System'
  if (userId.length > 8) {
    return `User ${userId.substring(0, 8)}...`
  }
  return `User ${userId}`
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}
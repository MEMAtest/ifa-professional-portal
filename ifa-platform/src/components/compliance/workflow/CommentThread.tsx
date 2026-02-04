'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, Send } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import type { WorkflowSourceType } from './types'
import clientLogger from '@/lib/logging/clientLogger'

interface ComplianceComment {
  id: string
  source_type: WorkflowSourceType
  source_id: string
  user_id: string
  content: string
  created_at: string
  user_first_name?: string
  user_last_name?: string
  user_avatar_url?: string | null
}

interface CommentThreadProps {
  sourceType: WorkflowSourceType
  sourceId: string
  firmId?: string
}

export default function CommentThread({ sourceType, sourceId }: CommentThreadProps) {
  const [comments, setComments] = useState<ComplianceComment[]>([])
  const [loading, setLoading] = useState(true)
  const [posting, setPosting] = useState(false)
  const [content, setContent] = useState('')
  const endRef = useRef<HTMLDivElement | null>(null)

  const loadComments = useCallback(async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/compliance/comments?sourceType=${sourceType}&sourceId=${sourceId}`)
      if (!response.ok) throw new Error('Failed to load comments')
      const data = await response.json()
      setComments(data.comments || [])
    } catch (error) {
      clientLogger.error('Failed to load comments:', error)
      setComments([])
    } finally {
      setLoading(false)
    }
  }, [sourceId, sourceType])

  useEffect(() => {
    if (!sourceType || !sourceId) return
    loadComments()
  }, [sourceType, sourceId, loadComments])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [comments])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) return

    setPosting(true)
    try {
      const response = await fetch('/api/compliance/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceType,
          sourceId,
          content: content.trim(),
        }),
      })
      if (!response.ok) throw new Error('Failed to add comment')
      const data = await response.json()
      setComments((prev) => [...prev, data.comment])
      setContent('')
    } catch (error) {
      clientLogger.error('Failed to add comment:', error)
    } finally {
      setPosting(false)
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-3 text-sm font-semibold text-gray-800">Comments</div>

      <div className="max-h-48 space-y-3 overflow-y-auto pr-2">
        {loading ? (
          <div className="flex items-center justify-center py-6 text-gray-500">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Loading comments…
          </div>
        ) : comments.length === 0 ? (
          <div className="rounded-md border border-dashed border-gray-200 px-3 py-4 text-center text-xs text-gray-400">
            No comments yet
          </div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="rounded-md bg-gray-50 p-3 text-sm text-gray-700">
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>
                  {(comment.user_first_name || '') + ' ' + (comment.user_last_name || '') || 'User'}
                </span>
                <span>
                  {new Date(comment.created_at).toLocaleString('en-GB', {
                    day: '2-digit',
                    month: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <p className="mt-1 whitespace-pre-wrap text-sm text-gray-700">{comment.content}</p>
            </div>
          ))
        )}
        <div ref={endRef} />
      </div>

      <form onSubmit={handleSubmit} className="mt-3 flex items-center gap-2">
        <div className="relative flex-1">
          <input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={2000}
            placeholder="Add a comment..."
            aria-label="Add a comment"
            className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          {content.length > 1800 && (
            <span className={`absolute right-2 top-1/2 -translate-y-1/2 text-xs ${content.length >= 2000 ? 'text-red-500' : 'text-gray-400'}`}>
              {content.length}/2000
            </span>
          )}
        </div>
        <Button type="submit" size="sm" disabled={posting || !content.trim() || content.length > 2000}>
          {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  )
}

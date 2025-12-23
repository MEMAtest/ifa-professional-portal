'use client'

import React from 'react'
import { Calendar, Edit, FileText, Plus } from 'lucide-react'

import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { formatDate } from '@/lib/utils'

type BooleanState = React.Dispatch<React.SetStateAction<boolean>>
type ReviewState = React.Dispatch<React.SetStateAction<any>>

export function ClientReviewsTab(props: {
  reviews: any[] | null | undefined
  dataLoading: boolean
  onScheduleReview: () => void
  setSelectedReview: ReviewState
  setShowEditReviewModal: BooleanState
}) {
  const { reviews, dataLoading, onScheduleReview, setSelectedReview, setShowEditReviewModal } = props

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Review History
            </CardTitle>
            <Button onClick={onScheduleReview} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Schedule Review
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {dataLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : (
            <div className="space-y-4">
              {reviews && reviews.length > 0 ? (
                reviews.map((review: any) => (
                  <div
                    key={review.id}
                    className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => {
                      setSelectedReview(review)
                      setShowEditReviewModal(true)
                    }}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium">{review.review_type}</h4>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            review.status === 'completed'
                              ? 'default'
                              : review.status === 'overdue'
                                ? 'destructive'
                                : 'secondary'
                          }
                        >
                          {review.status}
                        </Badge>
                        <Edit className="h-4 w-4 text-gray-400" />
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">
                      {review.status === 'completed' && review.completed_date
                        ? `Completed on ${formatDate(review.completed_date)}`
                        : `Due on ${formatDate(review.due_date)}`}
                    </p>
                    {review.review_summary && <p className="text-sm">{review.review_summary}</p>}
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 mb-4">No reviews recorded</p>
                  <Button onClick={onScheduleReview}>Schedule First Review</Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Next Review
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(() => {
            const upcomingReview = reviews?.find((r: any) => r.status === 'pending' || r.status === 'overdue')

            if (upcomingReview) {
              return (
                <div className="space-y-4">
                  <div className="text-center">
                    <Calendar className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                    <h4 className="font-medium text-lg">{upcomingReview.review_type}</h4>
                    <p className="text-gray-600 mt-2">Due on {formatDate(upcomingReview.due_date)}</p>
                    {upcomingReview.status === 'overdue' && (
                      <Badge variant="destructive" className="mt-2">
                        Overdue
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2 justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedReview(upcomingReview)
                        setShowEditReviewModal(true)
                      }}
                    >
                      Reschedule
                    </Button>
                    <Button size="sm">Complete Review</Button>
                  </div>
                </div>
              )
            }

            return (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No review scheduled</p>
                <Button onClick={onScheduleReview}>Schedule Review</Button>
              </div>
            )
          })()}
        </CardContent>
      </Card>
    </div>
  )
}


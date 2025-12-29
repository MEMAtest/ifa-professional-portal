import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Calendar, Edit } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface Review {
  id: string;
  review_type: string;
  due_date: string;
  completed_date?: string;
  status: 'completed' | 'pending' | 'cancelled' | 'overdue';
  review_summary?: string;
  next_review_date?: string;
}

interface ReviewsTabProps {
  reviews: Review[];
  dataLoading: boolean;
  onEditReview: (review: Review) => void;
  onScheduleReview: () => void;
}

export function ReviewsTab({ reviews, dataLoading, onEditReview, onScheduleReview }: ReviewsTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader>
          <CardTitle>Review History</CardTitle>
        </CardHeader>
        <CardContent>
          {dataLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <div
                  key={review.id}
                  className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => onEditReview(review)}
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-medium">{review.review_type}</h4>
                    <div className="flex items-center space-x-2">
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
                  {review.next_review_date && (
                    <p className="text-sm text-blue-600 mt-2">
                      Next review: {formatDate(review.next_review_date)}
                    </p>
                  )}
                </div>
              ))}
              {reviews.length === 0 && (
                <p className="text-center text-gray-500 py-8">No reviews recorded</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Next Review</CardTitle>
        </CardHeader>
        <CardContent>
          {(() => {
            const upcomingReview = reviews.find(
              (review) => review.status === 'pending' || review.status === 'overdue'
            );

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
                      onClick={(event) => {
                        event.stopPropagation();
                        onEditReview(upcomingReview);
                      }}
                    >
                      Reschedule
                    </Button>
                    <Button size="sm">Complete Review</Button>
                  </div>
                </div>
              );
            }

            return (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No review scheduled</p>
                <Button onClick={onScheduleReview}>Schedule Review</Button>
              </div>
            );
          })()}
        </CardContent>
      </Card>
    </div>
  );
}

// src/components/reviews/EditReviewModal.tsx
// Fixed version that creates next review when next_review_date is set

'use client';

import React, { useState, useEffect } from 'react';
import { X, Calendar, Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';

interface EditReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  review: any;
  clientName: string;
  onSuccess?: () => void;
}

export function EditReviewModal({ 
  isOpen, 
  onClose, 
  review, 
  clientName,
  onSuccess 
}: EditReviewModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    due_date: '',
    review_summary: '',
    status: 'scheduled',
    next_review_date: ''
  });

  // Track original next review date to detect changes
  const [originalNextReviewDate, setOriginalNextReviewDate] = useState('');

  useEffect(() => {
    if (review && isOpen) {
      setFormData({
        due_date: review.due_date || '',
        review_summary: review.review_summary || '',
        status: review.status || 'scheduled',
        next_review_date: review.next_review_date || ''
      });
      setOriginalNextReviewDate(review.next_review_date || '');
    }
  }, [review, isOpen]);

  const formatDateDisplay = (dateString: string): string => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Authentication required');
      }

      // Update the current review
      const updateData: any = {
        due_date: formData.due_date,
        review_summary: formData.review_summary,
        status: formData.status,
        next_review_date: formData.next_review_date || null,
        updated_at: new Date().toISOString()
      };

      // If marking as completed, set completion date
      if (formData.status === 'completed' && review.status !== 'completed') {
        updateData.completed_date = new Date().toISOString();
        updateData.completed_by = user.id;
      }

      const { error } = await supabase
        .from('client_reviews')
        .update(updateData)
        .eq('id', review.id);

      if (error) throw error;

      // Update calendar event for current review
      try {
        const startDateTime = new Date(`${formData.due_date}T09:00:00`);
        const endDateTime = new Date(startDateTime.getTime() + 90 * 60000);
        
        // Build description with next review date
        let eventDescription = formData.review_summary;
        if (formData.next_review_date) {
          eventDescription += `\nNext Review: ${formatDateDisplay(formData.next_review_date)}`;
        }
        
        const { error: calendarError } = await supabase
          .from('calendar_events')
          .update({
            start_date: startDateTime.toISOString(),
            end_date: endDateTime.toISOString(),
            description: eventDescription
          })
          .eq('related_entity_id', review.id)
          .eq('related_entity_type', 'client_review');
          
        if (calendarError) {
          console.warn('Failed to update calendar event:', calendarError);
        }
      } catch (calendarError) {
        console.warn('Calendar update error:', calendarError);
      }

      // ✅ FIX: Create next review if next_review_date is set and different from original
      if (formData.next_review_date && formData.next_review_date !== originalNextReviewDate) {
        try {
          // Check if a review already exists for that date
          const { data: existingReview } = await supabase
            .from('client_reviews')
            .select('id')
            .eq('client_id', review.client_id)
            .eq('due_date', formData.next_review_date)
            .eq('review_type', review.review_type)
            .single();

          if (!existingReview) {
            // Create the next review
            const { data: newReview, error: nextReviewError } = await supabase
              .from('client_reviews')
              .insert({
                client_id: review.client_id,
                review_type: review.review_type,
                due_date: formData.next_review_date,
                review_summary: `Follow-up ${review.review_type.replace('_', ' ')} review`,
                status: 'scheduled',
                created_by: user.id,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .select()
              .single();

            if (nextReviewError) {
              console.error('Failed to create next review:', nextReviewError);
            } else if (newReview) {
              // Create calendar event for the next review
              const nextStartDateTime = new Date(`${formData.next_review_date}T09:00:00`);
              const nextEndDateTime = new Date(nextStartDateTime.getTime() + 90 * 60000);
              
              const reviewTypeConfig = {
                annual: { color: '#10B981', label: 'Annual Review' },
                periodic: { color: '#3B82F6', label: 'Periodic Review' },
                regulatory: { color: '#F59E0B', label: 'Regulatory Review' },
                ad_hoc: { color: '#8B5CF6', label: 'Ad Hoc Review' }
              };

              const config = reviewTypeConfig[review.review_type as keyof typeof reviewTypeConfig] || 
                            { color: '#6B7280', label: 'Review' };

              const { error: calendarError } = await supabase
                .from('calendar_events')
                .insert({
                  user_id: user.id,
                  title: `${config.label} - ${clientName}`,
                  description: `Follow-up ${review.review_type.replace('_', ' ')} review`,
                  start_date: nextStartDateTime.toISOString(),
                  end_date: nextEndDateTime.toISOString(),
                  all_day: false,
                  event_type: 'review',
                  related_entity_type: 'client_review',
                  related_entity_id: newReview.id,
                  client_id: review.client_id,
                  color: config.color,
                  reminders: []
                });

              if (calendarError) {
                console.error('Failed to create calendar event for next review:', calendarError);
              } else {
                toast({
                  title: 'Next Review Scheduled',
                  description: `Created follow-up review for ${formatDateDisplay(formData.next_review_date)}`,
                  variant: 'default'
                });
              }
            }
          }
        } catch (error) {
          console.error('Error creating next review:', error);
        }
      }

      toast({
        title: 'Success',
        description: 'Review updated successfully',
        variant: 'default'
      });
      
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error updating review:', error);
      toast({
        title: 'Error',
        description: 'Failed to update review',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this review? This action cannot be undone.')) {
      return;
    }

    setLoading(true);
    try {
      // Delete related calendar event first
      await supabase
        .from('calendar_events')
        .delete()
        .eq('related_entity_id', review.id)
        .eq('related_entity_type', 'client_review');

      // Delete the review
      const { error } = await supabase
        .from('client_reviews')
        .delete()
        .eq('id', review.id);

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Review deleted successfully',
        variant: 'default'
      });
      
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error('Error deleting review:', error);
      toast({
        title: 'Error',
        description: 'Failed to delete review',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />
      
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
          <div className="flex items-center justify-between p-6 border-b">
            <div>
              <h2 className="text-xl font-semibold">Edit Review</h2>
              <p className="text-sm text-gray-500 mt-1">{clientName}</p>
              <p className="text-xs text-gray-400 mt-1 capitalize">
                {review?.review_type?.replace('_', ' ')} Review
              </p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
              <X className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            <div>
              <Label htmlFor="status">Status</Label>
              <select
                id="status"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="scheduled">Scheduled</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="overdue">Overdue</option>
              </select>
              <div className="mt-2">
                <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(formData.status)}`}>
                  {formData.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
            </div>

            <div>
              <Label htmlFor="due-date">Due Date</Label>
              <Input
                id="due-date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                required
              />
            </div>

            <div>
              <Label htmlFor="review-summary">Review Summary</Label>
              <Textarea
                id="review-summary"
                value={formData.review_summary}
                onChange={(e) => setFormData({ ...formData, review_summary: e.target.value })}
                rows={3}
                placeholder="Summary of review findings and recommendations..."
              />
            </div>

            <div>
              <Label htmlFor="next-review-date">Next Review Date</Label>
              <Input
                id="next-review-date"
                type="date"
                value={formData.next_review_date}
                onChange={(e) => setFormData({ ...formData, next_review_date: e.target.value })}
                min={formData.due_date}
              />
              {formData.next_review_date && (
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    Next review scheduled for {formatDateDisplay(formData.next_review_date)}
                  </p>
                  {formData.next_review_date !== originalNextReviewDate && (
                    <p className="text-sm text-blue-600 mt-1">
                      ✓ A new review will be created for this date
                    </p>
                  )}
                </div>
              )}
            </div>

            {formData.status === 'completed' && !review.completed_date && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  Marking as completed will set today as the completion date.
                </p>
              </div>
            )}
          </form>

          <div className="flex justify-between items-center px-6 py-4 bg-gray-50 border-t">
            <button
              onClick={handleDelete}
              className="text-red-600 hover:text-red-700 text-sm font-medium"
              disabled={loading}
            >
              Delete Review
            </button>
            <div className="flex space-x-3">
              <Button variant="outline" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
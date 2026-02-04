// src/components/reviews/ScheduleReviewModal.tsx
// Type-safe, performant review scheduling modal with enhanced UX
// ✅ FIXED: Creates next review when next_review_date is set

'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { X, Calendar, FileText, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/lib/supabase/client';
import clientLogger from '@/lib/logging/clientLogger';

const supabase = createClient();  // ✅ ADD THIS LINE
// ===== TYPE DEFINITIONS =====
interface ScheduleReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  onSuccess?: () => void;
  existingReviews?: ReviewData[];
}

interface ReviewFormData {
  review_type: ReviewType;
  due_date: string;
  review_summary: string;
  next_review_date: string;
}

interface ReviewData {
  id: string;
  due_date: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'overdue';
  review_type: string;
}

type ReviewType = 'annual' | 'periodic' | 'regulatory' | 'ad_hoc';

interface ReviewTypeOption {
  value: ReviewType;
  label: string;
  icon: string;
  defaultInterval?: number; // months
  description: string;
}

// ===== CONSTANTS =====
const REVIEW_TYPES: ReviewTypeOption[] = [
  { 
    value: 'annual', 
    label: 'Annual Review', 
    icon: '📅',
    defaultInterval: 12,
    description: 'Yearly comprehensive review'
  },
  { 
    value: 'periodic', 
    label: 'Periodic Review', 
    icon: '🔄',
    defaultInterval: 6,
    description: 'Regular interval check-in'
  },
  { 
    value: 'regulatory', 
    label: 'Regulatory Review', 
    icon: '📋',
    defaultInterval: 12,
    description: 'Compliance-required review'
  },
  { 
    value: 'ad_hoc', 
    label: 'Ad Hoc Review', 
    icon: '📝',
    description: 'One-time special review'
  }
];

// ===== HELPER FUNCTIONS =====
const formatDateForInput = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDateDisplay = (dateString: string): string => {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const getMinimumDate = (): string => {
  return formatDateForInput(new Date());
};

const addMonths = (date: Date, months: number): Date => {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
};

const getDefaultNextReviewDate = (dueDate: string, reviewType: ReviewType): string => {
  const selectedType = REVIEW_TYPES.find(type => type.value === reviewType);
  if (!selectedType?.defaultInterval || !dueDate) return '';
  
  const dueDateObj = new Date(dueDate);
  const nextDate = addMonths(dueDateObj, selectedType.defaultInterval);
  return formatDateForInput(nextDate);
};

const isBefore = (date1: Date, date2: Date): boolean => {
  return date1.getTime() < date2.getTime();
};

const startOfDay = (date: Date): Date => {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
};

// ===== MAIN COMPONENT =====
export function ScheduleReviewModal({
  isOpen,
  onClose,
  clientId,
  clientName,
  onSuccess,
  existingReviews = []
}: ScheduleReviewModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [showNextReviewDate, setShowNextReviewDate] = useState(false);
  
  // Form state with strict typing
  const [formData, setFormData] = useState<ReviewFormData>({
    review_type: 'annual',
    due_date: '',
    review_summary: '',
    next_review_date: ''
  });

  // Validation state
  const [errors, setErrors] = useState<Partial<Record<keyof ReviewFormData, string>>>({});

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      const tomorrow = addMonths(new Date(), 1);
      setFormData({
        review_type: 'annual',
        due_date: formatDateForInput(tomorrow),
        review_summary: '',
        next_review_date: ''
      });
      setErrors({});
      setShowNextReviewDate(false);
    }
  }, [isOpen]);

  // Auto-calculate next review date when due date or type changes
  useEffect(() => {
    if (formData.due_date && showNextReviewDate) {
      const calculatedDate = getDefaultNextReviewDate(formData.due_date, formData.review_type);
      setFormData(prev => ({ ...prev, next_review_date: calculatedDate }));
    }
  }, [formData.due_date, formData.review_type, showNextReviewDate]);

  // Check for scheduling conflicts
  const checkForConflicts = useCallback((): string | null => {
    if (!formData.due_date) return null;
    
    const newDueDate = new Date(formData.due_date);
    const conflictingReview = existingReviews.find(review => {
      if (review.status === 'completed') return false;
      
      const existingDate = new Date(review.due_date);
      const daysDiff = Math.abs((newDueDate.getTime() - existingDate.getTime()) / (1000 * 60 * 60 * 24));
      
      return daysDiff < 30; // Flag if within 30 days of existing review
    });

    if (conflictingReview) {
      return `There's already a ${conflictingReview.review_type} review scheduled for ${formatDateDisplay(conflictingReview.due_date)}`;
    }

    return null;
  }, [formData.due_date, existingReviews]);

  // Validate form
  const validateForm = useCallback((): boolean => {
    const newErrors: Partial<Record<keyof ReviewFormData, string>> = {};

    // Due date validation
    if (!formData.due_date) {
      newErrors.due_date = 'Due date is required';
    } else {
      const dueDate = new Date(formData.due_date);
      const today = startOfDay(new Date());
      
      if (isBefore(dueDate, today)) {
        newErrors.due_date = 'Due date cannot be in the past';
      }
    }

    // Next review date validation
    if (formData.next_review_date && formData.due_date) {
      const nextDate = new Date(formData.next_review_date);
      const dueDate = new Date(formData.due_date);
      
      if (isBefore(nextDate, dueDate)) {
        newErrors.next_review_date = 'Next review date must be after the current due date';
      }
    }

    // Summary length validation
    if (formData.review_summary && formData.review_summary.length > 500) {
      newErrors.review_summary = 'Summary must be less than 500 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors before submitting',
        variant: 'destructive'
      });
      return;
    }

    // Check for conflicts
    const conflict = checkForConflicts();
    if (conflict) {
      const shouldProceed = window.confirm(`${conflict}\n\nDo you want to proceed anyway?`);
      if (!shouldProceed) return;
    }

    setLoading(true);

    try {
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      
      if (userError || !user) {
        throw new Error('Authentication required');
      }

      // Insert directly into database (matching existing reviews page pattern)
      const { data, error } = await supabase
        .from('client_reviews')
        .insert({
          client_id: clientId,
          review_type: formData.review_type,
          due_date: formData.due_date,
          review_summary: formData.review_summary || `${REVIEW_TYPES.find(t => t.value === formData.review_type)?.label} scheduled`,
          next_review_date: formData.next_review_date || null,
          status: 'scheduled',
          created_by: user.id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        throw new Error(`Failed to schedule review: ${error.message}`);
      }

      // Create calendar event for the review
      try {
        const reviewConfig = REVIEW_TYPES.find(t => t.value === formData.review_type);
        const startDateTime = new Date(`${formData.due_date}T09:00:00`); // Default to 9 AM
        const duration = reviewConfig?.defaultInterval ? 90 : 60; // 90 min for annual, 60 for others
        const endDateTime = new Date(startDateTime.getTime() + duration * 60000);
        
        const eventColor = {
          annual: '#10B981',
          periodic: '#3B82F6',
          regulatory: '#F59E0B',
          ad_hoc: '#8B5CF6'
        }[formData.review_type] || '#6B7280';

        // Build description with next review date if available
        let eventDescription = formData.review_summary || `${reviewConfig?.label} scheduled for ${clientName}`;
        if (formData.next_review_date) {
          eventDescription += `\nNext Review: ${formatDateDisplay(formData.next_review_date)}`;
        }

        const { error: calendarError } = await supabase
          .from('calendar_events')
          .insert({
            user_id: user.id,
            title: `${reviewConfig?.label || 'Review'} - ${clientName}`,
            description: eventDescription,
            start_date: startDateTime.toISOString(),
            end_date: endDateTime.toISOString(),
            all_day: false,
            event_type: 'review',
            related_entity_type: 'client_review',
            related_entity_id: data.id,
            client_id: clientId,
            color: eventColor,
            reminders: []
          });

        if (calendarError) {
          console.warn('Failed to create calendar event:', calendarError);
          // Don't fail the whole operation if calendar event fails
          toast({
            title: 'Warning',
            description: 'Review created but calendar event failed. You can add it manually.',
            variant: 'default'
          });
        }
      } catch (calendarError) {
        console.warn('Failed to create calendar event:', calendarError);
      }

      // ✅ FIX: Create next review if next_review_date is provided
      if (formData.next_review_date) {
        try {
          // Create the next review
          const { data: nextReview, error: nextReviewError } = await supabase
            .from('client_reviews')
            .insert({
              client_id: clientId,
              review_type: formData.review_type,
              due_date: formData.next_review_date,
              review_summary: `Follow-up ${REVIEW_TYPES.find(t => t.value === formData.review_type)?.label || 'Review'}`,
              status: 'scheduled',
              created_by: user.id,
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .select()
            .single();

          if (!nextReviewError && nextReview) {
            // Create calendar event for the next review
            const reviewConfig = REVIEW_TYPES.find(t => t.value === formData.review_type);
            const nextStartDateTime = new Date(`${formData.next_review_date}T09:00:00`);
            const nextDuration = reviewConfig?.defaultInterval ? 90 : 60;
            const nextEndDateTime = new Date(nextStartDateTime.getTime() + nextDuration * 60000);
            
            const eventColor = {
              annual: '#10B981',
              periodic: '#3B82F6',
              regulatory: '#F59E0B',
              ad_hoc: '#8B5CF6'
            }[formData.review_type] || '#6B7280';

            const { error: nextCalendarError } = await supabase
              .from('calendar_events')
              .insert({
                user_id: user.id,
                title: `${reviewConfig?.label || 'Review'} - ${clientName}`,
                description: `Follow-up ${reviewConfig?.label || 'review'}`,
                start_date: nextStartDateTime.toISOString(),
                end_date: nextEndDateTime.toISOString(),
                all_day: false,
                event_type: 'review',
                related_entity_type: 'client_review',
                related_entity_id: nextReview.id,
                client_id: clientId,
                color: eventColor,
                reminders: []
              });

            if (nextCalendarError) {
              console.warn('Failed to create calendar event for next review:', nextCalendarError);
            } else {
              toast({
                title: 'Next Review Scheduled',
                description: `Created follow-up review for ${formatDateDisplay(formData.next_review_date)}`,
                variant: 'default'
              });
            }
          }
        } catch (error) {
          console.warn('Failed to create next review:', error);
          // Don't fail the whole operation if next review creation fails
        }
      }

      toast({
        title: 'Success',
        description: `Review scheduled for ${formatDateDisplay(formData.due_date)}`,
        variant: 'default'
      });
      
      onSuccess?.();
      onClose();
    } catch (error) {
      clientLogger.error('Error scheduling review:', error);
      
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to schedule review',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle field changes with validation
  const handleFieldChange = useCallback((field: keyof ReviewFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  }, [errors]);

  // Memoized selected review type details
  const selectedReviewType = useMemo(
    () => REVIEW_TYPES.find(type => type.value === formData.review_type),
    [formData.review_type]
  );

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      {/* Backdrop with animation */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden transform transition-all duration-300">
          {/* Header */}
          <div className="flex items-center justify-between p-4 sm:p-6 border-b">
            <div>
              <h2 id="modal-title" className="text-xl font-semibold text-gray-900">
                Schedule Client Review
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Schedule a review for {clientName}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 transition-colors"
              aria-label="Close modal"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-5">
            {/* Review Type Selection */}
            <div>
              <Label htmlFor="review-type">Review Type *</Label>
              <select
                id="review-type"
                value={formData.review_type}
                onChange={(e) => handleFieldChange('review_type', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                required
              >
                {REVIEW_TYPES.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.icon} {type.label}
                  </option>
                ))}
              </select>
              {selectedReviewType && (
                <p className="text-sm text-gray-500 mt-1">
                  {selectedReviewType.description}
                </p>
              )}
            </div>

            {/* Due Date */}
            <div>
              <Label htmlFor="due-date">Due Date *</Label>
              <Input
                id="due-date"
                type="date"
                value={formData.due_date}
                onChange={(e) => handleFieldChange('due_date', e.target.value)}
                min={getMinimumDate()}
                className={errors.due_date ? 'border-red-500' : ''}
                required
                aria-invalid={!!errors.due_date}
                aria-describedby={errors.due_date ? 'due-date-error' : undefined}
              />
              {errors.due_date && (
                <p id="due-date-error" className="text-sm text-red-600 mt-1">
                  {errors.due_date}
                </p>
              )}
            </div>

            {/* Review Summary */}
            <div>
              <Label htmlFor="review-summary">
                Review Summary 
                <span className="text-sm text-gray-500 ml-2">(Optional)</span>
              </Label>
              <Textarea
                id="review-summary"
                value={formData.review_summary}
                onChange={(e) => handleFieldChange('review_summary', e.target.value)}
                placeholder="Brief description of review scope and objectives..."
                rows={3}
                maxLength={500}
                className={errors.review_summary ? 'border-red-500' : ''}
                aria-invalid={!!errors.review_summary}
                aria-describedby={errors.review_summary ? 'summary-error' : undefined}
              />
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between mt-1">
                <span className="text-sm text-gray-500">
                  {formData.review_summary.length}/500 characters
                </span>
                {errors.review_summary && (
                  <p id="summary-error" className="text-sm text-red-600">
                    {errors.review_summary}
                  </p>
                )}
              </div>
            </div>

            {/* Next Review Toggle */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="schedule-next"
                  checked={showNextReviewDate}
                  onChange={(e) => setShowNextReviewDate(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <Label htmlFor="schedule-next" className="cursor-pointer font-normal">
                  Schedule next review date
                </Label>
              </div>

              {showNextReviewDate && (
                <div className="mt-3">
                  <Label htmlFor="next-review-date">Next Review Date</Label>
                  <Input
                    id="next-review-date"
                    type="date"
                    value={formData.next_review_date}
                    onChange={(e) => handleFieldChange('next_review_date', e.target.value)}
                    min={formData.due_date || getMinimumDate()}
                    className={errors.next_review_date ? 'border-red-500' : ''}
                    aria-invalid={!!errors.next_review_date}
                    aria-describedby={errors.next_review_date ? 'next-date-error' : undefined}
                  />
                  {errors.next_review_date && (
                    <p id="next-date-error" className="text-sm text-red-600 mt-1">
                      {errors.next_review_date}
                    </p>
                  )}
                  {selectedReviewType?.defaultInterval && (
                    <p className="text-sm text-gray-500 mt-1">
                      Auto-calculated based on {selectedReviewType.label} interval
                    </p>
                  )}
                  {formData.next_review_date && (
                    <p className="text-sm text-blue-600 mt-2">
                      ✓ A follow-up review will be created for {formatDateDisplay(formData.next_review_date)}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Conflict Warning */}
            {checkForConflicts() && (
              <div className="flex items-start space-x-2 p-3 bg-amber-50 rounded-lg border border-amber-200">
                <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800">
                  <p className="font-medium">Scheduling Conflict</p>
                  <p>{checkForConflicts()}</p>
                </div>
              </div>
            )}
          </form>

          {/* Footer */}
          <div className="flex flex-col-reverse gap-3 px-4 sm:px-6 py-4 bg-gray-50 border-t sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || Object.keys(errors).length > 0}
              className="flex items-center space-x-2 w-full sm:w-auto"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Scheduling...</span>
                </>
              ) : (
                <>
                  <Calendar className="h-4 w-4" />
                  <span>Schedule Review</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

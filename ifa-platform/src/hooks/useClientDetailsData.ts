// src/hooks/useClientDetailsData.ts
// ===================================================================
// HOOK TO FETCH REAL DATA FOR CLIENT DETAILS
// ===================================================================

import { useState, useEffect } from 'react';
import type { Client } from '@/types/client';

interface Communication {
  id: string;
  type: 'email' | 'call' | 'meeting' | 'note';
  subject: string;
  date: string;
  status: 'completed' | 'pending' | 'cancelled';
  content?: string;
}

interface Review {
  id: string;
  review_type: string;
  due_date: string;
  completed_date?: string;
  status: 'completed' | 'pending' | 'cancelled' | 'overdue';
  review_summary?: string;
  changes_made?: any;
  recommendations?: any;
  next_review_date?: string;
}

interface Activity {
  id: string;
  action: string;
  user_name?: string;
  date: string;
  type?: string;
}

interface ClientDetailsData {
  communications: Communication[];
  reviews: Review[];
  activities: Activity[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useClientDetailsData(client: Client | null): ClientDetailsData {
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchCommunications = async () => {
    if (!client?.id) return;
    
    try {
      const response = await fetch(`/api/communications?clientId=${client.id}`);
      if (!response.ok) throw new Error('Failed to fetch communications');
      
      const { data } = await response.json();
      // Map communication_date to date for frontend compatibility
      const mappedData = (data || []).map((comm: any) => ({
        ...comm,
        date: comm.communication_date || comm.date
      }));
      setCommunications(mappedData);
    } catch (err) {
      console.error('Error fetching communications:', err);
      setError('Failed to load communications');
    }
  };

  const fetchReviews = async () => {
    if (!client?.id) return;
    
    try {
      const response = await fetch(`/api/reviews?clientId=${client.id}`);
      if (!response.ok) throw new Error('Failed to fetch reviews');
      
      const { data } = await response.json();
      setReviews(data || []);
    } catch (err) {
      console.error('Error fetching reviews:', err);
      setError('Failed to load reviews');
    }
  };

  const fetchActivities = async () => {
    if (!client?.id) return;
    
    try {
      const response = await fetch(`/api/activity-log?clientId=${client.id}&limit=20`);
      if (!response.ok) throw new Error('Failed to fetch activities');
      
      const { data } = await response.json();
      setActivities(data || []);
    } catch (err) {
      console.error('Error fetching activities:', err);
      setError('Failed to load activities');
    }
  };

  const fetchAllData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await Promise.all([
        fetchCommunications(),
        fetchReviews(),
        fetchActivities()
      ]);
    } catch (err) {
      console.error('Error fetching client data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (client?.id) {
      fetchAllData();
    }
  }, [client?.id]);

  const refresh = async () => {
    await fetchAllData();
  };

  return {
    communications,
    reviews,
    activities,
    loading,
    error,
    refresh
  };
}

// Helper function to create a new communication
export async function createCommunication(data: {
  clientId: string;
  type: 'email' | 'call' | 'meeting' | 'note';
  subject: string;
  content?: string;
  date?: string;
  status?: 'completed' | 'pending';
}) {
  try {
    const response = await fetch('/api/communications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) throw new Error('Failed to create communication');
    
    return await response.json();
  } catch (error) {
    console.error('Error creating communication:', error);
    throw error;
  }
}

// Helper function to create a new review
export async function scheduleReview(data: {
  clientId: string;
  reviewType: string;
  dueDate: string;
  reviewSummary?: string;
  recommendations?: any;
  nextReviewDate?: string;
}) {
  try {
    const response = await fetch('/api/reviews', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    if (!response.ok) throw new Error('Failed to schedule review');
    
    return await response.json();
  } catch (error) {
    console.error('Error scheduling review:', error);
    throw error;
  }
}

// Helper function to update review status
export async function updateReviewStatus(reviewId: string, updates: {
  status?: 'completed' | 'cancelled';
  review_summary?: string;
  changes_made?: any;
  recommendations?: any;
  completed_date?: string;
}) {
  try {
    const response = await fetch('/api/reviews', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: reviewId, ...updates })
    });

    if (!response.ok) throw new Error('Failed to update review');
    
    return await response.json();
  } catch (error) {
    console.error('Error updating review:', error);
    throw error;
  }
}
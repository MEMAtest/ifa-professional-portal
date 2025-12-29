import type { ElementType } from 'react';

export type TabType = 'overview' | 'messages' | 'calls' | 'calendar' | 'follow-ups';

export interface CommunicationItem {
  id: string;
  client_id: string | null;
  client_name: string;
  client_ref: string;
  communication_type: string;
  subject: string;
  summary: string;
  communication_date: string;
  direction: string;
  contact_method: string;
  requires_followup: boolean;
  followup_date?: string | null;
  followup_completed: boolean;
  created_at: string | null;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  clientName: string;
  clientId: string;
  type: string;
  duration: number;
  notes: string;
  color?: string;
  eventType?: string;
}

export interface CommunicationClient {
  id: string;
  client_ref: string;
  personal_details: {
    firstName: string;
    lastName: string;
    title?: string;
  };
  contact_info: {
    email: string;
    phone: string;
  };
}

export interface CommunicationStats {
  totalCommunications: number;
  messages: number;
  calls: number;
  upcomingMeetings: number;
  followUpsNeeded: number;
  todayItems: number;
}

export interface MeetingTypeItem {
  value: string;
  label: string;
  icon: ElementType;
  color: string;
  hex: string;
}

import { Coffee, FileText, Phone, Users, Video } from 'lucide-react';
import type { MeetingTypeItem } from './types';

export const meetingTypes: MeetingTypeItem[] = [
  { value: 'initial_consultation', label: 'Initial Consultation', icon: Users, color: 'bg-blue-500', hex: '#3B82F6' },
  { value: 'review_meeting', label: 'Review Meeting', icon: FileText, color: 'bg-green-500', hex: '#10B981' },
  { value: 'phone_call', label: 'Phone Call', icon: Phone, color: 'bg-yellow-500', hex: '#F59E0B' },
  { value: 'video_call', label: 'Video Call', icon: Video, color: 'bg-purple-500', hex: '#8B5CF6' },
  { value: 'coffee_meeting', label: 'Coffee Meeting', icon: Coffee, color: 'bg-orange-500', hex: '#F97316' }
];

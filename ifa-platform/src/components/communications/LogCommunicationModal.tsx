// src/components/communications/LogCommunicationModal.tsx
// Complete working example - ready to use!

'use client';

import React, { useState } from 'react';
import { X, Send, Phone, Mail, Calendar, FileText } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { useToast } from '@/components/ui/use-toast';

interface LogCommunicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  onSuccess?: () => void;
}

export function LogCommunicationModal({
  isOpen,
  onClose,
  clientId,
  clientName,
  onSuccess
}: LogCommunicationModalProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    type: 'email',
    subject: '',
    content: '',
    direction: 'outbound',
    contactMethod: 'email',
    requiresFollowup: false,
    followupDate: ''
  });

  // Reset form when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setFormData({
        type: 'email',
        subject: '',
        content: '',
        direction: 'outbound',
        contactMethod: 'email',
        requiresFollowup: false,
        followupDate: ''
      });
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.subject.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a subject',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/communications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          type: formData.type,
          subject: formData.subject,
          content: formData.content,
          direction: formData.direction,
          contactMethod: formData.contactMethod,
          requiresFollowup: formData.requiresFollowup,
          followupDate: formData.requiresFollowup ? formData.followupDate : null
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast({
          title: 'Success',
          description: 'Communication logged successfully',
          variant: 'default'
        });
        
        onSuccess?.();
        onClose();
      } else {
        throw new Error(data.error || 'Failed to log communication');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to log communication',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Log Communication
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Record interaction with {clientName}
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Type and Direction Row */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="email">📧 Email</option>
                  <option value="phone">📞 Phone Call</option>
                  <option value="meeting">👥 Meeting</option>
                  <option value="note">📝 Note</option>
                </select>
              </div>

              <div>
                <Label>Direction</Label>
                <select
                  value={formData.direction}
                  onChange={(e) => setFormData({ ...formData, direction: e.target.value })}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="outbound">↗️ Outbound (to client)</option>
                  <option value="inbound">↘️ Inbound (from client)</option>
                </select>
              </div>
            </div>

            {/* Subject */}
            <div>
              <Label>Subject *</Label>
              <Input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="Brief description of the communication"
                required
              />
            </div>

            {/* Content */}
            <div>
              <Label>Details</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Add any notes or details about this communication..."
                rows={4}
              />
            </div>

            {/* Contact Method */}
            <div>
              <Label>Contact Method</Label>
              <select
                value={formData.contactMethod}
                onChange={(e) => setFormData({ ...formData, contactMethod: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="email">Email</option>
                <option value="phone">Phone</option>
                <option value="video">Video Call</option>
                <option value="in_person">In Person</option>
                <option value="secure_message">Secure Message</option>
              </select>
            </div>

            {/* Follow-up Section */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="requires-followup"
                  checked={formData.requiresFollowup}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    requiresFollowup: e.target.checked 
                  })}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="requires-followup" className="cursor-pointer">
                  Requires follow-up
                </Label>
              </div>

              {formData.requiresFollowup && (
                <div className="mt-3">
                  <Label>Follow-up Date</Label>
                  <Input
                    type="date"
                    value={formData.followupDate}
                    onChange={(e) => setFormData({ 
                      ...formData, 
                      followupDate: e.target.value 
                    })}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              )}
            </div>
          </form>

          {/* Footer */}
          <div className="flex items-center justify-end space-x-3 px-6 py-4 bg-gray-50 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Log Communication</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

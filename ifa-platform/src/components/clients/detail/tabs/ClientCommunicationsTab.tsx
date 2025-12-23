'use client'

import React from 'react'
import { Calendar, FileText, Mail, MessageSquare, Phone, Plus } from 'lucide-react'

import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { formatDate } from '@/lib/utils'

export function ClientCommunicationsTab(props: {
  communications: any[] | null | undefined
  dataLoading: boolean
  dataError: any
  onAddCommunication: () => void
}) {
  const { communications, dataLoading, dataError, onAddCommunication } = props

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Communication History
          </CardTitle>
          <Button onClick={onAddCommunication} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Communication
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {dataLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : dataError ? (
          <div className="text-center text-red-600 py-8">{dataError}</div>
        ) : (
          <div className="space-y-4">
            {communications && communications.length > 0 ? (
              communications.map((comm: any) => (
                <div key={comm.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div
                      className={`p-2 rounded-lg ${
                        comm.type === 'email'
                          ? 'bg-blue-100'
                          : comm.type === 'call'
                            ? 'bg-green-100'
                            : comm.type === 'meeting'
                              ? 'bg-purple-100'
                              : 'bg-gray-100'
                      }`}
                    >
                      {comm.type === 'email' && <Mail className="h-5 w-5 text-blue-600" />}
                      {comm.type === 'call' && <Phone className="h-5 w-5 text-green-600" />}
                      {comm.type === 'meeting' && <Calendar className="h-5 w-5 text-purple-600" />}
                      {comm.type === 'note' && <FileText className="h-5 w-5 text-gray-600" />}
                    </div>
                    <div>
                      <p className="font-medium">{comm.subject}</p>
                      <p className="text-sm text-gray-500">{formatDate(comm.date)}</p>
                      {comm.content && <p className="text-sm text-gray-600 mt-1 line-clamp-2">{comm.content}</p>}
                    </div>
                  </div>
                  <Badge variant={comm.status === 'completed' ? 'default' : 'secondary'}>{comm.status}</Badge>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-4">No communications recorded</p>
                <Button onClick={onAddCommunication}>Log First Communication</Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}


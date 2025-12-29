import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Calendar, FileText, Mail, Phone } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface Communication {
  id: string;
  type: 'email' | 'call' | 'meeting' | 'note';
  subject: string;
  date: string;
  status: 'completed' | 'pending' | 'cancelled';
  content?: string;
}

interface CommunicationsTabProps {
  communications: Communication[];
  dataLoading: boolean;
  dataError: string | null;
  onAddCommunication: () => void;
}

export function CommunicationsTab({
  communications,
  dataLoading,
  dataError,
  onAddCommunication
}: CommunicationsTabProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Communication History</CardTitle>
            <Button onClick={onAddCommunication} size="sm">
              Add Communication
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {dataLoading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : dataError ? (
            <div className="text-center text-red-600 py-8">{dataError}</div>
          ) : (
            <div className="space-y-4">
              {communications.map((comm) => (
                <div key={comm.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
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
                      {comm.content && <p className="text-sm text-gray-600 mt-1">{comm.content}</p>}
                    </div>
                  </div>
                  <Badge variant={comm.status === 'completed' ? 'default' : 'secondary'}>
                    {comm.status}
                  </Badge>
                </div>
              ))}
              {communications.length === 0 && (
                <p className="text-center text-gray-500 py-8">No communications recorded</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

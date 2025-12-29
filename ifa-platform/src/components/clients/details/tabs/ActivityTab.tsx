import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Activity } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface ActivityItem {
  id: string;
  action: string;
  user_name?: string;
  date: string;
  type?: string;
}

interface ActivityTabProps {
  activities: ActivityItem[];
  dataLoading: boolean;
}

export function ActivityTab({ activities, dataLoading }: ActivityTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Log</CardTitle>
      </CardHeader>
      <CardContent>
        {dataLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-4 p-4 border rounded-lg">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Activity className="h-5 w-5 text-gray-600" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">
                        {activity.action
                          .replace(/_/g, ' ')
                          .replace(/\b\w/g, (match) => match.toUpperCase())}
                      </p>
                      {activity.type && (
                        <p className="text-sm text-gray-600">Type: {activity.type}</p>
                      )}
                    </div>
                    <span className="text-sm text-gray-500">{formatDate(activity.date)}</span>
                  </div>
                  {activity.user_name && (
                    <p className="text-sm text-gray-500 mt-1">by {activity.user_name}</p>
                  )}
                </div>
              </div>
            ))}
            {activities.length === 0 && (
              <p className="text-center text-gray-500 py-8">No activity recorded</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

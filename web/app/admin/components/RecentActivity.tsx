import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Vote, Shield, MessageSquare } from 'lucide-react';

interface Activity {
  id: string;
  action: string;
  user?: string;
  timestamp: string;
}

interface RecentActivityProps {
  activities: Activity[];
}

export function RecentActivity({ activities }: RecentActivityProps) {
  const getActivityIcon = (action: string) => {
    if (action.toLowerCase().includes('voter')) return <Users className="w-4 h-4 text-blue-600" />;
    if (action.toLowerCase().includes('vote')) return <Vote className="w-4 h-4 text-green-600" />;
    if (action.toLowerCase().includes('election')) return <Shield className="w-4 h-4 text-purple-600" />;
    return <MessageSquare className="w-4 h-4 text-orange-600" />;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
        <CardDescription>Latest system events and user actions</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.length > 0 ? (
            activities.map((activity) => (
              <div key={activity.id} className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                  {getActivityIcon(activity.action)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                  <p className="text-sm text-gray-500">
                    {activity.user || 'System'} • {new Date(activity.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500 text-center py-4">
              No recent activity to display
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

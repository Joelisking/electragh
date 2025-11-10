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
    if (action.toLowerCase().includes('vote')) return <Vote className="w-4 h-4 text-electra-primary" />;
    if (action.toLowerCase().includes('election')) return <Shield className="w-4 h-4 text-purple-600" />;
    return <MessageSquare className="w-4 h-4 text-orange-600" />;
  };

  const getActivityBackground = (action: string) => {
    if (action.toLowerCase().includes('voter')) return 'bg-blue-100';
    if (action.toLowerCase().includes('vote')) return 'bg-electra-primary-light/50';
    if (action.toLowerCase().includes('election')) return 'bg-purple-100';
    return 'bg-orange-100';
  };

  return (
    <Card className="bg-gradient-to-br from-white to-gray-50/50 shadow-lg border-gray-200/70 hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="bg-gradient-to-r from-electra-primary/5 to-electra-secondary/5 border-b border-gray-100">
        <CardTitle className="text-lg font-semibold text-gray-800">Recent Activity</CardTitle>
        <CardDescription className="text-gray-600">Latest system events and user actions</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="space-y-5 max-h-[500px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          {activities.length > 0 ? (
            activities.map((activity) => (
              <div key={activity.id} className="flex items-center space-x-4 p-3 rounded-lg bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 hover:border-electra-primary/30">
                <div className={`w-10 h-10 ${getActivityBackground(activity.action)} rounded-xl flex items-center justify-center shadow-sm`}>
                  {getActivityIcon(activity.action)}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">{activity.action}</p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    <span className="font-medium">{activity.user || 'System'}</span> • {new Date(activity.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                <MessageSquare className="w-6 h-6 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">
                No recent activity to display
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, MessageSquare } from 'lucide-react';

interface SmsStats {
  [key: string]: number;
}

interface SystemStatusProps {
  smsStats: SmsStats;
}

export function SystemStatus({ smsStats }: SystemStatusProps) {
  const totalMessages = Object.values(smsStats).reduce((total, count) => total + count, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>System Status</CardTitle>
        <CardDescription>Current system health and alerts</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm">Election System</span>
            </div>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              Operational
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-sm">SMS Service</span>
            </div>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              Active
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-4 h-4 text-blue-600" />
              <span className="text-sm">SMS Messages</span>
            </div>
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              {totalMessages.toLocaleString()} sent
            </Badge>
          </div>

          {Object.entries(smsStats).map(([status, count]) => (
            <div key={status} className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div
                  className={`w-2 h-2 rounded-full ${
                    status === 'SENT' ? 'bg-green-500' :
                    status === 'FAILED' ? 'bg-red-500' :
                    'bg-yellow-500'
                  }`}
                />
                <span className="text-sm capitalize">{status.toLowerCase()}</span>
              </div>
              <Badge variant="secondary">{count}</Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

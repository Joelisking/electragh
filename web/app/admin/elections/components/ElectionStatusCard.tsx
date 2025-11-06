import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Settings, Clock, Play, Pause, Square } from 'lucide-react';
import { ElectionControls } from './ElectionControls';
import { VisibilitySelector } from './VisibilitySelector';

interface Election {
  id: string;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string;
  timezone: string;
  status: string;
  visibility: string;
  allowAbstain: boolean;
}

interface ElectionStatusCardProps {
  election: Election;
  onStatusChange: (action: string) => Promise<void>;
  onVisibilityChange: (visibility: string) => Promise<void>;
  onReset: () => Promise<void>;
}

const statusColors = {
  DRAFT: 'bg-gray-100 text-gray-800',
  SCHEDULED: 'bg-blue-100 text-blue-800',
  ACTIVE: 'bg-green-100 text-green-800',
  PAUSED: 'bg-yellow-100 text-yellow-800',
  ENDED: 'bg-red-100 text-red-800',
};

const statusIcons = {
  DRAFT: Settings,
  SCHEDULED: Clock,
  ACTIVE: Play,
  PAUSED: Pause,
  ENDED: Square,
};

export function ElectionStatusCard({
  election,
  onStatusChange,
  onVisibilityChange,
  onReset,
}: ElectionStatusCardProps) {
  const getStatusIcon = (status: string) => {
    const Icon = statusIcons[status as keyof typeof statusIcons] || Settings;
    return <Icon className="w-4 h-4" />;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
      timeZone: election.timezone,
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-2xl">{election.title}</CardTitle>
            <CardDescription className="text-base mt-2">
              {election.description || 'No description provided'}
            </CardDescription>
          </div>
          <Badge className={`${statusColors[election.status as keyof typeof statusColors]} border-0`}>
            {getStatusIcon(election.status)}
            <span className="ml-1 capitalize">{election.status.toLowerCase()}</span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Schedule and Settings */}
          <div className="space-y-4">
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Schedule</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">Start:</span>
                  <span className="font-medium">{formatDate(election.startAt)}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-600">End:</span>
                  <span className="font-medium">{formatDate(election.endAt)}</span>
                </div>
              </div>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Settings</h4>
              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <span className="text-gray-600">Timezone:</span>
                  <span className="font-medium">{election.timezone}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-gray-600">Results:</span>
                  <VisibilitySelector
                    value={election.visibility}
                    onChange={onVisibilityChange}
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-gray-600">Allow Abstain:</span>
                  <Badge variant="outline">{election.allowAbstain ? 'Yes' : 'No'}</Badge>
                </div>
              </div>
            </div>
          </div>

          {/* Election Controls */}
          <ElectionControls
            status={election.status}
            onStatusChange={onStatusChange}
            onReset={onReset}
          />
        </div>
      </CardContent>
    </Card>
  );
}

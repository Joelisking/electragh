import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Calendar,
  Settings,
  Clock,
  Play,
  Pause,
  Square,
  Paperclip,
} from 'lucide-react';
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
  ACTIVE:
    'bg-electra-primary-light/50 text-electra-secondary border border-electra-primary/30',
  PAUSED: 'bg-yellow-100 text-yellow-800',
  ENDED: 'bg-red-100 text-red-800',
};

const statusIcons = {
  DRAFT: Paperclip,
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
    const Icon =
      statusIcons[status as keyof typeof statusIcons] || Settings;
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
    <Card className="bg-gradient-to-br from-white to-gray-50/50 shadow-lg border-electra-primary/10 hover:shadow-xl transition-all duration-300">
      <CardHeader className="bg-gradient-to-r from-electra-primary/5 to-electra-secondary/5 rounded-t-lg">
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-2xl text-electra-secondary">
              {election.title}
            </CardTitle>
            <CardDescription className="text-base mt-2 text-gray-600">
              {election.description || 'No description provided'}
            </CardDescription>
          </div>
          <Badge
            className={`${
              statusColors[
                election.status as keyof typeof statusColors
              ]
            } shadow-md hover:shadow-lg transition-all duration-200`}>
            {getStatusIcon(election.status)}
            <span className="ml-1 capitalize font-medium">
              {election.status.toLowerCase()}
            </span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Schedule and Settings */}
          <div className="space-y-6">
            <div className="p-4 bg-gradient-to-br from-blue-50/50 to-blue-100/30 rounded-xl border border-blue-200/20">
              <h4 className="font-semibold text-electra-secondary mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-electra-primary" />
                Schedule
              </h4>
              <div className="space-y-3 text-sm">
                <div className="flex items-center space-x-3 p-2 bg-white/60 rounded-lg">
                  <Calendar className="w-4 h-4 text-electra-primary" />
                  <span className="text-gray-600 font-medium">
                    Start:
                  </span>
                  <span className="font-semibold text-gray-800">
                    {formatDate(election.startAt)}
                  </span>
                </div>
                <div className="flex items-center space-x-3 p-2 bg-white/60 rounded-lg">
                  <Calendar className="w-4 h-4 text-electra-primary" />
                  <span className="text-gray-600 font-medium">
                    End:
                  </span>
                  <span className="font-semibold text-gray-800">
                    {formatDate(election.endAt)}
                  </span>
                </div>
              </div>
            </div>
            <div className="p-4 bg-gradient-to-br from-electra-primary/5 to-electra-secondary/5 rounded-xl border border-electra-primary/10">
              <h4 className="font-semibold text-electra-secondary mb-3 flex items-center gap-2">
                <Settings className="w-4 h-4 text-electra-primary" />
                Settings
              </h4>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between p-2 bg-white/60 rounded-lg">
                  <span className="text-gray-600 font-medium">
                    Timezone:
                  </span>
                  <span className="font-semibold text-electra-primary">
                    {election.timezone}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 bg-white/60 rounded-lg">
                  <span className="text-gray-600 font-medium">
                    Results:
                  </span>
                  <VisibilitySelector
                    value={election.visibility}
                    onChange={onVisibilityChange}
                  />
                </div>
                <div className="flex items-center justify-between p-2 bg-white/60 rounded-lg">
                  <span className="text-gray-600 font-medium">
                    Allow Abstain:
                  </span>
                  <Badge
                    variant="outline"
                    className="border-electra-primary/30 text-electra-primary hover:bg-electra-primary/10 transition-colors duration-200">
                    {election.allowAbstain ? 'Yes' : 'No'}
                  </Badge>
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

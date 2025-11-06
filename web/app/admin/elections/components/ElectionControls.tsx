import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Play, Pause, Square, RefreshCcw } from 'lucide-react';

interface ElectionControlsProps {
  status: string;
  onStatusChange: (action: string) => Promise<void>;
  onReset: () => Promise<void>;
}

export function ElectionControls({ status, onStatusChange, onReset }: ElectionControlsProps) {
  const canStart = status === 'SCHEDULED' || status === 'DRAFT';
  const canPause = status === 'ACTIVE';
  const canResume = status === 'PAUSED';
  const canEnd = status === 'ACTIVE' || status === 'PAUSED';
  const canReset = status !== 'ACTIVE';

  return (
    <div className="space-y-4">
      <h4 className="font-medium text-gray-900">Election Controls</h4>
      <div className="flex flex-wrap gap-2">
        {/* Start Election */}
        {canStart && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700">
                <Play className="w-4 h-4 mr-2" />
                Start Election
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Start Election</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to start the election? Once started, voters will be able to cast their votes.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onStatusChange('start')}>
                  Start Election
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {/* Pause Election */}
        {canPause && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline">
                <Pause className="w-4 h-4 mr-2" />
                Pause
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Pause Election</AlertDialogTitle>
                <AlertDialogDescription>
                  Temporarily pause the election. Voters will not be able to vote while paused.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onStatusChange('pause')}>
                  Pause Election
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {/* Resume Election */}
        {canResume && (
          <Button
            className="bg-green-600 hover:bg-green-700"
            onClick={() => onStatusChange('resume')}
          >
            <Play className="w-4 h-4 mr-2" />
            Resume
          </Button>
        )}

        {/* End Election */}
        {canEnd && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Square className="w-4 h-4 mr-2" />
                End Election
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>End Election</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to end the election? This action cannot be undone and will finalize all results.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onStatusChange('end')}>
                  End Election
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {/* Reset Election */}
        {canReset && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="border-orange-500 text-orange-600 hover:bg-orange-50">
                <RefreshCcw className="w-4 h-4 mr-2" />
                Reset for New Cycle
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset Election</AlertDialogTitle>
                <AlertDialogDescription>
                  This will archive all votes and reset voter statuses. Use this to prepare for a new election cycle. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onReset} className="bg-orange-600 hover:bg-orange-700">
                  Reset Election
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
    </div>
  );
}

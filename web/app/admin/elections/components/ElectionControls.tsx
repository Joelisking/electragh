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

export function ElectionControls({
  status,
  onStatusChange,
  onReset,
}: ElectionControlsProps) {
  const canStart = status === 'SCHEDULED' || status === 'DRAFT';
  const canPause = status === 'ACTIVE';
  const canResume = status === 'PAUSED';
  const canEnd = status === 'ACTIVE' || status === 'PAUSED';
  const canReset = status !== 'ACTIVE';

  return (
    <div className="space-y-6 p-4 bg-gradient-to-br from-gray-50/50 to-white rounded-xl border border-gray-200/50">
      <h4 className="font-semibold text-electra-secondary flex items-center gap-2">
        <div className="w-2 h-2 bg-electra-primary rounded-full"></div>
        Election Controls
      </h4>
      <div className="flex flex-wrap gap-3">
        {/* Start Election */}
        {canStart && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button className="bg-primary shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                <Play className="w-4 h-4 mr-2" />
                Start Election
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Start Election</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to start the election? Once
                  started, voters will be able to cast their votes.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onStatusChange('start')}>
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
              <Button
                variant="outline"
                className="border-2 border-electra-primary/30 text-electra-primary hover:bg-electra-primary/10 hover:border-electra-primary shadow-md hover:shadow-lg transition-all duration-300">
                <Pause className="w-4 h-4 mr-2" />
                Pause
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Pause Election</AlertDialogTitle>
                <AlertDialogDescription>
                  Temporarily pause the election. Voters will not be
                  able to vote while paused.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onStatusChange('pause')}>
                  Pause Election
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}

        {/* Resume Election */}
        {canResume && (
          <Button
            className="bg-gradient-to-r from-electra-primary to-electra-secondary hover:from-electra-secondary hover:to-electra-primary shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
            onClick={() => onStatusChange('resume')}>
            <Play className="w-4 h-4 mr-2" />
            Resume
          </Button>
        )}

        {/* End Election */}
        {canEnd && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                className="shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105">
                <Square className="w-4 h-4 mr-2" />
                End Election
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>End Election</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to end the election? This
                  action cannot be undone and will finalize all
                  results.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onStatusChange('end')}>
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
              <Button
                variant="outline"
                className="border-2 border-orange-500/60 hover:text-orange-600 text-orange-600 hover:bg-white hover:border-orange-500 shadow-md hover:shadow-lg transition-all duration-300 transform hover:scale-105">
                <RefreshCcw className="w-4 h-4 mr-2" />
                Reset for New Cycle
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset Election</AlertDialogTitle>
                <AlertDialogDescription>
                  This will archive all votes and reset voter
                  statuses. Use this to prepare for a new election
                  cycle. This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={onReset}
                  className="bg-gradient-to-r from-orange-600 to-orange-700 hover:from-orange-700 hover:to-orange-800 shadow-md hover:shadow-lg transition-all duration-300">
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

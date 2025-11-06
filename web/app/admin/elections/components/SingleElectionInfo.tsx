import { Card, CardContent } from '@/components/ui/card';
import { Settings } from 'lucide-react';

export function SingleElectionInfo() {
  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardContent className="p-4">
        <div className="flex items-start space-x-3">
          <Settings className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-semibold text-blue-900 mb-1">Single Election System</h4>
            <p className="text-sm text-blue-700">
              This is a permanent single election system. You can manage candidates, voters, and settings,
              but cannot create or delete elections. Use the "Reset for New Cycle" button to prepare for a new election period.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

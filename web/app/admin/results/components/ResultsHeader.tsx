import { Button } from '@/components/ui/button';
import { RefreshCw, Download } from 'lucide-react';

interface ResultsHeaderProps {
  onRefresh: () => void;
  onExport: () => void;
  isRefreshing: boolean;
}

export function ResultsHeader({ onRefresh, onExport, isRefreshing }: ResultsHeaderProps) {
  return (
    <div className="flex justify-between items-start">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Election Results</h1>
        <p className="text-gray-600 mt-1">Real-time voting results and analytics</p>
      </div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={onRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
        <Button onClick={onExport}>
          <Download className="w-4 h-4 mr-2" />
          Export Results
        </Button>
      </div>
    </div>
  );
}

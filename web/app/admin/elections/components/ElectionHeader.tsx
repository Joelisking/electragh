import { Button } from '@/components/ui/button';
import { Edit } from 'lucide-react';

interface ElectionHeaderProps {
  onEdit: () => void;
}

export function ElectionHeader({ onEdit }: ElectionHeaderProps) {
  return (
    <div className="flex justify-between items-center">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Election Control</h1>
        <p className="text-gray-600">Manage the single permanent election system</p>
      </div>
      <Button variant="outline" onClick={onEdit}>
        <Edit className="w-4 h-4 mr-2" />
        Edit Settings
      </Button>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Election {
  title: string;
  description: string | null;
  startAt: string;
  endAt: string;
  status: string;
}

interface EditElectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  election: Election;
  onSave: (data: {
    title: string;
    description: string;
    startAt: string;
    endAt: string;
  }) => Promise<void>;
}

export function EditElectionDialog({
  open,
  onOpenChange,
  election,
  onSave,
}: EditElectionDialogProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startAt: '',
    endAt: '',
  });

  useEffect(() => {
    if (election) {
      setFormData({
        title: election.title,
        description: election.description || '',
        startAt: election.startAt.split('.')[0],
        endAt: election.endAt.split('.')[0],
      });
    }
  }, [election]);

  const handleSave = async () => {
    await onSave(formData);
  };

  const isDateLocked = ['ACTIVE', 'ENDED'].includes(election.status);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit Election Settings</DialogTitle>
          <DialogDescription>
            Modify election configuration. Dates cannot be changed after election becomes active.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Election Title</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startAt">Start Date & Time</Label>
              <Input
                id="startAt"
                type="datetime-local"
                value={formData.startAt}
                onChange={(e) => setFormData({ ...formData, startAt: e.target.value })}
                disabled={isDateLocked}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endAt">End Date & Time</Label>
              <Input
                id="endAt"
                type="datetime-local"
                value={formData.endAt}
                onChange={(e) => setFormData({ ...formData, endAt: e.target.value })}
                disabled={isDateLocked}
              />
            </div>
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

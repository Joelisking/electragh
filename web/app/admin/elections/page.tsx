'use client';

import { useState, useEffect } from 'react';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import apiClient from '@/lib/api-client';
import { ElectionHeader } from './components/ElectionHeader';
import { ElectionStatusCard } from './components/ElectionStatusCard';
import { ElectionStats } from './components/ElectionStats';
import { EditElectionDialog } from './components/EditElectionDialog';
import { SingleElectionInfo } from './components/SingleElectionInfo';

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
  positions: any[];
  _count: {
    ballots: number;
  };
}

export default function ElectionsPage() {
  const [election, setElection] = useState<Election | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  useEffect(() => {
    loadElection();
  }, []);

  const loadElection = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/election');
      setElection(response.data);
    } catch (error: any) {
      console.error('Failed to load election:', error);
      toast.error('Failed to load election data');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (action: string) => {
    if (!election) return;

    try {
      await apiClient.post(`/api/election/${action}`);
      toast.success(`Election ${action}ed successfully`);
      await loadElection();
    } catch (error: any) {
      toast.error(error.response?.data?.message || `Failed to ${action} election`);
    }
  };

  const handleSaveElection = async (data: {
    title: string;
    description: string;
    startAt: string;
    endAt: string;
  }) => {
    try {
      await apiClient.patch('/api/election/settings', {
        title: data.title,
        description: data.description,
        startAt: new Date(data.startAt).toISOString(),
        endAt: new Date(data.endAt).toISOString(),
      });

      toast.success('Election settings updated successfully');
      setIsEditDialogOpen(false);
      await loadElection();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update election');
    }
  };

  const handleVisibilityChange = async (visibility: string) => {
    try {
      await apiClient.patch('/api/election/visibility', { visibility });
      toast.success('Election visibility updated');
      await loadElection();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update visibility');
    }
  };

  const handleResetElection = async () => {
    try {
      await apiClient.post('/api/election/reset');
      toast.success('Election reset successfully. Ready for new cycle.');
      await loadElection();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to reset election');
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-blue-600" />
          <p className="text-gray-600">Loading election data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (!election) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-600" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Failed to Load Election</h2>
        <p className="text-gray-600 mb-4">Unable to load election data.</p>
        <Button onClick={loadElection}>Retry</Button>
      </div>
    );
  }

  const totalCandidates = election.positions.reduce(
    (sum, position) => sum + (position.candidates?.length || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <ElectionHeader onEdit={() => setIsEditDialogOpen(true)} />

      {/* Status Card */}
      <ElectionStatusCard
        election={election}
        onStatusChange={handleStatusChange}
        onVisibilityChange={handleVisibilityChange}
        onReset={handleResetElection}
      />

      {/* Stats */}
      <ElectionStats
        positionsCount={election.positions.length}
        candidatesCount={totalCandidates}
        votesCount={election._count.ballots}
      />

      {/* Info Alert */}
      <SingleElectionInfo />

      {/* Edit Dialog */}
      <EditElectionDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        election={election}
        onSave={handleSaveElection}
      />
    </div>
  );
}

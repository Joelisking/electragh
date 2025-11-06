'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Settings,
  Vote,
  Eye,
  EyeOff,
  Play,
  Pause,
  Square,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

export default function SettingsPage() {
  const [loading, setLoading] = useState(false);
  const [election, setElection] = useState<any>(null);
  const [updating, setUpdating] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [visibility, setVisibility] = useState('RESTRICTED');

  useEffect(() => {
    fetchElection();
  }, []);

  const fetchElection = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('admin-token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/election`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setElection(data);
        setTitle(data.title || '');
        setDescription(data.description || '');
        setStartDate(data.startAt ? new Date(data.startAt).toISOString().slice(0, 16) : '');
        setEndDate(data.endAt ? new Date(data.endAt).toISOString().slice(0, 16) : '');
        setVisibility(data.visibility || 'RESTRICTED');
      } else {
        toast.error('Failed to load election details');
      }
    } catch (error) {
      console.error('Error fetching election:', error);
      toast.error('Error loading election details');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSettings = async () => {
    setUpdating(true);
    try {
      const token = localStorage.getItem('admin-token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/election/settings`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          description,
          startAt: startDate ? new Date(startDate).toISOString() : undefined,
          endAt: endDate ? new Date(endDate).toISOString() : undefined,
        }),
      });

      if (response.ok) {
        toast.success('Election settings updated successfully');
        fetchElection();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to update settings');
      }
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('Error updating settings');
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateVisibility = async (newVisibility: string) => {
    try {
      const token = localStorage.getItem('admin-token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/election/visibility`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ visibility: newVisibility }),
      });

      if (response.ok) {
        toast.success('Visibility updated successfully');
        fetchElection();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to update visibility');
      }
    } catch (error) {
      console.error('Error updating visibility:', error);
      toast.error('Error updating visibility');
    }
  };

  const handleStateAction = async (action: 'start' | 'pause' | 'resume' | 'end' | 'reset') => {
    const confirmMessages = {
      start: 'Start the election? Voters will be able to cast their votes.',
      pause: 'Pause the election? Voting will be temporarily suspended.',
      resume: 'Resume the election? Voting will continue.',
      end: 'End the election? This will close voting permanently.',
      reset: 'Reset the election? This will clear all votes and prepare for a new election cycle. This action cannot be undone!',
    };

    if (!confirm(confirmMessages[action])) {
      return;
    }

    try {
      const token = localStorage.getItem('admin-token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'}/api/election/${action}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        toast.success(data.message);
        fetchElection();
      } else {
        const error = await response.json();
        toast.error(error.message || `Failed to ${action} election`);
      }
    } catch (error) {
      console.error(`Error ${action}ing election:`, error);
      toast.error(`Error ${action}ing election`);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      DRAFT: { color: 'bg-gray-100 text-gray-800', icon: Clock },
      SCHEDULED: { color: 'bg-blue-100 text-blue-800', icon: Clock },
      ACTIVE: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      PAUSED: { color: 'bg-yellow-100 text-yellow-800', icon: Pause },
      ENDED: { color: 'bg-red-100 text-red-800', icon: Square },
      ARCHIVED: { color: 'bg-gray-100 text-gray-800', icon: Clock },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.DRAFT;
    const Icon = config.icon;

    return (
      <Badge className={`${config.color} border-0`}>
        <Icon className="w-3 h-3 mr-1" />
        {status}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-blue-600" />
          <p className="text-gray-600">Loading election settings...</p>
        </div>
      </div>
    );
  }

  if (!election) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-600" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Failed to Load Election
        </h2>
        <p className="text-gray-600">
          Unable to load election details. Please try again later.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Election Settings</h1>
          <p className="text-gray-600">Manage election configuration and state</p>
        </div>
        <div className="flex items-center space-x-3">
          {getStatusBadge(election.status)}
        </div>
      </div>

      {/* Election State Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Vote className="w-5 h-5 mr-2" />
            Election State Controls
          </CardTitle>
          <CardDescription>
            Control the election status and lifecycle
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Button
              onClick={() => handleStateAction('start')}
              disabled={election.status === 'ACTIVE' || election.status === 'ENDED'}
              className="bg-green-600 hover:bg-green-700"
            >
              <Play className="w-4 h-4 mr-2" />
              Start
            </Button>
            <Button
              onClick={() => handleStateAction('pause')}
              disabled={election.status !== 'ACTIVE'}
              variant="outline"
            >
              <Pause className="w-4 h-4 mr-2" />
              Pause
            </Button>
            <Button
              onClick={() => handleStateAction('resume')}
              disabled={election.status !== 'PAUSED'}
              variant="outline"
            >
              <Play className="w-4 h-4 mr-2" />
              Resume
            </Button>
            <Button
              onClick={() => handleStateAction('end')}
              disabled={election.status !== 'ACTIVE' && election.status !== 'PAUSED'}
              variant="outline"
              className="border-red-300 text-red-600 hover:bg-red-50"
            >
              <Square className="w-4 h-4 mr-2" />
              End
            </Button>
            <Button
              onClick={() => handleStateAction('reset')}
              disabled={election.status === 'ACTIVE'}
              variant="outline"
              className="border-orange-300 text-orange-600 hover:bg-orange-50"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Visibility Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Eye className="w-5 h-5 mr-2" />
            Results Visibility
          </CardTitle>
          <CardDescription>
            Control who can view election results
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                onClick={() => handleUpdateVisibility('RESTRICTED')}
                variant={visibility === 'RESTRICTED' ? 'default' : 'outline'}
                className="h-auto py-4 flex flex-col items-center space-y-2"
              >
                <EyeOff className="w-6 h-6" />
                <div className="text-center">
                  <div className="font-semibold">Restricted</div>
                  <div className="text-xs opacity-75">EC members only</div>
                </div>
              </Button>
              <Button
                onClick={() => handleUpdateVisibility('PUBLIC')}
                variant={visibility === 'PUBLIC' ? 'default' : 'outline'}
                className="h-auto py-4 flex flex-col items-center space-y-2"
              >
                <Eye className="w-6 h-6" />
                <div className="text-center">
                  <div className="font-semibold">Public</div>
                  <div className="text-xs opacity-75">Public after end</div>
                </div>
              </Button>
              <Button
                onClick={() => handleUpdateVisibility('LIVE_PUBLIC')}
                variant={visibility === 'LIVE_PUBLIC' ? 'default' : 'outline'}
                className="h-auto py-4 flex flex-col items-center space-y-2"
              >
                <Eye className="w-6 h-6" />
                <div className="text-center">
                  <div className="font-semibold">Live Public</div>
                  <div className="text-xs opacity-75">Public during voting</div>
                </div>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Election Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            Election Details
          </CardTitle>
          <CardDescription>
            Configure election information and schedule
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Election Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter election title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter election description"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date & Time</Label>
                <Input
                  id="startDate"
                  type="datetime-local"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={election.status === 'ACTIVE' || election.status === 'ENDED'}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">End Date & Time</Label>
                <Input
                  id="endDate"
                  type="datetime-local"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  disabled={election.status === 'ACTIVE' || election.status === 'ENDED'}
                />
              </div>
            </div>

            {election.status === 'ACTIVE' || election.status === 'ENDED' ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  Date changes are not allowed while the election is active or ended.
                </div>
              </div>
            ) : null}

            <div className="flex justify-end space-x-3">
              <Button variant="outline" onClick={fetchElection}>
                Cancel
              </Button>
              <Button onClick={handleUpdateSettings} disabled={updating}>
                {updating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Election Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Current Election Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600">
                {election.positions?.length || 0}
              </div>
              <div className="text-sm text-gray-600">Positions</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">
                {election.positions?.reduce((sum: number, p: any) => sum + (p.candidates?.length || 0), 0) || 0}
              </div>
              <div className="text-sm text-gray-600">Candidates</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600">
                {election._count?.ballots || 0}
              </div>
              <div className="text-sm text-gray-600">Votes Cast</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">
                {election.visibility}
              </div>
              <div className="text-sm text-gray-600">Visibility</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

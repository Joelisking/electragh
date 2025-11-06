'use client';

import { useState } from 'react';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import {
  Play,
  Pause,
  Square,
  Settings,
  Calendar,
  Clock,
  Users,
  Vote,
  AlertTriangle,
  CheckCircle,
  Edit,
  Plus,
} from 'lucide-react';

// Mock data - replace with real API calls
const mockElection = {
  id: '1',
  title: 'AGOSA Elections 2025',
  description: 'Annual General Meeting and Elections for AGOSA',
  startAt: '2025-11-29T00:01:00.000Z',
  endAt: '2025-11-30T23:59:00.000Z',
  timezone: 'Africa/Accra',
  status: 'SCHEDULED',
  resultVisibility: 'RESTRICTED',
  positions: 9,
  candidates: 18,
  voters: 1347,
  votescast: 0,
};

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

export default function ElectionsPage() {
  const [election, setElection] = useState(mockElection);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editedElection, setEditedElection] = useState({
    title: election.title,
    description: election.description,
    startAt: election.startAt.split('T')[0] + 'T' + election.startAt.split('T')[1].split('.')[0],
    endAt: election.endAt.split('T')[0] + 'T' + election.endAt.split('T')[1].split('.')[0],
    resultVisibility: election.resultVisibility,
  });

  const handleStatusChange = (newStatus: string) => {
    setElection({ ...election, status: newStatus });
  };

  const handleSaveElection = () => {
    setElection({
      ...election,
      ...editedElection,
      startAt: new Date(editedElection.startAt).toISOString(),
      endAt: new Date(editedElection.endAt).toISOString(),
    });
    setIsEditDialogOpen(false);
  };

  const getStatusIcon = (status: string) => {
    const Icon = statusIcons[status as keyof typeof statusIcons] || Settings;
    return <Icon className="w-4 h-4" />;
  };

  const canStart = election.status === 'SCHEDULED' || election.status === 'DRAFT';
  const canPause = election.status === 'ACTIVE';
  const canResume = election.status === 'PAUSED';
  const canEnd = election.status === 'ACTIVE' || election.status === 'PAUSED';

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Election Control</h1>
          <p className="text-gray-600">Manage election configuration and status</p>
        </div>
        <div className="flex space-x-2">
          <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Edit className="w-4 h-4 mr-2" />
                Edit Election
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Edit Election Details</DialogTitle>
                <DialogDescription>
                  Modify election configuration and settings
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Election Title</Label>
                  <Input
                    id="title"
                    value={editedElection.title}
                    onChange={(e) => setEditedElection({ ...editedElection, title: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={editedElection.description}
                    onChange={(e) => setEditedElection({ ...editedElection, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="startAt">Start Date & Time</Label>
                    <Input
                      id="startAt"
                      type="datetime-local"
                      value={editedElection.startAt}
                      onChange={(e) => setEditedElection({ ...editedElection, startAt: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="endAt">End Date & Time</Label>
                    <Input
                      id="endAt"
                      type="datetime-local"
                      value={editedElection.endAt}
                      onChange={(e) => setEditedElection({ ...editedElection, endAt: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="resultVisibility">Result Visibility</Label>
                  <Select value={editedElection.resultVisibility} onValueChange={(value) => setEditedElection({ ...editedElection, resultVisibility: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="RESTRICTED">EC Only (Restricted)</SelectItem>
                      <SelectItem value="PUBLIC">Public</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSaveElection}>
                    Save Changes
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Election Status Card */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-2xl">{election.title}</CardTitle>
              <CardDescription className="text-base mt-2">
                {election.description}
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
                    <Badge variant="outline" className="text-xs">
                      {election.resultVisibility === 'RESTRICTED' ? 'EC Only' : 'Public'}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-gray-900">Election Controls</h4>
              <div className="flex flex-wrap gap-2">
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
                        <AlertDialogAction onClick={() => handleStatusChange('ACTIVE')}>
                          Start Election
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}

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
                        <AlertDialogAction onClick={() => handleStatusChange('PAUSED')}>
                          Pause Election
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}

                {canResume && (
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => handleStatusChange('ACTIVE')}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Resume
                  </Button>
                )}

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
                        <AlertDialogAction onClick={() => handleStatusChange('ENDED')}>
                          End Election
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Positions</p>
                <p className="text-3xl font-bold text-gray-900">{election.positions}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Vote className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Candidates</p>
                <p className="text-3xl font-bold text-green-600">{election.candidates}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Registered Voters</p>
                <p className="text-3xl font-bold text-purple-600">{election.voters}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Votes Cast</p>
                <p className="text-3xl font-bold text-yellow-600">{election.votescast}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-sm text-gray-500">
                {election.voters > 0 ? `${((election.votescast / election.voters) * 100).toFixed(1)}% turnout` : '0% turnout'}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Status */}
      <Card>
        <CardHeader>
          <CardTitle>System Status</CardTitle>
          <CardDescription>
            Current status of all election system components
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Database</span>
                <Badge className="bg-green-100 text-green-800 border-0">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Operational
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">SMS Service</span>
                <Badge className="bg-green-100 text-green-800 border-0">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Operational
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Authentication</span>
                <Badge className="bg-green-100 text-green-800 border-0">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Operational
                </Badge>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">File Storage</span>
                <Badge className="bg-green-100 text-green-800 border-0">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Operational
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Results Engine</span>
                <Badge className="bg-green-100 text-green-800 border-0">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Operational
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Notifications</span>
                <Badge className="bg-green-100 text-green-800 border-0">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Operational
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
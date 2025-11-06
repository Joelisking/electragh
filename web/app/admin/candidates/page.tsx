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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  UserCheck,
  Plus,
  Upload,
  Edit,
  Trash2,
  Image as ImageIcon,
  Users,
  Award,
  Eye,
} from 'lucide-react';

// Mock data - replace with real API calls
const mockPositions = [
  { id: '1', name: 'President', candidateCount: 2, order: 1 },
  { id: '2', name: 'Vice President', candidateCount: 1, order: 2 },
  { id: '3', name: 'Secretary', candidateCount: 3, order: 3 },
  { id: '4', name: 'Treasurer', candidateCount: 2, order: 4 },
  { id: '5', name: 'PRO', candidateCount: 4, order: 5 },
];

const mockCandidates = [
  {
    id: '1',
    fullName: 'Kwame Asante',
    positionId: '1',
    positionName: 'President',
    classYearGroup: '2018',
    photoUrl: '/api/placeholder/150/150',
    bio: 'Experienced leader with strong background in student affairs.',
    order: 1,
    isActive: true,
  },
  {
    id: '2',
    fullName: 'Akosua Mensah',
    positionId: '1',
    positionName: 'President',
    classYearGroup: '2019',
    photoUrl: '/api/placeholder/150/150',
    bio: 'Passionate about driving positive change and innovation.',
    order: 2,
    isActive: true,
  },
  {
    id: '3',
    fullName: 'John Smith',
    positionId: '2',
    positionName: 'Vice President',
    classYearGroup: '2020',
    photoUrl: '/api/placeholder/150/150',
    bio: 'Committed to supporting the president and serving the community.',
    order: 1,
    isActive: true,
  },
  {
    id: '4',
    fullName: 'Ama Boateng',
    positionId: '3',
    positionName: 'Secretary',
    classYearGroup: '2017',
    photoUrl: '/api/placeholder/150/150',
    bio: 'Detail-oriented with excellent organizational skills.',
    order: 1,
    isActive: true,
  },
];

export default function CandidatesPage() {
  const [positions, setPositions] = useState(mockPositions);
  const [candidates, setCandidates] = useState(mockCandidates);
  const [selectedPosition, setSelectedPosition] = useState('all');
  const [isAddPositionOpen, setIsAddPositionOpen] = useState(false);
  const [isAddCandidateOpen, setIsAddCandidateOpen] = useState(false);
  const [newPosition, setNewPosition] = useState({ name: '', order: positions.length + 1 });
  const [newCandidate, setNewCandidate] = useState({
    fullName: '',
    positionId: '',
    classYearGroup: '',
    bio: '',
    photoFile: null as File | null,
  });

  const filteredCandidates = selectedPosition === 'all'
    ? candidates
    : candidates.filter(c => c.positionId === selectedPosition);

  const handleAddPosition = () => {
    if (!newPosition.name) return;

    const position = {
      id: String(positions.length + 1),
      name: newPosition.name,
      candidateCount: 0,
      order: newPosition.order,
    };

    setPositions([...positions, position]);
    setNewPosition({ name: '', order: positions.length + 2 });
    setIsAddPositionOpen(false);
  };

  const handleAddCandidate = () => {
    if (!newCandidate.fullName || !newCandidate.positionId || !newCandidate.classYearGroup) return;

    const position = positions.find(p => p.id === newCandidate.positionId);
    const candidate = {
      id: String(candidates.length + 1),
      fullName: newCandidate.fullName,
      positionId: newCandidate.positionId,
      positionName: position?.name || '',
      classYearGroup: newCandidate.classYearGroup,
      photoUrl: '/api/placeholder/150/150', // Would be uploaded URL
      bio: newCandidate.bio,
      order: candidates.filter(c => c.positionId === newCandidate.positionId).length + 1,
      isActive: true,
    };

    setCandidates([...candidates, candidate]);

    // Update position candidate count
    setPositions(positions.map(p =>
      p.id === newCandidate.positionId
        ? { ...p, candidateCount: p.candidateCount + 1 }
        : p
    ));

    setNewCandidate({
      fullName: '',
      positionId: '',
      classYearGroup: '',
      bio: '',
      photoFile: null,
    });
    setIsAddCandidateOpen(false);
  };

  const stats = {
    totalPositions: positions.length,
    totalCandidates: candidates.length,
    activePositions: positions.filter(p => p.candidateCount > 0).length,
    avgCandidatesPerPosition: positions.length > 0 ? (candidates.length / positions.length).toFixed(1) : '0',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Candidate Management</h1>
          <p className="text-gray-600">Manage election positions and candidates</p>
        </div>
        <div className="flex space-x-2">
          <Dialog open={isAddPositionOpen} onOpenChange={setIsAddPositionOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Award className="w-4 h-4 mr-2" />
                Add Position
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Position</DialogTitle>
                <DialogDescription>
                  Create a new election position
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="positionName">Position Name</Label>
                  <Input
                    id="positionName"
                    value={newPosition.name}
                    onChange={(e) => setNewPosition({ ...newPosition, name: e.target.value })}
                    placeholder="e.g., President, Secretary"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="positionOrder">Display Order</Label>
                  <Input
                    id="positionOrder"
                    type="number"
                    value={newPosition.order}
                    onChange={(e) => setNewPosition({ ...newPosition, order: parseInt(e.target.value) })}
                    placeholder="1"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsAddPositionOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddPosition}>
                    Add Position
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isAddCandidateOpen} onOpenChange={setIsAddCandidateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Candidate
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Add New Candidate</DialogTitle>
                <DialogDescription>
                  Add a candidate to an election position
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="candidateName">Full Name</Label>
                  <Input
                    id="candidateName"
                    value={newCandidate.fullName}
                    onChange={(e) => setNewCandidate({ ...newCandidate, fullName: e.target.value })}
                    placeholder="Enter full name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="candidatePosition">Position</Label>
                  <Select value={newCandidate.positionId} onValueChange={(value) => setNewCandidate({ ...newCandidate, positionId: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select position" />
                    </SelectTrigger>
                    <SelectContent>
                      {positions.map(position => (
                        <SelectItem key={position.id} value={position.id}>
                          {position.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="candidateClass">Class/Year Group</Label>
                  <Input
                    id="candidateClass"
                    value={newCandidate.classYearGroup}
                    onChange={(e) => setNewCandidate({ ...newCandidate, classYearGroup: e.target.value })}
                    placeholder="e.g., 2018"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="candidateBio">Bio (Optional)</Label>
                  <Textarea
                    id="candidateBio"
                    value={newCandidate.bio}
                    onChange={(e) => setNewCandidate({ ...newCandidate, bio: e.target.value })}
                    placeholder="Brief candidate biography"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="candidatePhoto">Photo</Label>
                  <Input
                    id="candidatePhoto"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setNewCandidate({ ...newCandidate, photoFile: e.target.files?.[0] || null })}
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsAddCandidateOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleAddCandidate}>
                    Add Candidate
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Positions</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalPositions}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Award className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Candidates</p>
                <p className="text-3xl font-bold text-green-600">{stats.totalCandidates}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <UserCheck className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Positions</p>
                <p className="text-3xl font-bold text-purple-600">{stats.activePositions}</p>
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
                <p className="text-sm font-medium text-gray-600">Avg per Position</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.avgCandidatesPerPosition}</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Award className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Positions Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Election Positions</CardTitle>
          <CardDescription>
            Overview of all election positions and their candidates
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {positions.map((position) => (
              <Card key={position.id} className="border border-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-gray-900">{position.name}</h3>
                    <Badge variant="outline">
                      {position.candidateCount} candidates
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">Order: {position.order}</p>
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline" className="flex-1">
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button size="sm" variant="outline">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Candidates Filter */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <Label>Filter by Position:</Label>
            <Select value={selectedPosition} onValueChange={setSelectedPosition}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All positions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Positions</SelectItem>
                {positions.map(position => (
                  <SelectItem key={position.id} value={position.id}>
                    {position.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Candidates Table */}
      <Card>
        <CardHeader>
          <CardTitle>Candidates ({filteredCandidates.length})</CardTitle>
          <CardDescription>
            List of all candidates for {selectedPosition === 'all' ? 'all positions' : positions.find(p => p.id === selectedPosition)?.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Photo</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Class/Year</TableHead>
                <TableHead>Bio</TableHead>
                <TableHead>Order</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCandidates.map((candidate) => (
                <TableRow key={candidate.id}>
                  <TableCell>
                    <div className="w-12 h-12 bg-gray-200 rounded-lg flex items-center justify-center">
                      <ImageIcon className="w-6 h-6 text-gray-400" />
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{candidate.fullName}</TableCell>
                  <TableCell>{candidate.positionName}</TableCell>
                  <TableCell>{candidate.classYearGroup}</TableCell>
                  <TableCell className="max-w-xs truncate">{candidate.bio || '-'}</TableCell>
                  <TableCell>{candidate.order}</TableCell>
                  <TableCell>
                    <Badge className={candidate.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                      {candidate.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
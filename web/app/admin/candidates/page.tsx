'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  UserCheck,
  Award,
  Users,
  Loader2,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Plus,
  Edit,
  Trash2,
} from 'lucide-react';

interface Candidate {
  id: string;
  fullName: string;
  classYearGroup: string | null;
  photoUrl: string | null;
  bio: string | null;
  order: number;
  isActive: boolean;
}

interface Position {
  id: string;
  name: string;
  order: number;
  isActive: boolean;
  candidates: Candidate[];
}

export default function CandidatesPage() {
  const [positions, setPositions] = useState<Position[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedPositions, setExpandedPositions] = useState<
    Set<string>
  >(new Set());
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedPositionId, setSelectedPositionId] =
    useState<string>('');
  const [selectedCandidate, setSelectedCandidate] =
    useState<Candidate | null>(null);
  const [newCandidate, setNewCandidate] = useState({
    fullName: '',
    classYearGroup: '',
    bio: '',
    photoFile: null as File | null,
  });
  const [addPositionDialogOpen, setAddPositionDialogOpen] = useState(false);
  const [newPositionName, setNewPositionName] = useState('');

  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  useEffect(() => {
    fetchPositionsAndCandidates();
  }, []);

  const fetchPositionsAndCandidates = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/election`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch election data');
      }

      const data = await response.json();
      setPositions(data.positions || []);

      // Expand all positions by default
      const allPositionIds = new Set<string>(
        (data.positions || []).map((p: Position) => p.id)
      );
      setExpandedPositions(allPositionIds);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An error occurred'
      );
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const togglePosition = (positionId: string) => {
    const newExpanded = new Set(expandedPositions);
    if (newExpanded.has(positionId)) {
      newExpanded.delete(positionId);
    } else {
      newExpanded.add(positionId);
    }
    setExpandedPositions(newExpanded);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleAddCandidate = (positionId: string) => {
    setSelectedPositionId(positionId);
    setAddDialogOpen(true);
  };

  const handleEditCandidate = (candidate: Candidate) => {
    setSelectedCandidate(candidate);
    setNewCandidate({
      fullName: candidate.fullName,
      classYearGroup: candidate.classYearGroup || '',
      bio: candidate.bio || '',
      photoFile: null,
    });
    setEditDialogOpen(true);
  };

  const handleAddPosition = async () => {
    if (!newPositionName.trim()) {
      alert('Please enter a position name');
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/api/positions`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newPositionName }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add position');
      }

      alert('Position added successfully');
      setNewPositionName('');
      setAddPositionDialogOpen(false);
      fetchPositionsAndCandidates();
    } catch (err) {
      console.error('Error adding position:', err);
      alert(err instanceof Error ? err.message : 'Failed to add position');
    }
  };

  const handleDeletePosition = async (positionId: string) => {
    if (!confirm('Are you sure you want to delete this position? All candidates under this position will also be deleted.')) {
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/api/positions/${positionId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete position');
      }

      alert('Position deleted successfully');
      fetchPositionsAndCandidates();
    } catch (err) {
      console.error('Error deleting position:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete position');
    }
  };

  const handleDeleteCandidate = async (candidateId: string) => {
    if (!confirm('Are you sure you want to delete this candidate?')) {
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/api/candidates/${candidateId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete candidate');
      }

      alert('Candidate deleted successfully');
      fetchPositionsAndCandidates();
    } catch (err) {
      console.error('Error deleting candidate:', err);
      alert(err instanceof Error ? err.message : 'Failed to delete candidate');
    }
  };

  const handleSaveCandidate = async () => {
    if (!newCandidate.fullName || !newCandidate.classYearGroup) {
      alert('Please fill in required fields');
      return;
    }

    const isEditing = !!selectedCandidate;
    if (!isEditing && !selectedPositionId) {
      alert('No position selected');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('fullName', newCandidate.fullName);
      formData.append('classYearGroup', newCandidate.classYearGroup);
      if (!isEditing) {
        formData.append('positionId', selectedPositionId);
      }
      if (newCandidate.bio) {
        formData.append('bio', newCandidate.bio);
      }
      if (newCandidate.photoFile) {
        formData.append('photo', newCandidate.photoFile);
      }

      const url = isEditing
        ? `${apiUrl}/api/candidates/${selectedCandidate.id}`
        : `${apiUrl}/api/candidates`;
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message ||
            `Failed to ${isEditing ? 'update' : 'add'} candidate`
        );
      }

      alert(`Candidate ${isEditing ? 'updated' : 'added'} successfully`);

      // Reset form
      setNewCandidate({
        fullName: '',
        classYearGroup: '',
        bio: '',
        photoFile: null,
      });
      setSelectedCandidate(null);
      setAddDialogOpen(false);
      setEditDialogOpen(false);

      // Refresh data
      fetchPositionsAndCandidates();
    } catch (err) {
      console.error(
        `Error ${selectedCandidate ? 'updating' : 'adding'} candidate:`,
        err
      );
      alert(
        err instanceof Error
          ? err.message
          : `Failed to ${selectedCandidate ? 'update' : 'add'} candidate`
      );
    }
  };

  const stats = {
    totalPositions: positions.length,
    totalCandidates: positions.reduce(
      (sum, p) => sum + p.candidates.length,
      0
    ),
    activePositions: positions.filter(
      (p) => p.isActive && p.candidates.length > 0
    ).length,
    avgCandidatesPerPosition:
      positions.length > 0
        ? (
            positions.reduce(
              (sum, p) => sum + p.candidates.length,
              0
            ) / positions.length
          ).toFixed(1)
        : '0',
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-electra-primary" />
          <p className="text-gray-600">Loading candidates...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-red-600" />
          <p className="text-red-600 font-semibold">
            Error loading candidates
          </p>
          <p className="text-gray-600 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Candidate Management
          </h1>
          <p className="text-gray-600">
            Manage election positions and their candidates
          </p>
        </div>
        <Button
          onClick={() => setAddPositionDialogOpen(true)}
          className="bg-electra-primary hover:bg-electra-secondary transition-all shadow-md hover:shadow-lg">
          <Plus className="w-4 h-4 mr-2" />
          Add Position
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Positions
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {stats.totalPositions}
                </p>
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
                <p className="text-sm font-medium text-gray-600">
                  Total Candidates
                </p>
                <p className="text-3xl font-bold text-electra-primary">
                  {stats.totalCandidates}
                </p>
              </div>
              <div className="w-12 h-12 bg-electra-primary-light rounded-lg flex items-center justify-center shadow-lg">
                <UserCheck className="w-6 h-6 text-electra-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Active Positions
                </p>
                <p className="text-3xl font-bold text-purple-600">
                  {stats.activePositions}
                </p>
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
                <p className="text-sm font-medium text-gray-600">
                  Avg per Position
                </p>
                <p className="text-3xl font-bold text-yellow-600">
                  {stats.avgCandidatesPerPosition}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Award className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Positions with Candidates */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">
            Positions & Candidates
          </h2>
          <div className="text-sm text-gray-600">
            Click on a position to expand/collapse candidates
          </div>
        </div>

        {positions.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Award className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">
                No positions or candidates found
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Positions and candidates will appear here once they
                are added to the election
              </p>
            </CardContent>
          </Card>
        ) : (
          positions.map((position) => {
            const isExpanded = expandedPositions.has(position.id);
            const candidateCount = position.candidates.length;

            return (
              <Card key={position.id} className="overflow-hidden">
                {/* Position Header - Clickable */}
                <div
                  onClick={() => togglePosition(position.id)}
                  className="cursor-pointer hover:bg-gray-50 transition-colors">
                  <CardHeader className="pb-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Award className="w-6 h-6 text-blue-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-3">
                            <CardTitle className="text-xl">
                              {position.name}
                            </CardTitle>
                            <Badge
                              variant="outline"
                              className="bg-blue-50">
                              Order: {position.order}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={
                                position.isActive
                                  ? 'bg-electra-primary-light/50 text-electra-primary border-electra-primary/30'
                                  : 'bg-gray-50'
                              }>
                              {position.isActive
                                ? 'Active'
                                : 'Inactive'}
                            </Badge>
                          </div>
                          <CardDescription className="mt-1">
                            {candidateCount}{' '}
                            {candidateCount === 1
                              ? 'candidate'
                              : 'candidates'}{' '}
                            running for this position
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddCandidate(position.id);
                          }}
                          className="bg-electra-primary text-white border-electra-primary hover:bg-electra-secondary transition-all shadow-md hover:shadow-lg">
                          <Plus className="w-4 h-4 mr-1" />
                          Add Candidate
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeletePosition(position.id);
                          }}
                          className="border-red-300 text-red-600 hover:bg-red-50">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          {isExpanded ? (
                            <ChevronUp className="w-5 h-5" />
                          ) : (
                            <ChevronDown className="w-5 h-5" />
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                </div>

                {/* Candidates List - Expandable */}
                {isExpanded && (
                  <CardContent className="pt-0">
                    {candidateCount === 0 ? (
                      <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                        <UserCheck className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                        <p className="text-sm">
                          No candidates for this position yet
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {position.candidates
                          .sort((a, b) => a.order - b.order)
                          .map((candidate, index) => (
                            <div
                              key={candidate.id}
                              className="flex items-center gap-4 p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg hover:from-electra-primary-light/10 hover:to-electra-primary-light/20 transition-all duration-300 shadow-sm hover:shadow-md border border-transparent hover:border-electra-primary/20">
                              {/* Ranking Badge */}
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                                  index === 0
                                    ? 'bg-yellow-500'
                                    : index === 1
                                    ? 'bg-gray-400'
                                    : index === 2
                                    ? 'bg-orange-600'
                                    : 'bg-blue-500'
                                }`}>
                                {index + 1}
                              </div>

                              {/* Avatar */}
                              <Avatar className="w-12 h-12">
                                <AvatarImage
                                  src={
                                    candidate.photoUrl || undefined
                                  }
                                />
                                <AvatarFallback className="bg-blue-600 text-white">
                                  {getInitials(candidate.fullName)}
                                </AvatarFallback>
                              </Avatar>

                              {/* Candidate Info */}
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <h4 className="font-semibold text-gray-900">
                                    {candidate.fullName}
                                  </h4>
                                  {candidate.classYearGroup && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs">
                                      Class of{' '}
                                      {candidate.classYearGroup}
                                    </Badge>
                                  )}
                                  <Badge
                                    variant="outline"
                                    className={
                                      candidate.isActive
                                        ? 'bg-electra-primary-light/50 text-electra-primary border-electra-primary/30'
                                        : 'bg-gray-100'
                                    }>
                                    {candidate.isActive
                                      ? 'Active'
                                      : 'Inactive'}
                                  </Badge>
                                </div>
                                {candidate.bio && (
                                  <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                                    {candidate.bio}
                                  </p>
                                )}
                              </div>

                              {/* Order Badge */}
                              <Badge
                                variant="outline"
                                className="text-xs">
                                Order: {candidate.order}
                              </Badge>

                              {/* Action Buttons */}
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEditCandidate(candidate);
                                  }}
                                  className="border-electra-primary/30 text-electra-primary hover:bg-electra-primary-light/20">
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteCandidate(candidate.id);
                                  }}
                                  className="border-red-300 text-red-600 hover:bg-red-50">
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })
        )}
      </div>

      {/* Add Candidate Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Add New Candidate</DialogTitle>
            <DialogDescription>
              Add a candidate to{' '}
              {positions.find((p) => p.id === selectedPositionId)
                ?.name || 'this position'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                value={newCandidate.fullName}
                onChange={(e) =>
                  setNewCandidate({
                    ...newCandidate,
                    fullName: e.target.value,
                  })
                }
                placeholder="Enter candidate's full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="classYear">Class/Year Group *</Label>
              <Input
                id="classYear"
                value={newCandidate.classYearGroup}
                onChange={(e) =>
                  setNewCandidate({
                    ...newCandidate,
                    classYearGroup: e.target.value,
                  })
                }
                placeholder="e.g., 2018"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Biography (Optional)</Label>
              <Textarea
                id="bio"
                value={newCandidate.bio}
                onChange={(e) =>
                  setNewCandidate({
                    ...newCandidate,
                    bio: e.target.value,
                  })
                }
                placeholder="Brief candidate biography"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="photo">Photo (Optional)</Label>
              <Input
                id="photo"
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setNewCandidate({
                    ...newCandidate,
                    photoFile: e.target.files?.[0] || null,
                  })
                }
              />
              <p className="text-xs text-gray-500">
                Upload a profile photo for the candidate
              </p>
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setAddDialogOpen(false);
                  setNewCandidate({
                    fullName: '',
                    classYearGroup: '',
                    bio: '',
                    photoFile: null,
                  });
                }}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveCandidate}
                className="bg-electra-primary hover:bg-electra-secondary transition-all shadow-md hover:shadow-lg">
                <Plus className="w-4 h-4 mr-2" />
                Add Candidate
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Candidate Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Edit Candidate</DialogTitle>
            <DialogDescription>
              Update candidate information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-fullName">Full Name *</Label>
              <Input
                id="edit-fullName"
                value={newCandidate.fullName}
                onChange={(e) =>
                  setNewCandidate({
                    ...newCandidate,
                    fullName: e.target.value,
                  })
                }
                placeholder="Enter candidate's full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-classYear">Class/Year Group *</Label>
              <Input
                id="edit-classYear"
                value={newCandidate.classYearGroup}
                onChange={(e) =>
                  setNewCandidate({
                    ...newCandidate,
                    classYearGroup: e.target.value,
                  })
                }
                placeholder="e.g., 2018"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-bio">Biography (Optional)</Label>
              <Textarea
                id="edit-bio"
                value={newCandidate.bio}
                onChange={(e) =>
                  setNewCandidate({
                    ...newCandidate,
                    bio: e.target.value,
                  })
                }
                placeholder="Brief candidate biography"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-photo">Photo (Optional)</Label>
              <Input
                id="edit-photo"
                type="file"
                accept="image/*"
                onChange={(e) =>
                  setNewCandidate({
                    ...newCandidate,
                    photoFile: e.target.files?.[0] || null,
                  })
                }
              />
              <p className="text-xs text-gray-500">
                Upload a new profile photo (leave empty to keep current photo)
              </p>
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setEditDialogOpen(false);
                  setSelectedCandidate(null);
                  setNewCandidate({
                    fullName: '',
                    classYearGroup: '',
                    bio: '',
                    photoFile: null,
                  });
                }}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveCandidate}
                className="bg-electra-primary hover:bg-electra-secondary transition-all shadow-md hover:shadow-lg">
                <Edit className="w-4 h-4 mr-2" />
                Update Candidate
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Position Dialog */}
      <Dialog open={addPositionDialogOpen} onOpenChange={setAddPositionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Position</DialogTitle>
            <DialogDescription>
              Create a new election position
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="positionName">Position Name *</Label>
              <Input
                id="positionName"
                value={newPositionName}
                onChange={(e) => setNewPositionName(e.target.value)}
                placeholder="e.g., President, Vice President, Secretary"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setAddPositionDialogOpen(false);
                  setNewPositionName('');
                }}>
                Cancel
              </Button>
              <Button
                onClick={handleAddPosition}
                className="bg-electra-primary hover:bg-electra-secondary transition-all shadow-md hover:shadow-lg">
                <Plus className="w-4 h-4 mr-2" />
                Add Position
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

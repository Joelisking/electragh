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
// import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Users,
  Upload,
  Download,
  CheckCircle,
  Clock,
  UserPlus,
  Loader2,
  Trash2,
  // RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

interface Voter {
  id: string;
  fullName: string;
  phone: string;
  classYearGroup: string | null;
  uniqueIdentifier: string | null;
  status: string;
  hasVoted: boolean;
  lastLogin: string | null;
  createdAt: string;
}

interface VoterStats {
  totalVoters: number;
  verifiedVoters: number;
  votedCount: number;
  turnoutRate: number;
  statusBreakdown: Record<string, number>;
}

export default function VotersPage() {
  const [voters, setVoters] = useState<Voter[]>([]);
  const [stats, setStats] = useState<VoterStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');

  // Dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedVoter, setSelectedVoter] = useState<Voter | null>(
    null
  );
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    classYearGroup: '',
    uniqueIdentifier: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  useEffect(() => {
    fetchVoters();
    fetchStats();
  }, []);

  const fetchVoters = async () => {
    try {
      // Add cache-busting timestamp to ensure fresh data
      const response = await fetch(
        `${apiUrl}/api/voters?limit=1000&_t=${Date.now()}`,
        {
          credentials: 'include',
          cache: 'no-store', // Disable caching
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch voters');
      }

      const data = await response.json();
      // eslint-disable-next-line no-console
      console.log('Fetched voters response:', data);
      setVoters(data.voters);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An error occurred'
      );
      console.error('Error fetching voters:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(
        `${apiUrl}/api/voters/stats?_t=${Date.now()}`,
        {
          credentials: 'include',
          cache: 'no-store', // Disable caching
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }

      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  // Filter voters based on search and filters
  const filteredVoters = voters.filter((voter) => {
    const matchesSearch =
      voter.fullName
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      voter.phone.includes(searchTerm) ||
      (voter.uniqueIdentifier &&
        voter.uniqueIdentifier
          .toLowerCase()
          .includes(searchTerm.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all' || voter.status === statusFilter;
    const matchesClass =
      classFilter === 'all' || voter.classYearGroup === classFilter;

    return matchesSearch && matchesStatus && matchesClass;
  });

  // Get unique class years for filter
  // const classYears = [
  //   ...new Set(voters.map((v) => v.classYearGroup).filter(Boolean)),
  // ].sort();

  const handleEditVoter = (voter: Voter) => {
    setSelectedVoter(voter);
    setFormData({
      fullName: voter.fullName,
      phone: voter.phone,
      classYearGroup: voter.classYearGroup || '',
      uniqueIdentifier: voter.uniqueIdentifier || '',
    });
    setEditDialogOpen(true);
  };

  const handleAddVoter = () => {
    setFormData({
      fullName: '',
      phone: '',
      classYearGroup: '',
      uniqueIdentifier: '',
    });
    setAddDialogOpen(true);
  };

  const handleSaveVoter = async () => {
    if (!formData.fullName || !formData.phone) {
      toast.error('Please fill in required fields');
      return;
    }

    setSubmitting(true);
    try {
      const url = selectedVoter
        ? `${apiUrl}/api/voters/${selectedVoter.id}`
        : `${apiUrl}/api/voters`;
      const method = selectedVoter ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save voter');
      }

      toast.success(
        selectedVoter
          ? 'Voter updated successfully'
          : 'Voter added successfully'
      );
      setEditDialogOpen(false);
      setAddDialogOpen(false);
      fetchVoters();
      fetchStats();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'An error occurred'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteVoter = (voter: Voter) => {
    setSelectedVoter(voter);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteVoter = async () => {
    if (!selectedVoter) return;

    setDeleting(true);
    try {
      const response = await fetch(
        `${apiUrl}/api/voters/${selectedVoter.id}`,
        {
          method: 'DELETE',
          credentials: 'include',
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete voter');
      }

      toast.success('Voter deleted successfully');
      setDeleteDialogOpen(false);
      setSelectedVoter(null);
      fetchVoters();
      fetchStats();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'An error occurred'
      );
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await fetch(
        `${apiUrl}/api/voters/export?format=csv`,
        {
          credentials: 'include',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to export voters');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `voters-${
        new Date().toISOString().split('T')[0]
      }.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('Voters exported successfully');
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to export voters'
      );
    }
  };

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setImporting(true);
    toast.loading('Importing voters...', { id: 'import-toast' });

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${apiUrl}/api/voters/import`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.message || 'Failed to import voters'
        );
      }

      const result = await response.json();
      toast.success(
        `Successfully imported ${result.imported} voters`,
        {
          id: 'import-toast',
        }
      );
      await fetchVoters();
      await fetchStats();
    } catch (err) {
      toast.error(
        err instanceof Error
          ? err.message
          : 'Failed to import voters',
        { id: 'import-toast' }
      );
    } finally {
      setImporting(false);
      // Reset the input value so the same file can be selected again
      event.target.value = '';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-electra-primary" />
          <p className="text-gray-600">Loading voters...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 font-semibold">
            Error loading voters
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
            Voter Management
          </h1>
          <p className="text-gray-600">
            Manage registered voters and their status
          </p>
        </div>
        <div className="flex space-x-2 items-center">
          {/* <Button
            onClick={handleRefresh}
            disabled={refreshing}
            variant="outline"
            size="sm"
            className="border-gray-300 text-gray-700 hover:bg-gray-50">
            <RefreshCw
              className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`}
            />
            Refresh
          </Button> */}
          <Label
            htmlFor="import-file"
            className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-electra-primary/30 text-electra-primary hover:bg-electra-primary-light/20 h-10 px-4 py-2">
            {importing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Importing...
              </>
            ) : (
              <>
                <Download className="w-4 h-4 mr-2" />
                Import CSV
              </>
            )}
          </Label>
          <Input
            id="import-file"
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileChange}
            disabled={importing}
            className="hidden"
          />
          <Button
            onClick={handleExport}
            variant="outline"
            className="border-electra-primary/30 text-electra-primary hover:bg-electra-primary-light/20 transition-all hover:scale-105 duration-200">
            <Upload className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button
            onClick={handleAddVoter}
            className="bg-electra-primary hover:bg-electra-secondary transition-all shadow-md hover:shadow-lg hover:scale-105 duration-200">
            <UserPlus className="w-4 h-4 mr-2" />
            Add Voter
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Total Voters
                </p>
                <p className="text-3xl font-bold text-gray-900">
                  {stats?.totalVoters || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Verified
                </p>
                <p className="text-3xl font-bold text-electra-primary">
                  {stats?.verifiedVoters || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-electra-primary-light rounded-lg flex items-center justify-center shadow-lg">
                <CheckCircle className="w-6 h-6 text-electra-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Voted
                </p>
                <p className="text-3xl font-bold text-purple-600">
                  {stats?.votedCount || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">
                  Pending
                </p>
                <p className="text-3xl font-bold text-orange-600">
                  {(stats?.totalVoters || 0) -
                    (stats?.votedCount || 0)}
                </p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Voters Table */}
      <Card className="shadow-lg border-electra-primary/10">
        <CardHeader className="bg-gradient-to-r from-electra-primary-light/5 to-electra-primary-light/10">
          <CardTitle className="text-electra-secondary">
            Registered Voters ({filteredVoters.length})
          </CardTitle>
          <CardDescription>
            List of all registered voters and their current status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Class/Year</TableHead>
                {/* <TableHead>Unique ID</TableHead> */}
                {/* <TableHead>Status</TableHead> */}
                <TableHead>Last Login</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredVoters.length > 0 ? (
                filteredVoters.map((voter) => (
                  <TableRow key={voter.id}>
                    <TableCell className="font-medium">
                      {voter.fullName}
                    </TableCell>
                    <TableCell>{voter.phone}</TableCell>
                    <TableCell>
                      {voter.classYearGroup || '-'}
                    </TableCell>
                    {/* <TableCell>
                      {voter.uniqueIdentifier || '-'}
                    </TableCell> */}
                    {/* <TableCell>
                      <Badge
                        className={`${getStatusBadgeClass(
                          voter
                        )} border-0`}>
                        {getStatusIcon(voter.status)}
                        <span className="ml-1">
                          {getDisplayStatus(voter)}
                        </span>
                      </Badge>
                    </TableCell> */}
                    <TableCell>
                      {voter.lastLogin
                        ? new Date(
                            voter.lastLogin
                          ).toLocaleDateString()
                        : 'Never'}
                    </TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          onClick={() => handleEditVoter(voter)}
                          variant="outline"
                          size="sm"
                          className="border-electra-primary/30 text-electra-primary hover:text-electra-primary hover:bg-electra-primary-light/20 transition-all">
                          Edit
                        </Button>
                        <Button
                          onClick={() => handleDeleteVoter(voter)}
                          variant="outline"
                          size="sm"
                          disabled={voter.hasVoted}
                          className="border-red-300 text-red-600 hover:bg-red-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          title={
                            voter.hasVoted
                              ? 'Cannot delete voter who has already voted'
                              : 'Delete voter'
                          }>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-gray-500 py-8">
                    No voters found matching your criteria
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Edit Voter Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Voter</DialogTitle>
            <DialogDescription>
              Update voter information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-fullName">Full Name *</Label>
              <Input
                id="edit-fullName"
                value={formData.fullName}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    fullName: e.target.value,
                  })
                }
                placeholder="Enter full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone Number *</Label>
              <Input
                id="edit-phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="Enter phone number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-class">Class/Year Group</Label>
              <Input
                id="edit-class"
                value={formData.classYearGroup}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    classYearGroup: e.target.value,
                  })
                }
                placeholder="e.g., 2018"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-identifier">
                Unique Identifier
              </Label>
              <Input
                id="edit-identifier"
                value={formData.uniqueIdentifier}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    uniqueIdentifier: e.target.value,
                  })
                }
                placeholder="e.g., Student ID"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
                disabled={submitting}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveVoter}
                disabled={submitting}
                className="bg-electra-primary hover:bg-electra-secondary">
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Voter Dialog */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Voter</DialogTitle>
            <DialogDescription>
              Register a new voter in the system
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="add-fullName">Full Name *</Label>
              <Input
                id="add-fullName"
                value={formData.fullName}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    fullName: e.target.value,
                  })
                }
                placeholder="Enter full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-phone">Phone Number *</Label>
              <Input
                id="add-phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="Enter phone number"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-class">Class/Year Group</Label>
              <Input
                id="add-class"
                value={formData.classYearGroup}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    classYearGroup: e.target.value,
                  })
                }
                placeholder="e.g., 2018"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="add-identifier">
                Unique Identifier
              </Label>
              <Input
                id="add-identifier"
                value={formData.uniqueIdentifier}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    uniqueIdentifier: e.target.value,
                  })
                }
                placeholder="e.g., Student ID"
              />
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setAddDialogOpen(false)}
                disabled={submitting}>
                Cancel
              </Button>
              <Button
                onClick={handleSaveVoter}
                disabled={submitting}
                className="bg-electra-primary hover:bg-electra-secondary">
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Voter
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Voter Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Voter</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this voter? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedVoter && (
            <div className="space-y-2 py-4">
              <p className="text-sm">
                <span className="font-semibold">Name:</span>{' '}
                {selectedVoter.fullName}
              </p>
              <p className="text-sm">
                <span className="font-semibold">Phone:</span>{' '}
                {selectedVoter.phone}
              </p>
              {selectedVoter.classYearGroup && (
                <p className="text-sm">
                  <span className="font-semibold">Class/Year:</span>{' '}
                  {selectedVoter.classYearGroup}
                </p>
              )}
            </div>
          )}
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleting}>
              Cancel
            </Button>
            <Button
              onClick={confirmDeleteVoter}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white">
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Voter
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

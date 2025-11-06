'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
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
import { Label } from '@/components/ui/label';
import {
  Users,
  Upload,
  Download,
  Plus,
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  Phone,
  FileSpreadsheet,
  UserPlus,
} from 'lucide-react';

// Mock data - replace with real API calls
const mockVoters = [
  {
    id: '1',
    fullName: 'Kwame Asante',
    phone: '+233240123456',
    classYearGroup: '2018',
    uniqueId: 'AGO2018001',
    status: 'verified',
    createdAt: '2024-10-01',
    lastLogin: '2024-10-15',
  },
  {
    id: '2',
    fullName: 'Akosua Mensah',
    phone: '+233551234567',
    classYearGroup: '2019',
    uniqueId: 'AGO2019002',
    status: 'invited',
    createdAt: '2024-10-01',
    lastLogin: null,
  },
  {
    id: '3',
    fullName: 'John Smith',
    phone: '+14155552345',
    classYearGroup: '2020',
    uniqueId: 'AGO2020003',
    status: 'verified',
    createdAt: '2024-10-01',
    lastLogin: '2024-10-14',
  },
  {
    id: '4',
    fullName: 'Ama Boateng',
    phone: '+233208765432',
    classYearGroup: '2017',
    uniqueId: 'AGO2017004',
    status: 'voted',
    createdAt: '2024-10-01',
    lastLogin: '2024-10-15',
  },
];

const statusColors = {
  invited: 'bg-blue-100 text-blue-800',
  verified: 'bg-green-100 text-green-800',
  voted: 'bg-purple-100 text-purple-800',
  blocked: 'bg-red-100 text-red-800',
};

const statusIcons = {
  invited: Clock,
  verified: CheckCircle,
  voted: CheckCircle,
  blocked: XCircle,
};

export default function VotersPage() {
  const [voters, setVoters] = useState(mockVoters);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newVoter, setNewVoter] = useState({
    fullName: '',
    phone: '',
    classYearGroup: '',
    uniqueId: '',
  });

  // Filter voters based on search and filters
  const filteredVoters = voters.filter(voter => {
    const matchesSearch = voter.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         voter.phone.includes(searchTerm) ||
                         voter.uniqueId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === 'all' || voter.status === statusFilter;
    const matchesClass = classFilter === 'all' || voter.classYearGroup === classFilter;

    return matchesSearch && matchesStatus && matchesClass;
  });

  // Get unique class years for filter
  const classYears = [...new Set(voters.map(v => v.classYearGroup))].sort();

  const handleAddVoter = () => {
    if (!newVoter.fullName || !newVoter.phone || !newVoter.classYearGroup) {
      return;
    }

    const voter = {
      id: String(voters.length + 1),
      ...newVoter,
      status: 'invited' as const,
      createdAt: new Date().toISOString().split('T')[0],
      lastLogin: null,
    };

    setVoters([...voters, voter]);
    setNewVoter({ fullName: '', phone: '', classYearGroup: '', uniqueId: '' });
    setIsAddDialogOpen(false);
  };

  const getStatusIcon = (status: string) => {
    const Icon = statusIcons[status as keyof typeof statusIcons] || Clock;
    return <Icon className="w-4 h-4" />;
  };

  const stats = {
    total: voters.length,
    verified: voters.filter(v => v.status === 'verified').length,
    voted: voters.filter(v => v.status === 'voted').length,
    pending: voters.filter(v => v.status === 'invited').length,
  };

  return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Voter Management</h1>
            <p className="text-gray-600">Manage registered voters and their status</p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline">
              <Upload className="w-4 h-4 mr-2" />
              Import CSV
            </Button>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Add Voter
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Voter</DialogTitle>
                  <DialogDescription>
                    Add a new voter to the election system
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Full Name</Label>
                    <Input
                      id="fullName"
                      value={newVoter.fullName}
                      onChange={(e) => setNewVoter({ ...newVoter, fullName: e.target.value })}
                      placeholder="Enter full name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={newVoter.phone}
                      onChange={(e) => setNewVoter({ ...newVoter, phone: e.target.value })}
                      placeholder="+233XXXXXXXXX"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="classYear">Class/Year Group</Label>
                    <Input
                      id="classYear"
                      value={newVoter.classYearGroup}
                      onChange={(e) => setNewVoter({ ...newVoter, classYearGroup: e.target.value })}
                      placeholder="e.g., 2018"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="uniqueId">Unique ID (Optional)</Label>
                    <Input
                      id="uniqueId"
                      value={newVoter.uniqueId}
                      onChange={(e) => setNewVoter({ ...newVoter, uniqueId: e.target.value })}
                      placeholder="e.g., AGO2018001"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleAddVoter}>
                      Add Voter
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
                  <p className="text-sm font-medium text-gray-600">Total Voters</p>
                  <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
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
                  <p className="text-sm font-medium text-gray-600">Verified</p>
                  <p className="text-3xl font-bold text-green-600">{stats.verified}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Voted</p>
                  <p className="text-3xl font-bold text-purple-600">{stats.voted}</p>
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
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-3xl font-bold text-yellow-600">{stats.pending}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Clock className="w-6 h-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    placeholder="Search by name, phone, or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="invited">Invited</SelectItem>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="voted">Voted</SelectItem>
                  <SelectItem value="blocked">Blocked</SelectItem>
                </SelectContent>
              </Select>
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classYears.map(year => (
                    <SelectItem key={year} value={year}>{year}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Voters Table */}
        <Card>
          <CardHeader>
            <CardTitle>Registered Voters ({filteredVoters.length})</CardTitle>
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
                  <TableHead>Unique ID</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredVoters.map((voter) => (
                  <TableRow key={voter.id}>
                    <TableCell className="font-medium">{voter.fullName}</TableCell>
                    <TableCell>{voter.phone}</TableCell>
                    <TableCell>{voter.classYearGroup}</TableCell>
                    <TableCell>{voter.uniqueId || '-'}</TableCell>
                    <TableCell>
                      <Badge className={`${statusColors[voter.status as keyof typeof statusColors]} border-0`}>
                        {getStatusIcon(voter.status)}
                        <span className="ml-1 capitalize">{voter.status}</span>
                      </Badge>
                    </TableCell>
                    <TableCell>{voter.lastLogin || 'Never'}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm">
                          Edit
                        </Button>
                        <Button variant="outline" size="sm">
                          <Phone className="w-4 h-4" />
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
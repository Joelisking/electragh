'use client';

import { useState, useEffect } from 'react';
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
  Users,
  Upload,
  Download,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  Phone,
  UserPlus,
  Loader2,
} from 'lucide-react';

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

const statusColors = {
  INVITED: 'bg-blue-100 text-blue-800',
  VERIFIED: 'bg-green-100 text-green-800',
  BLOCKED: 'bg-red-100 text-red-800',
};

const statusIcons = {
  INVITED: Clock,
  VERIFIED: CheckCircle,
  BLOCKED: XCircle,
};

export default function VotersPage() {
  const [voters, setVoters] = useState<Voter[]>([]);
  const [stats, setStats] = useState<VoterStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [classFilter, setClassFilter] = useState('all');

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  useEffect(() => {
    fetchVoters();
    fetchStats();
  }, []);

  const fetchVoters = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/voters?limit=1000`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch voters');
      }

      const data = await response.json();
      setVoters(data.voters);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching voters:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/voters/stats`, {
        credentials: 'include',
      });

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
  const filteredVoters = voters.filter(voter => {
    const matchesSearch = voter.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         voter.phone.includes(searchTerm) ||
                         (voter.uniqueIdentifier && voter.uniqueIdentifier.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus = statusFilter === 'all' || voter.status === statusFilter;
    const matchesClass = classFilter === 'all' || voter.classYearGroup === classFilter;

    return matchesSearch && matchesStatus && matchesClass;
  });

  // Get unique class years for filter
  const classYears = [...new Set(voters.map(v => v.classYearGroup).filter(Boolean))].sort();

  const getStatusIcon = (status: string) => {
    const Icon = statusIcons[status as keyof typeof statusIcons] || Clock;
    return <Icon className="w-4 h-4" />;
  };

  const getDisplayStatus = (voter: Voter) => {
    if (voter.hasVoted) return 'Voted';
    return voter.status.charAt(0) + voter.status.slice(1).toLowerCase();
  };

  const getStatusBadgeClass = (voter: Voter) => {
    if (voter.hasVoted) return 'bg-purple-100 text-purple-800';
    return statusColors[voter.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-green-600" />
          <p className="text-gray-600">Loading voters...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 font-semibold">Error loading voters</p>
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
            <Button>
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
                  <p className="text-sm font-medium text-gray-600">Total Voters</p>
                  <p className="text-3xl font-bold text-gray-900">{stats?.totalVoters || 0}</p>
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
                  <p className="text-3xl font-bold text-green-600">{stats?.verifiedVoters || 0}</p>
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
                  <p className="text-3xl font-bold text-purple-600">{stats?.votedCount || 0}</p>
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
                  <p className="text-3xl font-bold text-orange-600">{(stats?.totalVoters || 0) - (stats?.votedCount || 0)}</p>
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
                  <SelectItem value="INVITED">Invited</SelectItem>
                  <SelectItem value="VERIFIED">Verified</SelectItem>
                  <SelectItem value="BLOCKED">Blocked</SelectItem>
                </SelectContent>
              </Select>
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classYears.map(year => (
                    <SelectItem key={year} value={year!}>{year}</SelectItem>
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
                {filteredVoters.length > 0 ? (
                  filteredVoters.map((voter) => (
                    <TableRow key={voter.id}>
                      <TableCell className="font-medium">{voter.fullName}</TableCell>
                      <TableCell>{voter.phone}</TableCell>
                      <TableCell>{voter.classYearGroup || '-'}</TableCell>
                      <TableCell>{voter.uniqueIdentifier || '-'}</TableCell>
                      <TableCell>
                        <Badge className={`${getStatusBadgeClass(voter)} border-0`}>
                          {getStatusIcon(voter.status)}
                          <span className="ml-1">{getDisplayStatus(voter)}</span>
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {voter.lastLogin
                          ? new Date(voter.lastLogin).toLocaleDateString()
                          : 'Never'}
                      </TableCell>
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
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                      No voters found matching your criteria
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
  );
}

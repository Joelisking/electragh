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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import {
  MessageSquare,
  Download,
  RefreshCw,
  Filter,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';

interface SmsMessage {
  id: string;
  voterId: string | null;
  type: string;
  to: string;
  body: string;
  provider: string;
  status: string;
  providerMsgId: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  failedAt: string | null;
  error: string | null;
  errorCode: string | null;
  priceAmount: number | null;
  priceUnit: string | null;
  numSegments: number | null;
  from: string | null;
  createdAt: string;
  updatedAt: string;
  voter: {
    id: string;
    fullName: string;
    phone: string;
  } | null;
}

interface MessageStats {
  statusBreakdown: Record<string, number>;
  totalCost: number;
}

export default function MessagesPage() {
  const [messages, setMessages] = useState<SmsMessage[]>([]);
  const [stats, setStats] = useState<MessageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [providerFilter, setProviderFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 50;

  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  useEffect(() => {
    fetchMessages();
  }, [currentPage, statusFilter, typeFilter, providerFilter]);

  const fetchMessages = async () => {
    try {
      setRefreshing(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: limit.toString(),
      });

      if (statusFilter !== 'all')
        params.append('status', statusFilter);
      if (typeFilter !== 'all') params.append('type', typeFilter);
      if (providerFilter !== 'all')
        params.append('provider', providerFilter);

      const response = await fetch(
        `${apiUrl}/api/admin/sms-messages?${params.toString()}`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch messages');
      }

      const data = await response.json();
      setMessages(data.messages);
      setStats(data.stats);
      setTotal(data.pagination.total);
      setTotalPages(data.pagination.pages);
      setLoading(false);
    } catch (err) {
      toast.error('Failed to load messages');
      setLoading(false);
    } finally {
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchMessages();
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        page: '1',
        limit: '10000',
      });

      if (statusFilter !== 'all')
        params.append('status', statusFilter);
      if (typeFilter !== 'all') params.append('type', typeFilter);
      if (providerFilter !== 'all')
        params.append('provider', providerFilter);

      const response = await fetch(
        `${apiUrl}/api/admin/sms-messages?${params.toString()}`,
        { credentials: 'include' }
      );

      if (!response.ok) {
        throw new Error('Failed to export messages');
      }

      const data = await response.json();
      const csv = convertToCSV(data.messages);
      downloadCSV(
        csv,
        `sms-messages-${new Date().toISOString().split('T')[0]}.csv`
      );
      toast.success('Messages exported successfully');
    } catch (err) {
      toast.error('Failed to export messages');
    }
  };

  const convertToCSV = (data: SmsMessage[]): string => {
    const headers = [
      'ID',
      'Voter Name',
      'Phone',
      'Type',
      'Provider',
      'Status',
      'Message',
      'Provider Message ID',
      'Sent At',
      'Delivered At',
      'Failed At',
      'Error',
      'Price',
      'Segments',
      'Created At',
    ];

    const rows = data.map((msg) => [
      msg.id,
      msg.voter?.fullName || 'N/A',
      msg.to,
      msg.type,
      msg.provider,
      msg.status,
      `"${msg.body.replace(/"/g, '""')}"`,
      msg.providerMsgId || '',
      msg.sentAt ? new Date(msg.sentAt).toISOString() : '',
      msg.deliveredAt ? new Date(msg.deliveredAt).toISOString() : '',
      msg.failedAt ? new Date(msg.failedAt).toISOString() : '',
      msg.error ? `"${msg.error.replace(/"/g, '""')}"` : '',
      msg.priceAmount ? `${msg.priceAmount} ${msg.priceUnit}` : '',
      msg.numSegments || '',
      new Date(msg.createdAt).toISOString(),
    ]);

    return [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');
  };

  const downloadCSV = (csv: string, filename: string) => {
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<
      string,
      {
        variant: 'default' | 'secondary' | 'destructive' | 'outline';
        label: string;
      }
    > = {
      PENDING: { variant: 'outline', label: 'Pending' },
      QUEUED: { variant: 'secondary', label: 'Queued' },
      SENDING: { variant: 'secondary', label: 'Sending' },
      SENT: { variant: 'default', label: 'Sent' },
      DELIVERED: { variant: 'default', label: 'Delivered' },
      UNDELIVERED: { variant: 'destructive', label: 'Undelivered' },
      FAILED: { variant: 'destructive', label: 'Failed' },
      REJECTED: { variant: 'destructive', label: 'Rejected' },
      READ: { variant: 'default', label: 'Read' },
    };

    const config = statusConfig[status] || {
      variant: 'outline',
      label: status,
    };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getTypeBadge = (type: string) => {
    const typeConfig: Record<
      string,
      { className: string; label: string }
    > = {
      OTP_CODE: {
        className: 'bg-blue-100 text-blue-800',
        label: 'OTP',
      },
      VOTE_REMINDER: {
        className: 'bg-purple-100 text-purple-800',
        label: 'Reminder',
      },
      VOTE_CONFIRMATION: {
        className: 'bg-green-100 text-green-800',
        label: 'Confirmation',
      },
      ADMIN_NOTIFICATION: {
        className: 'bg-orange-100 text-orange-800',
        label: 'Admin',
      },
    };

    const config = typeConfig[type] || {
      className: 'bg-gray-100 text-gray-800',
      label: type,
    };
    return (
      <Badge variant="outline" className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const filteredMessages = messages.filter((msg) => {
    const matchesSearch =
      searchTerm === '' ||
      msg.to.toLowerCase().includes(searchTerm.toLowerCase()) ||
      msg.voter?.fullName
        .toLowerCase()
        .includes(searchTerm.toLowerCase()) ||
      msg.body.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            SMS Messages
          </h1>
          <p className="text-gray-500 mt-1">
            Track and monitor all SMS messages sent through the
            platform
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleRefresh}
            variant="outline"
            disabled={refreshing}>
            <RefreshCw
              className={`w-4 h-4 mr-2 ${
                refreshing ? 'animate-spin' : ''
              }`}
            />
            Refresh
          </Button>
          <Button onClick={handleExport} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Messages</CardDescription>
            <CardTitle className="text-3xl">{total}</CardTitle>
          </CardHeader>
        </Card>

        {stats &&
          Object.entries(stats.statusBreakdown).map(
            ([status, count]) => (
              <Card key={status}>
                <CardHeader className="pb-2">
                  <CardDescription>{status}</CardDescription>
                  <CardTitle className="text-3xl">{count}</CardTitle>
                </CardHeader>
              </Card>
            )
          )}

        {stats && stats.totalCost > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Cost</CardDescription>
              <CardTitle className="text-3xl">
                ${stats.totalCost.toFixed(4)}
              </CardTitle>
            </CardHeader>
          </Card>
        )}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Search
              </label>
              <Input
                placeholder="Phone, voter name, or message..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Status
              </label>
              <Select
                value={statusFilter}
                onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="QUEUED">Queued</SelectItem>
                  <SelectItem value="SENDING">Sending</SelectItem>
                  <SelectItem value="SENT">Sent</SelectItem>
                  <SelectItem value="DELIVERED">Delivered</SelectItem>
                  <SelectItem value="UNDELIVERED">
                    Undelivered
                  </SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Type
              </label>
              <Select
                value={typeFilter}
                onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="OTP_CODE">OTP Code</SelectItem>
                  <SelectItem value="VOTE_REMINDER">
                    Vote Reminder
                  </SelectItem>
                  <SelectItem value="VOTE_CONFIRMATION">
                    Vote Confirmation
                  </SelectItem>
                  <SelectItem value="ADMIN_NOTIFICATION">
                    Admin Notification
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Provider
              </label>
              <Select
                value={providerFilter}
                onValueChange={setProviderFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All providers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Providers</SelectItem>
                  <SelectItem value="arkesel">Arkesel</SelectItem>
                  <SelectItem value="twilio">Twilio</SelectItem>
                  <SelectItem value="whatsapp">WhatsApp</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Messages Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Messages ({filteredMessages.length})
          </CardTitle>
          <CardDescription>
            Showing {filteredMessages.length} of {total} total
            messages
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Voter</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Delivered</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Error</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredMessages.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={10}
                      className="text-center py-8 text-gray-500">
                      No messages found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredMessages.map((msg) => (
                    <TableRow key={msg.id}>
                      <TableCell className="font-medium">
                        {msg.voter?.fullName || 'N/A'}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {msg.to}
                      </TableCell>
                      <TableCell>{getTypeBadge(msg.type)}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className="capitalize">
                          {msg.provider}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(msg.status)}
                      </TableCell>
                      <TableCell
                        className="max-w-xs truncate"
                        title={msg.body}>
                        {msg.body}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {msg.sentAt
                          ? new Date(msg.sentAt).toLocaleString()
                          : '-'}
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {msg.deliveredAt
                          ? new Date(msg.deliveredAt).toLocaleString()
                          : '-'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {msg.priceAmount
                          ? `$${msg.priceAmount.toFixed(4)}`
                          : '-'}
                      </TableCell>
                      <TableCell className="max-w-xs">
                        {msg.error ? (
                          <span
                            className="text-xs text-red-600"
                            title={msg.error}>
                            {msg.errorCode || 'Error'}
                          </span>
                        ) : (
                          '-'
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-gray-600">
              Page {currentPage} of {totalPages} ({total} total
              messages)
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={currentPage === 1}>
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={currentPage === totalPages}>
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

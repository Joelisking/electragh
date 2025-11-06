'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { BarChart3, TrendingUp, Users, Vote, Clock, Download, RefreshCw, Eye, EyeOff } from 'lucide-react';

// Mock data - replace with real API calls
const mockElection = {
  id: '1',
  title: 'AGOSA Elections 2025',
  status: 'ACTIVE',
  startAt: '2025-11-29T00:01:00.000Z',
  endAt: '2025-11-30T23:59:00.000Z',
  totalVoters: 1347,
  votescast: 847,
  resultVisibility: 'RESTRICTED'
};

const mockPositions = [
  {
    id: '1',
    name: 'President',
    order: 1,
    totalVotes: 847,
    candidates: [
      { id: '1', name: 'John Doe', votes: 423, percentage: 49.9 },
      { id: '2', name: 'Jane Smith', votes: 324, percentage: 38.3 },
      { id: '3', name: 'Mike Johnson', votes: 100, percentage: 11.8 }
    ]
  },
  {
    id: '2',
    name: 'Vice President',
    order: 2,
    totalVotes: 847,
    candidates: [
      { id: '4', name: 'Sarah Wilson', votes: 456, percentage: 53.8 },
      { id: '5', name: 'Tom Brown', votes: 391, percentage: 46.2 }
    ]
  },
  {
    id: '3',
    name: 'Secretary',
    order: 3,
    totalVotes: 847,
    candidates: [
      { id: '6', name: 'Lisa Davis', votes: 512, percentage: 60.5 },
      { id: '7', name: 'Chris Lee', votes: 335, percentage: 39.5 }
    ]
  }
];

const mockVotingTrend = [
  { time: '09:00', votes: 45 },
  { time: '10:00', votes: 123 },
  { time: '11:00', votes: 234 },
  { time: '12:00', votes: 345 },
  { time: '13:00', votes: 456 },
  { time: '14:00', votes: 567 },
  { time: '15:00', votes: 678 },
  { time: '16:00', votes: 789 },
  { time: '17:00', votes: 847 }
];

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function ResultsPage() {
  const [refreshing, setRefreshing] = useState(false);
  const [resultsVisible, setResultsVisible] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState(mockPositions[0]);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const handleToggleResultsVisibility = () => {
    setResultsVisible(!resultsVisible);
    // In real implementation, this would call API to update election settings
  };

  const exportResults = () => {
    // Mock export functionality
    const data = {
      election: mockElection,
      positions: mockPositions,
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agosa-election-results-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const votingPercentage = (mockElection.votescast / mockElection.totalVoters) * 100;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Election Results</h1>
          <p className="text-gray-600 mt-1">Real-time voting results and analytics</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            onClick={handleToggleResultsVisibility}
          >
            {resultsVisible ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
            {resultsVisible ? 'Hide Results' : 'Show Results'}
          </Button>
          <Button onClick={exportResults}>
            <Download className="w-4 h-4 mr-2" />
            Export Results
          </Button>
        </div>
      </div>

      {/* Election Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Vote className="w-5 h-5" />
            {mockElection.title}
          </CardTitle>
          <CardDescription>
            Election Status: <Badge variant={mockElection.status === 'ACTIVE' ? 'default' : 'secondary'}>
              {mockElection.status}
            </Badge>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{mockElection.totalVoters}</div>
              <div className="text-sm text-gray-600">Total Voters</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{mockElection.votescast}</div>
              <div className="text-sm text-gray-600">Votes Cast</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{votingPercentage.toFixed(1)}%</div>
              <div className="text-sm text-gray-600">Turnout</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{mockElection.totalVoters - mockElection.votescast}</div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex justify-between text-sm text-gray-600 mb-2">
              <span>Voting Progress</span>
              <span>{votingPercentage.toFixed(1)}%</span>
            </div>
            <Progress value={votingPercentage} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Voting Trend Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            Voting Trend
          </CardTitle>
          <CardDescription>Real-time voting activity throughout the day</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={mockVotingTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="votes" stroke="#8884d8" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Results Section */}
      {resultsVisible && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Position Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Results by Position</CardTitle>
              <CardDescription>Select a position to view detailed results</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {mockPositions.map((position) => (
                  <Button
                    key={position.id}
                    variant={selectedPosition.id === position.id ? "default" : "outline"}
                    className="w-full justify-start"
                    onClick={() => setSelectedPosition(position)}
                  >
                    {position.name}
                    <Badge variant="secondary" className="ml-auto">
                      {position.totalVotes} votes
                    </Badge>
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Position Results Chart */}
          <Card>
            <CardHeader>
              <CardTitle>{selectedPosition.name} Results</CardTitle>
              <CardDescription>Vote distribution for {selectedPosition.name}</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={selectedPosition.candidates}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name}: ${percentage}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="votes"
                  >
                    {selectedPosition.candidates.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Results Table */}
      {resultsVisible && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5" />
              Detailed Results
            </CardTitle>
            <CardDescription>Complete breakdown of all positions and candidates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {mockPositions.map((position) => (
                <div key={position.id} className="border rounded-lg p-4">
                  <h3 className="font-semibold text-lg mb-3">{position.name}</h3>
                  <div className="space-y-3">
                    {position.candidates.map((candidate, index) => (
                      <div key={candidate.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                        <div className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-sm font-bold ${
                            index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-orange-600'
                          }`}>
                            {index + 1}
                          </div>
                          <span className="font-medium">{candidate.name}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="font-semibold">{candidate.votes} votes</div>
                            <div className="text-sm text-gray-600">{candidate.percentage}%</div>
                          </div>
                          <div className="w-20">
                            <Progress value={candidate.percentage} className="h-2" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Visibility Warning */}
      {!resultsVisible && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-yellow-800">
              <EyeOff className="w-5 h-5" />
              <span className="font-medium">Results are currently hidden</span>
            </div>
            <p className="text-yellow-700 mt-1">
              Click "Show Results" to view detailed voting results. Results visibility can be controlled based on election settings.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
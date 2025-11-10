'use client';

import { useState, useEffect } from 'react';
import {
  ResultsHeader,
  ElectionOverview,
  PositionResults,
  LeadingCandidates,
} from './components';
import { Card, CardContent } from '@/components/ui/card';
import { EyeOff } from 'lucide-react';

interface Candidate {
  id: string;
  name: string;
  classYearGroup?: string;
  votes: number;
  percentage: number;
}

interface Position {
  positionId: string;
  positionName: string;
  totalVotes: number;
  candidates: Candidate[];
}

interface ElectionResults {
  electionId: string;
  electionTitle: string;
  status: string;
  totalBallots: number;
  results: Position[];
}

export default function ResultsPage() {
  const [results, setResults] = useState<ElectionResults | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [totalVoters, setTotalVoters] = useState(0);

  const apiUrl =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

  const fetchVoterCount = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/voters/stats`, {
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setTotalVoters(data.totalVoters || 0);
      }
    } catch (err) {
      console.error('Error fetching voter count:', err);
    }
  };

  const fetchResults = async () => {
    try {
      setError(null);
      const response = await fetch(`${apiUrl}/api/election/results`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch results');
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'An error occurred'
      );
      console.error('Error fetching results:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchResults();
    fetchVoterCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchResults();
    fetchVoterCount();
  };

  const exportResults = () => {
    if (!results) return;

    const data = {
      election: {
        id: results.electionId,
        title: results.electionTitle,
        status: results.status,
        totalVoters,
        votescast: results.totalBallots,
      },
      positions: results.results,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `election-results-${
      new Date().toISOString().split('T')[0]
    }.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading results...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-red-600 font-semibold">
            Error loading results
          </p>
          <p className="text-gray-600 mt-2">{error}</p>
        </div>
      </div>
    );
  }

  if (!results || results.results.length === 0) {
    return (
      <div className="space-y-6">
        <ResultsHeader
          isRefreshing={refreshing}
          onRefresh={handleRefresh}
          onExport={exportResults}
        />
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-yellow-800">
              <EyeOff className="w-5 h-5" />
              <span className="font-medium">
                No results available yet
              </span>
            </div>
            <p className="text-yellow-700 mt-1">
              Results will appear here once voting begins and ballots
              are cast.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ResultsHeader
        isRefreshing={refreshing}
        onRefresh={handleRefresh}
        onExport={exportResults}
      />

      <ElectionOverview
        title={results.electionTitle}
        status={results.status}
        totalVoters={totalVoters}
        totalBallots={results.totalBallots}
      />

      <LeadingCandidates positions={results.results} />

      <PositionResults positions={results.results} />
    </div>
  );
}

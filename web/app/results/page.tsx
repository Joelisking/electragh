'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Vote, ArrowLeft, Trophy, Users, BarChart3, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { useGetApiVotingElection } from '@/lib/api/voting/voting';
import { useGetApiResultsPublicElectionId } from '@/lib/api/results/results';

export default function ResultsPage() {
  const router = useRouter();

  // Get current election info first
  const {
    data: electionData,
    isLoading: electionLoading,
    error: electionError,
  } = useGetApiVotingElection({
    query: {
      enabled: true,
    },
  });

  const electionId = electionData?.election?.id;

  // Get results data
  const {
    data: resultsData,
    isLoading: resultsLoading,
    error: resultsError,
    refetch: refetchResults,
  } = useGetApiResultsPublicElectionId(electionId || '', {
    query: {
      enabled: !!electionId,
    },
  });

  const handleRefresh = () => {
    refetchResults();
  };

  const getWinner = (candidates: any[]) => {
    return candidates.reduce((prev, current) =>
      (prev.votes > current.votes) ? prev : current
    );
  };

  const isLoading = electionLoading || resultsLoading;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-yellow-50">
      {/* Header */}
      <header className="bg-white border-b border-green-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <Button
                onClick={() => router.push('/')}
                variant="ghost"
                size="sm"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </div>
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-green-700 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Election Results
                </h1>
                <p className="text-sm text-gray-600">
                  Live Results & Statistics
                </p>
              </div>
            </div>
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-2" />
              )}
              Refresh
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-green-600" />
            <p className="text-gray-600">Loading election results...</p>
          </div>
        ) : electionError || resultsError || !resultsData ? (
          <div className="text-center py-12">
            <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-600" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Unable to Load Results
            </h2>
            <p className="text-gray-600 mb-6">
              {electionError ? 'Failed to load election data.' :
               resultsError ? 'Failed to load results data.' :
               'No election results available.'}
            </p>
            <Button onClick={() => router.push('/')}>Go Home</Button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Election Overview */}
            <div className="text-center">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                {resultsData.election?.title}
              </h2>
              <Badge
                variant="outline"
                className="bg-green-50 text-green-700 border-green-200 mb-6"
              >
                {resultsData.election?.status}
              </Badge>
            </div>

            {/* Statistics Cards */}
            <div className="grid md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="text-center">
                  <Users className="w-8 h-8 mx-auto mb-2 text-green-600" />
                  <CardTitle>Total Voters</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-3xl font-bold text-green-600">
                    {resultsData.totalVoters?.toLocaleString() || 0}
                  </p>
                  <p className="text-sm text-gray-600">
                    Registered voters
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="text-center">
                  <Vote className="w-8 h-8 mx-auto mb-2 text-green-600" />
                  <CardTitle>Ballots Cast</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-3xl font-bold text-green-600">
                    {resultsData.totalBallots?.toLocaleString() || 0}
                  </p>
                  <p className="text-sm text-gray-600">
                    Votes submitted
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="text-center">
                  <BarChart3 className="w-8 h-8 mx-auto mb-2 text-green-600" />
                  <CardTitle>Turnout Rate</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-3xl font-bold text-green-600">
                    {resultsData.turnoutRate?.toFixed(1) || 0}%
                  </p>
                  <p className="text-sm text-gray-600">
                    Voter participation
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Position Results */}
            <div className="space-y-6">
              <h3 className="text-2xl font-bold text-gray-900 text-center">
                Position Results
              </h3>

              {resultsData.election?.positions?.map((position) => {
                const candidates = position.candidates || [];
                const winner = candidates.length > 0 ? getWinner(candidates) : null;
                const totalVotes = candidates.reduce((sum, candidate) => sum + (candidate.votes || 0), 0);

                return (
                  <Card key={position.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xl">{position.name}</CardTitle>
                        <Badge variant="secondary">
                          {totalVotes.toLocaleString()} total votes
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {candidates
                          .sort((a, b) => (b.votes || 0) - (a.votes || 0))
                          .map((candidate) => (
                          <div
                            key={candidate.id}
                            className={`p-4 rounded-lg border ${
                              winner && candidate.id === winner.id
                                ? 'bg-green-50 border-green-200'
                                : 'bg-gray-50 border-gray-200'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-3">
                                {winner && candidate.id === winner.id && (
                                  <Trophy className="w-5 h-5 text-yellow-500" />
                                )}
                                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                  <span className="text-green-600 font-medium">
                                    {candidate.name?.charAt(0) || '?'}
                                  </span>
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-900">
                                    {candidate.name}
                                    {winner && candidate.id === winner.id && (
                                      <span className="ml-2 text-green-600 font-medium">
                                        (Winner)
                                      </span>
                                    )}
                                  </p>
                                  <p className="text-sm text-gray-600">
                                    {candidate.classYearGroup}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-lg">
                                  {(candidate.votes || 0).toLocaleString()}
                                </p>
                                <p className="text-sm text-gray-600">
                                  {candidate.percentage?.toFixed(1) || 0}%
                                </p>
                              </div>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className="bg-green-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${candidate.percentage || 0}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Election Integrity Notice */}
            <Card className="border-green-200 bg-green-50">
            <CardContent className="pt-6">
              <div className="flex items-start space-x-3">
                <Vote className="w-6 h-6 text-green-600 mt-1" />
                <div>
                  <h4 className="font-semibold text-green-800 mb-2">
                    Election Integrity Verified
                  </h4>
                  <ul className="text-sm text-green-700 space-y-1">
                    <li>• All votes cast using secure SMS authentication</li>
                    <li>• Each voter permitted only one ballot submission</li>
                    <li>• Anonymous voting ensures ballot privacy</li>
                    <li>• Results verified through cryptographic audit trails</li>
                  </ul>
                </div>
              </div>
            </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-gray-600 mb-2">
              Ghana Election Platform - Transparent Results
            </p>
            <p className="text-sm text-gray-500">
              Results updated in real-time • Last updated: {new Date().toLocaleString()}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
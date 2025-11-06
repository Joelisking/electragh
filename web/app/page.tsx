'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Vote, Clock, Users, Trophy, Lock, ArrowRight, Calendar, MapPin, CheckCircle, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthContext';
import { useGetApiVotingElection } from '@/lib/api/voting/voting';
import { toast } from 'sonner';

export default function HomePage() {
  const router = useRouter();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();

  // Redirect to auth page if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth');
    }
  }, [isAuthenticated, authLoading, router]);

  // Fetch election data
  const {
    data: electionData,
    isLoading: electionLoading,
    error: electionError,
  } = useGetApiVotingElection({
    query: {
      enabled: true,
    },
  });

  const handleVoteClick = () => {
    if (!isAuthenticated) {
      router.push('/auth');
    } else {
      router.push('/vote');
    }
  };

  const election = electionData?.election;
  const hasVoted = electionData?.votingStatus?.hasVoted;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-yellow-50">
      {/* Header */}
      <header className="bg-white border-b border-green-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-green-700 rounded-lg flex items-center justify-center">
                <Vote className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Ghana Election Platform
                </h1>
                <p className="text-sm text-gray-600">
                  Secure • Transparent • Accessible
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              {election && (
                <Button
                  onClick={() => router.push('/results')}
                  variant="outline"
                  size="sm"
                >
                  View Results
                </Button>
              )}
              {isAuthenticated && (
                <span className="text-sm text-gray-600">
                  Welcome, {user?.fullName || user?.phoneNumber}
                </span>
              )}
              {election ? (
                <Badge
                  variant="outline"
                  className="bg-green-50 text-green-700 border-green-200">
                  <Clock className="w-3 h-3 mr-1" />
                  Election Active
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
                  <Clock className="w-3 h-3 mr-1" />
                  No Active Election
                </Badge>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {electionLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-green-600" />
            <p className="text-gray-600">Loading election information...</p>
          </div>
        ) : election ? (
          <div className="space-y-8">
            {/* Hero Section */}
            <div className="text-center">
              <h2 className="text-4xl font-bold text-gray-900 mb-4">
                {election.title}
              </h2>
              <p className="text-xl text-gray-600 mb-8">
                {election.description}
              </p>

              {hasVoted ? (
                <div className="inline-flex items-center space-x-2 bg-green-50 text-green-800 px-6 py-3 rounded-full border border-green-200">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-medium">You have already voted</span>
                </div>
              ) : (
                <Button
                  onClick={handleVoteClick}
                  size="lg"
                  className="bg-green-600 hover:bg-green-700 text-lg px-8 py-3"
                >
                  <Vote className="w-5 h-5 mr-2" />
                  {isAuthenticated ? 'Cast Your Vote' : 'Login to Vote'}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              )}
            </div>

            {/* Election Info Cards */}
            <div className="grid md:grid-cols-2 gap-6">

              <Card>
                <CardHeader className="text-center">
                  <Users className="w-8 h-8 mx-auto mb-2 text-green-600" />
                  <CardTitle>Positions</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-3xl font-bold text-green-600">
                    {election.positions?.length || 0}
                  </p>
                  <p className="text-sm text-gray-600">
                    {election.positions?.length === 1 ? 'Position' : 'Positions'} to vote for
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="text-center">
                  <Trophy className="w-8 h-8 mx-auto mb-2 text-green-600" />
                  <CardTitle>Candidates</CardTitle>
                </CardHeader>
                <CardContent className="text-center">
                  <p className="text-3xl font-bold text-green-600">
                    {election.positions?.reduce((total, position) => total + (position.candidates?.length || 0), 0) || 0}
                  </p>
                  <p className="text-sm text-gray-600">
                    Total candidates across all positions
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Positions Preview */}
            {election.positions && election.positions.length > 0 && (
              <div>
                <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                  Election Positions
                </h3>
                <div className="grid gap-4">
                  {election.positions.map((position) => (
                    <Card key={position.id}>
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between">
                          {position.name}
                          <Badge variant="secondary">
                            {position.candidates?.length || 0} candidates
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      {position.candidates && position.candidates.length > 0 && (
                        <CardContent>
                          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {position.candidates.map((candidate) => (
                              <div
                                key={candidate.id}
                                className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg"
                              >
                                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                  <span className="text-green-600 font-medium">
                                    {candidate.fullName?.charAt(0) || '?'}
                                  </span>
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900">
                                    {candidate.fullName}
                                  </p>
                                  {candidate.classYearGroup && (
                                    <p className="text-sm text-gray-600">
                                      {candidate.classYearGroup}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Security Notice */}
            <Card className="border-green-200 bg-green-50">
              <CardContent className="pt-6">
                <div className="flex items-start space-x-3">
                  <Lock className="w-6 h-6 text-green-600 mt-1" />
                  <div>
                    <h4 className="font-semibold text-green-800 mb-2">
                      Secure & Transparent Voting
                    </h4>
                    <ul className="text-sm text-green-700 space-y-1">
                      <li>• SMS-based voter authentication</li>
                      <li>• One vote per registered voter</li>
                      <li>• Anonymous ballot casting</li>
                      <li>• Real-time result tracking</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="text-center py-12">
            <Vote className="w-16 h-16 mx-auto mb-4 text-gray-400" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              No Active Election
            </h2>
            <p className="text-gray-600 mb-6">
              There are currently no active elections. Check back later for upcoming elections.
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-gray-600 mb-2">
              Ghana Election Platform - Secure, Transparent, Accessible
            </p>
            {election && (
              <p className="text-sm text-gray-500">
                Active Election: {election.title}
              </p>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}

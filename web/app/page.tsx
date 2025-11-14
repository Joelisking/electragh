'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Vote,
  Clock,
  Users,
  Trophy,
  Lock,
  ArrowRight,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/lib/auth/AuthContext';
import { useGetApiVotingElection } from '@/lib/api/voting/voting';

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
    // error: electionError,
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
    <div className="min-h-screen bg-gradient-to-br from-electra-primary-light via-white to-electra-secondary-light">
      {/* Header */}
      <header className="bg-white border-b border-electra-primary/20 shadow-sm backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-electra-primary to-electra-secondary rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                <Image
                  src="/logo.png"
                  alt="ElectraGH"
                  width={24}
                  height={24}
                  className="w-5 h-5 sm:w-6 sm:h-6"
                />
              </div>
              <div className="min-w-0">
                <h1 className="text-lg sm:text-xl font-bold ">
                  ElectraGH
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 font-medium hidden sm:block">
                  Digital • Secure • Transparent
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3 flex-shrink-0">
              {election && (
                <Button
                  onClick={() => router.push('/results')}
                  variant="outline"
                  size="sm"
                  className="hidden sm:inline-flex text-xs sm:text-sm px-2 sm:px-3 h-8 sm:h-9">
                  View Results
                </Button>
              )}
              {isAuthenticated && (
                <span className="text-xs sm:text-sm text-gray-600 hidden md:inline max-w-[120px] lg:max-w-none truncate">
                  Welcome, {user?.fullName || user?.phoneNumber}
                </span>
              )}
              {election ? (
                <Badge
                  variant="outline"
                  className="bg-electra-primary-light text-electra-primary border-electra-primary/30 text-xs px-2 py-1">
                  <Clock className="w-2 h-2 sm:w-3 sm:h-3 mr-1" />
                  <span className="hidden sm:inline">Election </span>
                  Active
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="bg-gray-50 text-gray-700 border-gray-200 text-xs px-2 py-1">
                  <Clock className="w-2 h-2 sm:w-3 sm:h-3 mr-1" />
                  <span className="hidden sm:inline">No </span>
                  Inactive
                </Badge>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {electionLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-electra-primary" />
            <p className="text-gray-600 text-sm sm:text-base">
              Loading election information...
            </p>
          </div>
        ) : election ? (
          <div className="space-y-6 sm:space-y-8">
            {/* Hero Section */}
            <div className="text-center px-4">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4 leading-tight">
                {election.title}
              </h2>
              <p className="text-base sm:text-lg lg:text-xl text-gray-600 mb-6 sm:mb-8 max-w-3xl mx-auto leading-relaxed">
                {election.description}
              </p>

              {hasVoted ? (
                <div className="inline-flex items-center space-x-2 bg-electra-primary-light text-electra-primary px-4 sm:px-6 py-3 sm:py-4 rounded-full border border-electra-primary/30 shadow-lg text-sm sm:text-base">
                  <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  <span className="font-medium">
                    You have already voted
                  </span>
                </div>
              ) : (
                <Button
                  onClick={handleVoteClick}
                  size="lg"
                  className="bg-electra-primary hover:bg-electra-secondary text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 h-12 sm:h-14 shadow-xl hover:shadow-2xl transition-all duration-200 w-full sm:w-auto">
                  <Vote className="w-4 h-4 sm:w-5 sm:h-5 mr-2 flex-shrink-0" />
                  {isAuthenticated
                    ? 'Cast Your Vote'
                    : 'Login to Vote'}
                  <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2 flex-shrink-0" />
                </Button>
              )}
            </div>

            {/* Election Info Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader className="text-center pb-3 sm:pb-4">
                  <Users className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 text-electra-primary" />
                  <CardTitle className="text-lg sm:text-xl">
                    Positions
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center pt-0">
                  <p className="text-2xl sm:text-3xl font-bold text-electra-primary mb-1">
                    {election.positions?.length || 0}
                  </p>
                  <p className="text-sm sm:text-base text-gray-600">
                    {election.positions?.length === 1
                      ? 'Position'
                      : 'Positions'}{' '}
                    to vote for
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader className="text-center pb-3 sm:pb-4">
                  <Trophy className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 text-electra-primary" />
                  <CardTitle className="text-lg sm:text-xl">
                    Candidates
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center pt-0">
                  <p className="text-2xl sm:text-3xl font-bold text-electra-primary mb-1">
                    {election.positions?.reduce(
                      (total, position) =>
                        total + (position.candidates?.length || 0),
                      0
                    ) || 0}
                  </p>
                  <p className="text-sm sm:text-base text-gray-600">
                    Total candidates across all positions
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Positions Preview */}
            {election.positions && election.positions.length > 0 && (
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6 text-center">
                  Election Positions
                </h3>
                <div className="grid gap-4 sm:gap-6">
                  {election.positions.map((position) => (
                    <Card
                      key={position.id}
                      className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                      <CardHeader className="pb-3 sm:pb-4">
                        <CardTitle className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-lg sm:text-xl">
                          <span className="text-center sm:text-left">
                            {position.name}
                          </span>
                          <Badge
                            variant="secondary"
                            className="self-center sm:self-auto text-xs sm:text-sm">
                            {position.candidates?.length || 0}{' '}
                            candidates
                          </Badge>
                        </CardTitle>
                      </CardHeader>
                      {position.candidates &&
                        position.candidates.length > 0 && (
                          <CardContent className="pt-0">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                              {position.candidates.map(
                                (candidate) => (
                                  <div
                                    key={candidate.id}
                                    className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-electra-primary-light rounded-full flex items-center justify-center flex-shrink-0">
                                      <span className="text-electra-primary font-medium text-sm sm:text-base">
                                        {candidate.fullName?.charAt(
                                          0
                                        ) || '?'}
                                      </span>
                                    </div>
                                    <div className="min-w-0 flex-1">
                                      <p className="font-medium text-gray-900 text-sm sm:text-base truncate">
                                        {candidate.fullName}
                                      </p>
                                      {candidate.classYearGroup && (
                                        <p className="text-xs sm:text-sm text-gray-600 truncate">
                                          {candidate.classYearGroup}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                )
                              )}
                            </div>
                          </CardContent>
                        )}
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Security Notice */}
            <Card className="border-electra-primary/30 bg-electra-primary-light/50 shadow-lg">
              <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6">
                <div className="flex items-start space-x-3 sm:space-x-4">
                  <Lock className="w-5 h-5 sm:w-6 sm:h-6 text-electra-primary mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-electra-secondary mb-2 sm:mb-3 text-base sm:text-lg">
                      Secure & Transparent Digital Voting
                    </h4>
                    <ul className="text-sm sm:text-base text-electra-primary space-y-1 sm:space-y-2">
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
          <div className="text-center py-12 px-4">
            <Vote className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 text-gray-400" />
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
              No Active Election
            </h2>
            <p className="text-sm sm:text-base text-gray-600 mb-6 max-w-md mx-auto">
              There are currently no active elections. Check back
              later for upcoming elections.
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 mt-12 sm:mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="text-center">
            <p className="text-sm sm:text-base text-gray-600 mb-2">
              ElectraGH - Ghana&apos;s Premier Digital Voting Platform
            </p>
            {election && (
              <p className="text-xs sm:text-sm text-gray-500 truncate">
                Active Election: {election.title}
              </p>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}

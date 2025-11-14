'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Vote,
  ArrowLeft,
  Trophy,
  Users,
  BarChart3,
  Loader2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import Image from 'next/image';
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
      prev.votes > current.votes ? prev : current
    );
  };

  const isLoading = electionLoading || resultsLoading;

  // Check if the error is a visibility restriction
  const getErrorMessage = () => {
    if (resultsError) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const errorMessage =
        (resultsError as any)?.response?.data?.message || '';

      if (errorMessage.includes('restricted to EC members')) {
        return {
          title: 'Results Not Yet Available',
          message:
            'Election results are currently restricted to Electoral Commission members only. Results will be made publicly available after the election concludes.',
          type: 'restricted' as const,
        };
      }

      if (errorMessage.includes('after the election ends')) {
        return {
          title: 'Results Not Yet Available',
          message:
            'Election results will be publicly available once the election has ended. Please check back later.',
          type: 'pending' as const,
        };
      }

      return {
        title: 'Unable to Load Results',
        message:
          'Failed to load results data. Please try again later.',
        type: 'error' as const,
      };
    }

    if (electionError) {
      return {
        title: 'Unable to Load Results',
        message: 'Failed to load election data.',
        type: 'error' as const,
      };
    }

    return {
      title: 'Unable to Load Results',
      message: 'No election results available.',
      type: 'error' as const,
    };
  };

  const errorInfo = getErrorMessage();

  return (
    <div className="min-h-screen bg-gradient-to-br from-electra-primary-light via-white to-electra-secondary-light">
      {/* Header */}
      <header className="bg-white border-b border-electra-primary/20 shadow-sm backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 sm:h-20">
            <div className="flex items-center space-x-2 sm:space-x-3">
              <Button
                onClick={() => router.push('/')}
                variant="ghost"
                size="sm"
                className="h-9 px-2 sm:px-3 text-sm">
                <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Back to Home</span>
                <span className="sm:hidden">Back</span>
              </Button>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-3 flex-1 justify-center min-w-0">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-electra-primary to-electra-secondary rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
                <Image
                  src="/logo.png"
                  alt="ElectraGH"
                  width={24}
                  height={24}
                  className="w-5 h-5 sm:w-6 sm:h-6"
                />
              </div>
              <div className="min-w-0 text-center sm:text-left">
                <h1 className="text-lg sm:text-xl font-bold text-transparent truncate">
                  ElectraGH Results
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 font-medium hidden sm:block">
                  Real-time Transparency
                </p>
              </div>
            </div>
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              disabled={isLoading}
              className="h-9 px-2 sm:px-3 text-sm flex-shrink-0">
              {isLoading ? (
                <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2 animate-spin" />
              ) : (
                <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
              )}
              <span className="hidden sm:inline">Refresh</span>
              <span className="sm:hidden">↻</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {isLoading ? (
          <div className="text-center py-12">
            <Loader2 className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-4 animate-spin text-electra-primary" />
            <p className="text-sm sm:text-base text-gray-600">
              Loading election results...
            </p>
          </div>
        ) : electionError || resultsError || !resultsData ? (
          <div className="text-center py-12 px-4">
            <AlertCircle
              className={`w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-4 ${
                errorInfo.type === 'error'
                  ? 'text-red-600'
                  : 'text-yellow-600'
              }`}
            />
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
              {errorInfo.title}
            </h2>
            <p className="text-sm sm:text-base text-gray-600 mb-6 max-w-md mx-auto">
              {errorInfo.message}
            </p>
            <Button
              onClick={() => router.push('/')}
              className="h-10 sm:h-11 px-6">
              Go Home
            </Button>
          </div>
        ) : (
          <div className="space-y-6 sm:space-y-8">
            {/* Election Overview */}
            <div className="text-center px-4">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-3 sm:mb-4 leading-tight">
                {resultsData.election?.title}
              </h2>
              <Badge
                variant="outline"
                className="bg-electra-primary-light text-electra-primary border-electra-primary/30 mb-4 sm:mb-6 shadow-sm text-sm px-3 py-1">
                {resultsData.election?.status}
              </Badge>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader className="text-center pb-3 sm:pb-4">
                  <Users className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 text-electra-primary" />
                  <CardTitle className="text-base sm:text-lg">
                    Total Voters
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center pt-0">
                  <p className="text-2xl sm:text-3xl font-bold text-electra-primary mb-1">
                    {resultsData.totalVoters?.toLocaleString() || 0}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-600">
                    Registered voters
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader className="text-center pb-3 sm:pb-4">
                  <Vote className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 text-electra-primary" />
                  <CardTitle className="text-base sm:text-lg">
                    Ballots Cast
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center pt-0">
                  <p className="text-2xl sm:text-3xl font-bold text-electra-primary mb-1">
                    {resultsData.totalBallots?.toLocaleString() || 0}
                  </p>
                  <p className="text-xs sm:text-sm text-gray-600">
                    Votes submitted
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader className="text-center pb-3 sm:pb-4">
                  <BarChart3 className="w-6 h-6 sm:w-8 sm:h-8 mx-auto mb-2 text-electra-primary" />
                  <CardTitle className="text-base sm:text-lg">
                    Turnout Rate
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-center pt-0">
                  <p className="text-2xl sm:text-3xl font-bold text-electra-primary mb-1">
                    {resultsData.turnoutRate?.toFixed(1) || 0}%
                  </p>
                  <p className="text-xs sm:text-sm text-gray-600">
                    Voter participation
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Position Results */}
            <div className="space-y-4 sm:space-y-6">
              <h3 className="text-xl sm:text-2xl font-bold text-gray-900 text-center">
                Position Results
              </h3>

              {resultsData.election?.positions?.map((position) => {
                const candidates = position.candidates || [];
                const winner =
                  candidates.length > 0
                    ? getWinner(candidates)
                    : null;
                const totalVotes = candidates.reduce(
                  (sum, candidate) => sum + (candidate.votes || 0),
                  0
                );

                return (
                  <Card
                    key={position.id}
                    className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                    <CardHeader className="pb-3 sm:pb-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <CardTitle className="text-lg sm:text-xl text-center sm:text-left">
                          {position.name}
                        </CardTitle>
                        <Badge
                          variant="secondary"
                          className="self-center sm:self-auto text-xs sm:text-sm">
                          {totalVotes.toLocaleString()} total votes
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-3 sm:space-y-4">
                        {candidates
                          .sort(
                            (a, b) => (b.votes || 0) - (a.votes || 0)
                          )
                          .map((candidate) => (
                            <div
                              key={candidate.id}
                              className={`p-3 sm:p-4 rounded-lg border ${
                                winner && candidate.id === winner.id
                                  ? 'bg-electra-primary-light/50 border-electra-primary/30'
                                  : 'bg-gray-50 border-gray-200'
                              }`}>
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center space-x-3 flex-1 min-w-0">
                                  {winner &&
                                    candidate.id === winner.id && (
                                      <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-500 flex-shrink-0" />
                                    )}
                                  <div className="w-8 h-8 sm:w-10 sm:h-10 bg-electra-primary-light rounded-full flex items-center justify-center flex-shrink-0">
                                    <span className="text-electra-primary font-medium text-sm sm:text-base">
                                      {candidate.name?.charAt(0) ||
                                        '?'}
                                    </span>
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="font-semibold text-gray-900 text-sm sm:text-base leading-tight">
                                      {candidate.name}
                                      {winner &&
                                        candidate.id ===
                                          winner.id && (
                                          <span className="ml-2 text-electra-primary font-medium text-xs sm:text-sm">
                                            (Winner)
                                          </span>
                                        )}
                                    </p>
                                    <p className="text-xs sm:text-sm text-gray-600 truncate">
                                      {candidate.classYearGroup}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right flex-shrink-0">
                                  <p className="font-bold text-base sm:text-lg">
                                    {(
                                      candidate.votes || 0
                                    ).toLocaleString()}
                                  </p>
                                  <p className="text-xs sm:text-sm text-gray-600">
                                    {candidate.percentage?.toFixed(
                                      1
                                    ) || 0}
                                    %
                                  </p>
                                </div>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3">
                                <div
                                  className="bg-electra-primary h-2 sm:h-3 rounded-full transition-all duration-300"
                                  style={{
                                    width: `${
                                      candidate.percentage || 0
                                    }%`,
                                  }}
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
            <Card className="border-electra-primary/30 bg-electra-primary-light/50 shadow-lg">
              <CardContent className="pt-4 sm:pt-6 px-4 sm:px-6">
                <div className="flex items-start space-x-3 sm:space-x-4">
                  <Vote className="w-5 h-5 sm:w-6 sm:h-6 text-electra-primary mt-1 flex-shrink-0" />
                  <div>
                    <h4 className="font-semibold text-electra-secondary mb-2 sm:mb-3 text-base sm:text-lg">
                      Election Integrity Verified
                    </h4>
                    <ul className="text-sm sm:text-base text-electra-primary space-y-1 sm:space-y-2">
                      <li>
                        • All votes cast using secure SMS
                        authentication
                      </li>
                      <li>
                        • Each voter permitted only one ballot
                        submission
                      </li>
                      <li>
                        • Anonymous voting ensures ballot privacy
                      </li>
                      <li>
                        • Results verified through cryptographic audit
                        trails
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-200 mt-12 sm:mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          <div className="text-center">
            <p className="text-sm sm:text-base text-gray-600 mb-2">
              ElectraGH - Real-time Transparent Results
            </p>
            <p className="text-xs sm:text-sm text-gray-500">
              Results updated in real-time • Last updated:{' '}
              {new Date().toLocaleString()}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

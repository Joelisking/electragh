'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { useAuth } from '@/lib/auth/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  RadioGroup,
  RadioGroupItem,
} from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Vote,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  SkipForward,
  LogOut,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  useGetApiVotingElection,
  usePostApiVotingCast,
} from '@/lib/api/voting/voting';

interface Candidate {
  id: string;
  fullName: string;
  classYearGroup?: string;
  photoUrl?: string;
  bio?: string;
}

interface Position {
  id: string;
  name: string;
  order: number;
  candidates: Candidate[];
}

interface VoteData {
  [positionId: string]: string; // candidateId
}

export default function VotePage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [votes, setVotes] = useState<VoteData>({});
  const [showReview, setShowReview] = useState(false);

  const router = useRouter();
  const { user, logout } = useAuth();

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

  // Cast votes mutation
  const castVotesMutation = usePostApiVotingCast({
    mutation: {
      onSuccess: () => {
        toast.success('Your votes have been submitted successfully!');
        // Redirect to a confirmation page
        router.push('/');
      },
      onError: (error: any) => {
        console.error('Failed to cast votes:', error);
        toast.error(
          error.response?.data?.message ||
            'Failed to submit votes. Please try again.'
        );
      },
    },
  });

  // Authentication check
  useEffect(() => {
    if (!user?.isAuthenticated) {
      router.push('/auth');
    }
  }, [user, router]);

  // Handle election data errors
  useEffect(() => {
    if (electionError) {
      toast.error('Failed to load election data. Please try again.');
    }
  }, [electionError]);

  // Check if user has already voted
  useEffect(() => {
    if (electionData?.votingStatus?.hasVoted) {
      toast.info('You have already voted in this election.');
      router.push('/');
    }
  }, [electionData, router]);

  // Show loading while checking authentication
  if (!user?.isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-electra-primary-light/20 via-white to-yellow-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-electra-primary" />
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (electionLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-electra-primary-light/20 via-white to-yellow-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-electra-primary" />
          <p className="text-gray-600">Loading election data...</p>
        </div>
      </div>
    );
  }

  if (!electionData?.election) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-electra-primary-light/20 via-white to-yellow-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-600" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            No Active Election
          </h1>
          <p className="text-gray-600 mb-4">
            There is no active election at this time.
          </p>
          <Button onClick={() => router.push('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  const { election } = electionData;
  const positions = election.positions || [];

  if (positions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-electra-primary-light/20 via-white to-yellow-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-yellow-600" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            No Positions Available
          </h1>
          <p className="text-gray-600 mb-4">
            There are no positions to vote for in this election.
          </p>
          <Button onClick={() => router.push('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  const currentPosition = positions[currentStep];
  const progress = ((currentStep + 1) / positions.length) * 100;
  const canGoNext = currentPosition?.id
    ? votes[currentPosition.id]
      ? true
      : false
    : false;
  const canGoBack = currentStep > 0;
  const isLastStep = currentStep === positions.length - 1;

  const handleVoteChange = (candidateId: string) => {
    if (!currentPosition?.id) return;
    setVotes((prev) => ({
      ...prev,
      [String(currentPosition.id)]: candidateId,
    }));
  };

  const handleSkip = () => {
    if (!currentPosition?.id) return;
    // Remove vote for this position if it exists
    const newVotes = { ...votes };
    delete newVotes[currentPosition.id];
    setVotes(newVotes);

    goToNext();
  };

  const goToNext = () => {
    if (currentStep < positions.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setShowReview(true);
    }
  };

  const goToPrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmitVotes = async () => {
    try {
      // Convert votes to the format expected by the API
      const votesToSubmit = Object.entries(votes).map(
        ([positionId, candidateId]) => ({
          positionId,
          candidateId,
        })
      );

      // Also include abstain votes for positions without a selection
      positions.forEach((position) => {
        if (position.id && !votes[position.id]) {
          votesToSubmit.push({
            positionId: position.id,
            candidateId: '', // empty string represents abstain
          });
        }
      });

      await castVotesMutation.mutateAsync({
        data: { votes: votesToSubmit },
      });
    } catch (error) {
      // Error handling is done in the mutation options
    }
  };

  const handleLogout = async () => {
    await logout();
    router.push('/');
  };

  if (showReview) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-electra-primary-light/20 via-white to-yellow-50 p-4 sm:p-6">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-6 sm:mb-8">
            <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gradient-to-br from-electra-primary to-electra-secondary rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-lg">
              <CheckCircle className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 leading-tight">
              Review Your Votes
            </h1>
            <p className="text-sm sm:text-base text-gray-600">
              Please review your selections before submitting
            </p>
          </div>

          {/* Review Cards */}
          <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
            {positions.map((position) => {
              if (!position.id) return null;
              const selectedCandidateId = votes[position.id];
              const selectedCandidate = position.candidates?.find(
                (c) => c.id === selectedCandidateId
              );

              return (
                <Card
                  key={position.id}
                  className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                  <CardHeader className="pb-3 sm:pb-4 px-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base sm:text-lg leading-tight">
                        {position.name}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent className="px-4 sm:px-6 pt-0">
                    {selectedCandidate ? (
                      <div className="flex items-center space-x-3 sm:space-x-4 p-3 sm:p-4 bg-electra-primary-light/50 rounded-lg border border-electra-primary/30 shadow-sm">
                        <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-electra-primary flex-shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-electra-secondary text-sm sm:text-base leading-tight">
                            {selectedCandidate.fullName}
                          </p>
                          {selectedCandidate.classYearGroup && (
                            <p className="text-xs sm:text-sm text-electra-primary mt-1">
                              {selectedCandidate.classYearGroup}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-3 sm:space-x-4 p-3 sm:p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                        <SkipForward className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600 flex-shrink-0" />
                        <p className="text-yellow-800 text-sm sm:text-base font-medium">
                          Abstain
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <Button
              onClick={() => setShowReview(false)}
              variant="outline"
              className="flex-1 h-12 sm:h-11 text-sm sm:text-base font-medium touch-manipulation">
              <ArrowLeft className="w-4 h-4 mr-2 flex-shrink-0" />
              Back to Voting
            </Button>
            <Button
              onClick={handleSubmitVotes}
              disabled={castVotesMutation.isPending}
              className="flex-1 h-12 sm:h-11 text-sm sm:text-base font-medium bg-electra-primary hover:bg-electra-secondary shadow-lg touch-manipulation">
              {castVotesMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin flex-shrink-0" />
                  Submitting...
                </>
              ) : (
                'Submit Votes'
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-electra-primary-light/20 via-white to-yellow-50 p-4 sm:p-6">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className="flex items-center space-x-2 sm:space-x-3 flex-1 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-electra-primary to-electra-secondary rounded-xl flex items-center justify-center shadow-lg flex-shrink-0">
              <Vote className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                ElectraGH Elections
              </h1>
              <p className="text-xs sm:text-sm text-gray-600 truncate">
                Welcome, {user?.fullName || user?.phoneNumber}
              </p>
            </div>
          </div>
          <Button
            onClick={handleLogout}
            variant="outline"
            size="sm"
            className="h-9 px-3 text-sm flex-shrink-0">
            <LogOut className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Logout</span>
            <span className="sm:hidden">Exit</span>
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="mb-4 sm:mb-6">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <span className="text-sm sm:text-base font-medium text-gray-700">
              Step {currentStep + 1} of {positions.length}
            </span>
            <span className="text-sm sm:text-base text-gray-500">
              {Math.round(progress)}% Complete
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 sm:h-3 shadow-inner">
            <div
              className="bg-electra-primary h-2 sm:h-3 rounded-full transition-all duration-300 shadow-sm"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Position Card */}
        <Card className="mb-4 sm:mb-6 shadow-lg border-0 bg-white/70 backdrop-blur-sm">
          <CardHeader className="text-center pb-3 sm:pb-4 px-4 sm:px-6">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <CardTitle className="text-xl sm:text-2xl leading-tight">
                {currentPosition.name}
              </CardTitle>
            </div>
            <CardDescription className="text-base sm:text-lg text-gray-600">
              Vote for {currentPosition.name}
            </CardDescription>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <RadioGroup
              value={votes?.[currentPosition?.id as string] || ''}
              onValueChange={handleVoteChange}
              className="space-y-3 sm:space-y-4">
              {currentPosition?.candidates?.map((candidate) => (
                <div key={candidate.id}>
                  <RadioGroupItem
                    value={candidate.id ?? ''}
                    id={candidate.id}
                    className="sr-only"
                  />
                  <Label
                    htmlFor={candidate.id}
                    className="flex items-center space-x-3 sm:space-x-4 p-4 sm:p-5 border-2 rounded-lg cursor-pointer hover:bg-electra-primary-light/20 transition-all duration-200 hover:shadow-md hover:border-electra-primary/50 touch-manipulation">
                    <div className="w-5 h-5 sm:w-6 sm:h-6 border-2 border-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                      {votes[currentPosition.id as string] ===
                        candidate.id && (
                        <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-electra-primary rounded-full"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-base sm:text-lg leading-tight">
                        {candidate.fullName}
                      </p>
                      {candidate.classYearGroup && (
                        <p className="text-sm sm:text-base text-gray-600 mt-1">
                          {candidate.classYearGroup}
                        </p>
                      )}
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>

            <div className="mt-4 sm:mt-6 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg shadow-sm">
              <div className="flex items-start space-x-2 sm:space-x-3 text-blue-800">
                <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 mt-0.5" />
                <span className="text-sm sm:text-base leading-relaxed">
                  You can choose to abstain from voting for this
                  position if you prefer.
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <Button
            onClick={goToPrevious}
            disabled={!canGoBack}
            variant="outline"
            className="flex-1 h-12 sm:h-11 text-sm sm:text-base font-medium touch-manipulation">
            <ArrowLeft className="w-4 h-4 mr-2 flex-shrink-0" />
            Previous
          </Button>

          <Button
            onClick={handleSkip}
            variant="outline"
            className="flex-1 h-12 sm:h-11 text-sm sm:text-base font-medium touch-manipulation">
            <SkipForward className="w-4 h-4 mr-2 flex-shrink-0" />
            Abstain
          </Button>

          <Button
            onClick={goToNext}
            disabled={!canGoNext}
            className="flex-1 h-12 sm:h-11 text-sm sm:text-base font-medium bg-electra-primary hover:bg-electra-secondary shadow-lg touch-manipulation">
            {isLastStep ? 'Review Votes' : 'Next'}
            <ArrowRight className="w-4 h-4 ml-2 flex-shrink-0" />
          </Button>
        </div>
      </div>
    </div>
  );
}

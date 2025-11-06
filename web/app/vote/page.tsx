'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import { useGetApiVotingElection, usePostApiVotingCast } from '@/lib/api/voting/voting';

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
        toast.error(error.response?.data?.message || 'Failed to submit votes. Please try again.');
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
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-yellow-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-green-600" />
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (electionLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-yellow-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 mx-auto mb-4 animate-spin text-green-600" />
          <p className="text-gray-600">Loading election data...</p>
        </div>
      </div>
    );
  }

  if (!electionData?.election) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-yellow-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-600" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">No Active Election</h1>
          <p className="text-gray-600 mb-4">There is no active election at this time.</p>
          <Button onClick={() => router.push('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  const { election } = electionData;
  const positions = election.positions || [];

  if (positions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-yellow-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-yellow-600" />
          <h1 className="text-xl font-bold text-gray-900 mb-2">No Positions Available</h1>
          <p className="text-gray-600 mb-4">There are no positions to vote for in this election.</p>
          <Button onClick={() => router.push('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  const currentPosition = positions[currentStep];
  const progress = ((currentStep + 1) / positions.length) * 100;
  const canGoNext = votes[currentPosition.id] ? true : false; // All positions are optional in this implementation
  const canGoBack = currentStep > 0;
  const isLastStep = currentStep === positions.length - 1;

  const handleVoteChange = (candidateId: string) => {
    setVotes((prev) => ({
      ...prev,
      [currentPosition.id]: candidateId,
    }));
  };

  const handleSkip = () => {
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
      const votesToSubmit = Object.entries(votes).map(([positionId, candidateId]) => ({
        positionId,
        candidateId,
      }));

      // Also include abstain votes for positions without a selection
      positions.forEach(position => {
        if (!votes[position.id]) {
          votesToSubmit.push({
            positionId: position.id,
            candidateId: null, // null represents abstain
          });
        }
      });

      await castVotesMutation.mutateAsync({
        votes: votesToSubmit,
      });
    } catch (error) {
      // Error handling is done in the mutation options
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  if (showReview) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-yellow-50 p-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-green-600 to-green-700 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Review Your Votes
            </h1>
            <p className="text-gray-600">
              Please review your selections before submitting
            </p>
          </div>

          {/* Review Cards */}
          <div className="space-y-4 mb-8">
            {positions.map((position) => {
              const selectedCandidateId = votes[position.id];
              const selectedCandidate = position.candidates.find(
                (c) => c.id === selectedCandidateId
              );

              return (
                <Card key={position.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        {position.name}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {selectedCandidate ? (
                      <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg border border-green-200">
                        <CheckCircle className="w-5 h-5 text-green-600" />
                        <div>
                          <p className="font-medium text-green-800">
                            {selectedCandidate.fullName}
                          </p>
                          {selectedCandidate.classYearGroup && (
                            <p className="text-sm text-green-600">
                              {selectedCandidate.classYearGroup}
                            </p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-3 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                        <SkipForward className="w-5 h-5 text-yellow-600" />
                        <p className="text-yellow-800">Abstain</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => setShowReview(false)}
              variant="outline"
              className="flex-1">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Voting
            </Button>
            <Button
              onClick={handleSubmitVotes}
              disabled={castVotesMutation.isPending}
              className="flex-1 bg-green-600 hover:bg-green-700">
              {castVotesMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
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
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-yellow-50 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-green-700 rounded-lg flex items-center justify-center">
              <Vote className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">
                AGOSA Elections
              </h1>
              <p className="text-sm text-gray-600">
                Welcome, {user?.fullName || user?.phoneNumber}
              </p>
            </div>
          </div>
          <Button onClick={handleLogout} variant="outline" size="sm">
            <LogOut className="w-4 h-4 mr-2" />
            Logout
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">
              Step {currentStep + 1} of {positions.length}
            </span>
            <span className="text-sm text-gray-500">
              {Math.round(progress)}% Complete
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-green-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Position Card */}
        <Card className="mb-6">
          <CardHeader className="text-center pb-4">
            <div className="flex items-center justify-center space-x-2 mb-2">
              <CardTitle className="text-2xl">
                {currentPosition.name}
              </CardTitle>
            </div>
            <CardDescription className="text-lg">
              Vote for {currentPosition.name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={votes[currentPosition.id] || ''}
              onValueChange={handleVoteChange}
              className="space-y-3">
              {currentPosition.candidates.map((candidate) => (
                <div key={candidate.id}>
                  <RadioGroupItem
                    value={candidate.id}
                    id={candidate.id}
                    className="sr-only"
                  />
                  <Label
                    htmlFor={candidate.id}
                    className="flex items-center space-x-3 p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <div className="w-4 h-4 border-2 border-gray-300 rounded-full flex items-center justify-center">
                      {votes[currentPosition.id] === candidate.id && (
                        <div className="w-2 h-2 bg-green-600 rounded-full"></div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">
                        {candidate.fullName}
                      </p>
                      {candidate.classYearGroup && (
                        <p className="text-sm text-gray-600">
                          {candidate.classYearGroup}
                        </p>
                      )}
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>

            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center space-x-2 text-blue-800">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">
                  You can choose to abstain from voting for this position if you prefer.
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Navigation Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button
            onClick={goToPrevious}
            disabled={!canGoBack}
            variant="outline"
            className="flex-1">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>

          <Button
            onClick={handleSkip}
            variant="outline"
            className="flex-1">
            <SkipForward className="w-4 h-4 mr-2" />
            Abstain
          </Button>

          <Button
            onClick={goToNext}
            disabled={!canGoNext}
            className="flex-1 bg-green-600 hover:bg-green-700">
            {isLastStep ? 'Review Votes' : 'Next'}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}

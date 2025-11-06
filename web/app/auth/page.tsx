'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Vote, Phone, Shield, ArrowRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { usePostApiVotingRequestOtp, usePostApiVotingVerifyOtp } from '@/lib/api/voting/voting';

type AuthStep = 'phone' | 'otp';

export default function AuthPage() {
  const [step, setStep] = useState<AuthStep>('phone');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const router = useRouter();
  const { login } = useAuth();

  const requestOtpMutation = usePostApiVotingRequestOtp({
    mutation: {
      onSuccess: () => {
        toast.success('OTP sent to your phone number');
        setStep('otp');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to send OTP. Please try again.');
      },
    },
  });

  const verifyOtpMutation = usePostApiVotingVerifyOtp({
    mutation: {
      onSuccess: (data) => {
        // Login the user with their phone number
        login(phoneNumber.trim());
        toast.success('Authentication successful!');
        router.push('/vote');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Invalid OTP. Please try again.');
        setOtp('');
      },
    },
  });

  const handlePhoneSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber.trim()) {
      toast.error('Please enter your phone number');
      return;
    }
    requestOtpMutation.mutate({ data: { phone: phoneNumber.trim() } });
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error('Please enter the complete 6-digit OTP');
      return;
    }
    verifyOtpMutation.mutate({
      data: {
        phone: phoneNumber.trim(),
        code: otp
      }
    });
  };

  const handleResendOtp = () => {
    requestOtpMutation.mutate({ data: { phone: phoneNumber.trim() } });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-yellow-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-green-600 to-green-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <Vote className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Ghana Election Platform
          </h1>
          <p className="text-gray-600">
            Secure voter authentication
          </p>
        </div>

        {/* Phone Number Step */}
        {step === 'phone' && (
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center space-x-2">
                <Phone className="w-5 h-5" />
                <span>Enter Phone Number</span>
              </CardTitle>
              <CardDescription>
                We'll send you a verification code via SMS
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handlePhoneSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="e.g., +233241234567 or 0241234567"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    disabled={requestOtpMutation.isPending}
                  />
                </div>

                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    Your phone number will be used to verify your identity and send you voting updates.
                  </AlertDescription>
                </Alert>

                <Button
                  type="submit"
                  className="w-full bg-green-600 hover:bg-green-700"
                  disabled={requestOtpMutation.isPending}
                >
                  {requestOtpMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending OTP...
                    </>
                  ) : (
                    <>
                      Send Verification Code
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* OTP Verification Step */}
        {step === 'otp' && (
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center space-x-2">
                <Shield className="w-5 h-5" />
                <span>Enter Verification Code</span>
              </CardTitle>
              <CardDescription>
                Enter the 6-digit code sent to {phoneNumber}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleOtpSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp" className="text-center block">
                    Verification Code
                  </Label>
                  <div className="flex justify-center">
                    <InputOTP
                      value={otp}
                      onChange={setOtp}
                      maxLength={6}
                      disabled={verifyOtpMutation.isPending}
                    >
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full bg-green-600 hover:bg-green-700"
                  disabled={verifyOtpMutation.isPending || otp.length !== 6}
                >
                  {verifyOtpMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify & Continue'
                  )}
                </Button>

                <div className="text-center space-y-2">
                  <p className="text-sm text-gray-600">
                    Didn't receive the code?
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleResendOtp}
                    disabled={requestOtpMutation.isPending}
                  >
                    {requestOtpMutation.isPending ? (
                      <>
                        <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                        Resending...
                      </>
                    ) : (
                      'Resend Code'
                    )}
                  </Button>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setStep('phone');
                    setOtp('');
                  }}
                  className="w-full"
                >
                  Change Phone Number
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center mt-6">
          <p className="text-sm text-gray-500">
            Secure authentication powered by SMS verification
          </p>
        </div>
      </div>
    </div>
  );
}
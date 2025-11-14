/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Check, ChevronDown } from 'lucide-react';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Phone,
  Shield,
  ArrowRight,
  Loader2,
  ShieldIcon,
} from 'lucide-react';
import Image from 'next/image';
import { toast } from 'sonner';
import {
  usePostApiVotingRequestOtp,
  usePostApiVotingVerifyOtp,
} from '@/lib/api/voting/voting';

type AuthStep = 'phone' | 'otp';

// Country codes data
const countries = [
  { code: 'GH', name: 'Ghana', dialCode: '+233', flag: '🇬🇭' },
  { code: 'NG', name: 'Nigeria', dialCode: '+234', flag: '🇳🇬' },
  { code: 'KE', name: 'Kenya', dialCode: '+254', flag: '🇰🇪' },
  { code: 'ZA', name: 'South Africa', dialCode: '+27', flag: '🇿🇦' },
  { code: 'EG', name: 'Egypt', dialCode: '+20', flag: '🇪🇬' },
  { code: 'MA', name: 'Morocco', dialCode: '+212', flag: '🇲🇦' },
  { code: 'ET', name: 'Ethiopia', dialCode: '+251', flag: '🇪🇹' },
  { code: 'UG', name: 'Uganda', dialCode: '+256', flag: '🇺🇬' },
  { code: 'TZ', name: 'Tanzania', dialCode: '+255', flag: '🇹🇿' },
  { code: 'ZW', name: 'Zimbabwe', dialCode: '+263', flag: '🇿🇼' },
  { code: 'ZM', name: 'Zambia', dialCode: '+260', flag: '🇿🇲' },
  { code: 'MW', name: 'Malawi', dialCode: '+265', flag: '🇲🇼' },
  { code: 'RW', name: 'Rwanda', dialCode: '+250', flag: '🇷🇼' },
  { code: 'US', name: 'United States', dialCode: '+1', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', dialCode: '+44', flag: '🇬🇧' },
  { code: 'CA', name: 'Canada', dialCode: '+1', flag: '🇨🇦' },
  { code: 'AU', name: 'Australia', dialCode: '+61', flag: '🇦🇺' },
  { code: 'DE', name: 'Germany', dialCode: '+49', flag: '🇩🇪' },
  { code: 'FR', name: 'France', dialCode: '+33', flag: '🇫🇷' },
  { code: 'IT', name: 'Italy', dialCode: '+39', flag: '🇮🇹' },
  { code: 'ES', name: 'Spain', dialCode: '+34', flag: '🇪🇸' },
  { code: 'NL', name: 'Netherlands', dialCode: '+31', flag: '🇳🇱' },
  { code: 'BE', name: 'Belgium', dialCode: '+32', flag: '🇧🇪' },
  { code: 'CH', name: 'Switzerland', dialCode: '+41', flag: '🇨🇭' },
  { code: 'AT', name: 'Austria', dialCode: '+43', flag: '🇦🇹' },
  { code: 'SE', name: 'Sweden', dialCode: '+46', flag: '🇸🇪' },
  { code: 'NO', name: 'Norway', dialCode: '+47', flag: '🇳🇴' },
  { code: 'DK', name: 'Denmark', dialCode: '+45', flag: '🇩🇰' },
  { code: 'FI', name: 'Finland', dialCode: '+358', flag: '🇫🇮' },
  { code: 'IN', name: 'India', dialCode: '+91', flag: '🇮🇳' },
  { code: 'CN', name: 'China', dialCode: '+86', flag: '🇨🇳' },
  { code: 'JP', name: 'Japan', dialCode: '+81', flag: '🇯🇵' },
  { code: 'KR', name: 'South Korea', dialCode: '+82', flag: '🇰🇷' },
  { code: 'SG', name: 'Singapore', dialCode: '+65', flag: '🇸🇬' },
  { code: 'MY', name: 'Malaysia', dialCode: '+60', flag: '🇲🇾' },
  { code: 'TH', name: 'Thailand', dialCode: '+66', flag: '🇹🇭' },
  { code: 'PH', name: 'Philippines', dialCode: '+63', flag: '🇵🇭' },
  { code: 'ID', name: 'Indonesia', dialCode: '+62', flag: '🇮🇩' },
  { code: 'VN', name: 'Vietnam', dialCode: '+84', flag: '🇻🇳' },
  { code: 'BR', name: 'Brazil', dialCode: '+55', flag: '🇧🇷' },
  { code: 'AR', name: 'Argentina', dialCode: '+54', flag: '🇦🇷' },
  { code: 'MX', name: 'Mexico', dialCode: '+52', flag: '🇲🇽' },
  { code: 'CL', name: 'Chile', dialCode: '+56', flag: '🇨🇱' },
  { code: 'CO', name: 'Colombia', dialCode: '+57', flag: '🇨🇴' },
  { code: 'PE', name: 'Peru', dialCode: '+51', flag: '🇵🇪' },
];

export default function AuthPage() {
  const [step, setStep] = useState<AuthStep>('phone');
  const [selectedCountry, setSelectedCountry] = useState(
    countries[0]
  ); // Default to Ghana
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [countryOpen, setCountryOpen] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  const requestOtpMutation = usePostApiVotingRequestOtp({
    mutation: {
      onSuccess: () => {
        toast.success('OTP sent to your phone number');
        setStep('otp');
      },
      onError: (error: any) => {
        toast.error(
          error.response?.data?.message ||
            'Failed to send OTP. Please try again.'
        );
      },
    },
  });

  const verifyOtpMutation = usePostApiVotingVerifyOtp({
    mutation: {
      onSuccess: (data: any) => {
        // Token is now stored in HTTP-Only cookie by the backend
        // No need to manually store it in localStorage

        // Login the user with their full phone number (including country code)
        const fullPhoneNumber = `${
          selectedCountry.dialCode
        }${phoneNumber.trim()}`;
        login(fullPhoneNumber, data?.voter?.fullName);
        toast.success('Authentication successful!');
        router.push('/');
      },
      onError: (error: any) => {
        toast.error(
          error.response?.data?.message ||
            'Invalid OTP. Please try again.'
        );
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

    // Combine country code with phone number
    const fullPhoneNumber = `${
      selectedCountry.dialCode
    }${phoneNumber.trim()}`;

    requestOtpMutation.mutate({
      data: { phone: fullPhoneNumber },
    });
  };

  const handleOtpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error('Please enter the complete 6-digit OTP');
      return;
    }

    // Combine country code with phone number (same as request)
    const fullPhoneNumber = `${
      selectedCountry.dialCode
    }${phoneNumber.trim()}`;

    verifyOtpMutation.mutate({
      data: {
        phone: fullPhoneNumber,
        code: otp,
      },
    });
  };

  const handleResendOtp = () => {
    const fullPhoneNumber = `${
      selectedCountry.dialCode
    }${phoneNumber.trim()}`;
    requestOtpMutation.mutate({
      data: { phone: fullPhoneNumber },
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-electra-primary-light via-white to-electra-secondary-light flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-6 sm:mb-8">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-electra-primary to-electra-secondary rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4 shadow-lg">
            <Image
              src="/logo.png"
              alt="ElectraGH Logo"
              width={48}
              height={48}
              className="w-10 h-10 sm:w-12 sm:h-12"
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">
            ElectraGH
          </h1>
          <p className="text-sm sm:text-base text-gray-600 font-medium">
            Secure Digital Voting Platform
          </p>
        </div>

        {/* Phone Number Step */}
        {step === 'phone' && (
          <Card className="shadow-lg border-0">
            <CardHeader className="text-center pb-4">
              <CardTitle className="flex items-center justify-center space-x-2 text-lg sm:text-xl">
                <Phone className="w-5 h-5 sm:w-6 sm:h-6" />
                <span>Enter Phone Number</span>
              </CardTitle>
              <CardDescription className="text-sm sm:text-base">
                We&apos;ll send you a verification code via SMS
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              <form
                onSubmit={handlePhoneSubmit}
                className="space-y-4 sm:space-y-5">
                <div className="space-y-2">
                  <Label
                    htmlFor="phone"
                    className="text-sm sm:text-base font-medium">
                    Phone Number
                  </Label>

                  {/* Country Selector */}
                  <div className="space-y-3">
                    <Label className="text-sm font-medium text-gray-700">
                      Country
                    </Label>
                    <Popover
                      open={countryOpen}
                      onOpenChange={setCountryOpen}>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="w-full h-12 text-base border-2 border-input rounded-full px-3 bg-background hover:bg-accent focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:border-electra-primary transition-colors flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                            <span className="text-lg">
                              {selectedCountry.flag}
                            </span>
                            <span className="font-medium">
                              {selectedCountry.name}
                            </span>
                            <span className="text-electra-primary font-semibold">
                              {selectedCountry.dialCode}
                            </span>
                          </div>
                          <ChevronDown className="h-4 w-4 opacity-50" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-full p-0"
                        side="bottom"
                        align="start">
                        <Command>
                          <CommandInput
                            placeholder="Search countries..."
                            className="h-9"
                          />
                          <CommandEmpty>
                            No country found.
                          </CommandEmpty>
                          <CommandList>
                            <CommandGroup>
                              {countries.map((country) => (
                                <CommandItem
                                  key={country.code}
                                  value={`${country.name} ${country.code} ${country.dialCode}`}
                                  onSelect={() => {
                                    setSelectedCountry(country);
                                    setCountryOpen(false);
                                  }}
                                  className="py-2">
                                  <div className="flex items-center space-x-3 w-full">
                                    <span className="text-lg">
                                      {country.flag}
                                    </span>
                                    <span className="font-medium flex-1">
                                      {country.name}
                                    </span>
                                    <span className="text-electra-primary font-semibold">
                                      {country.dialCode}
                                    </span>
                                    <Check
                                      className={`ml-auto h-4 w-4 ${
                                        selectedCountry.code ===
                                        country.code
                                          ? 'opacity-100'
                                          : 'opacity-0'
                                      }`}
                                    />
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>

                  {/* Phone Number Input */}
                  <div className="flex items-center space-x-2">
                    <div className="flex items-center bg-gray-50 border-2 border-gray-200 rounded-full px-3 h-12 min-w-[90px] justify-center">
                      <span className="text-base font-semibold text-electra-primary">
                        {selectedCountry.dialCode}
                      </span>
                    </div>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="e.g., 241234567"
                      value={phoneNumber}
                      onChange={(e) => {
                        // Remove any non-numeric characters except +
                        const cleaned = e.target.value.replace(
                          /[^\d]/g,
                          ''
                        );
                        setPhoneNumber(cleaned);
                      }}
                      disabled={requestOtpMutation.isPending}
                      className="h-12 text-base px-4 border-2 focus:border-electra-primary transition-colors flex-1"
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    Enter your phone number without the country code
                  </p>
                </div>

                <Alert className="border-electra-primary/30 bg-electra-primary-light/50">
                  <ShieldIcon className="h-4 w-4 sm:h-5 sm:w-5" />
                  <AlertDescription className="text-sm">
                    Your phone number will be used to verify your
                    identity.
                  </AlertDescription>
                </Alert>

                <Button
                  type="submit"
                  className="w-full h-12 sm:h-14 text-base sm:text-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-lg"
                  disabled={requestOtpMutation.isPending}>
                  {requestOtpMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" />
                      Sending OTP...
                    </>
                  ) : (
                    <>
                      Send Verification Code
                      <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 ml-2" />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* OTP Verification Step */}
        {step === 'otp' && (
          <Card className="shadow-lg border-0">
            <CardHeader className="text-center pb-4">
              <CardTitle className="flex items-center justify-center space-x-2 text-lg sm:text-xl">
                <Shield className="w-5 h-5 sm:w-6 sm:h-6" />
                <span>Enter Verification Code</span>
              </CardTitle>
              <CardDescription className="text-sm sm:text-base">
                Enter the 6-digit code sent to{' '}
                <span className="font-medium">
                  {selectedCountry.dialCode}
                  {phoneNumber}
                </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 sm:px-6">
              <form
                onSubmit={handleOtpSubmit}
                className="space-y-5 sm:space-y-6">
                <div className="space-y-3">
                  <Label
                    htmlFor="otp"
                    className="text-center block text-sm sm:text-base font-medium">
                    Verification Code
                  </Label>
                  <div className="flex justify-center">
                    <InputOTP
                      value={otp}
                      onChange={setOtp}
                      maxLength={6}
                      disabled={verifyOtpMutation.isPending}
                      className="gap-2 sm:gap-3">
                      <InputOTPGroup>
                        <InputOTPSlot
                          index={0}
                          className="w-12 h-12 sm:w-14 sm:h-14 text-lg sm:text-xl border-2"
                        />
                        <InputOTPSlot
                          index={1}
                          className="w-12 h-12 sm:w-14 sm:h-14 text-lg sm:text-xl border-2"
                        />
                        <InputOTPSlot
                          index={2}
                          className="w-12 h-12 sm:w-14 sm:h-14 text-lg sm:text-xl border-2"
                        />
                        <InputOTPSlot
                          index={3}
                          className="w-12 h-12 sm:w-14 sm:h-14 text-lg sm:text-xl border-2"
                        />
                        <InputOTPSlot
                          index={4}
                          className="w-12 h-12 sm:w-14 sm:h-14 text-lg sm:text-xl border-2"
                        />
                        <InputOTPSlot
                          index={5}
                          className="w-12 h-12 sm:w-14 sm:h-14 text-lg sm:text-xl border-2"
                        />
                      </InputOTPGroup>
                    </InputOTP>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 sm:h-14 text-base sm:text-lg font-semibold bg-electra-primary hover:bg-electra-secondary transition-all duration-200 shadow-lg hover:shadow-xl"
                  disabled={
                    verifyOtpMutation.isPending || otp.length !== 6
                  }>
                  {verifyOtpMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify & Continue'
                  )}
                </Button>

                <div className="text-center space-y-3">
                  <p className="text-sm sm:text-base text-gray-600">
                    Didn&apos;t receive the code?
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleResendOtp}
                    disabled={requestOtpMutation.isPending}
                    className="h-10 px-4 text-sm sm:text-base">
                    {requestOtpMutation.isPending ? (
                      <>
                        <Loader2 className="w-3 h-3 sm:w-4 sm:h-4 mr-2 animate-spin" />
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
                  className="w-full h-10 sm:h-11 text-sm sm:text-base">
                  Change Phone Number
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center mt-6 sm:mt-8 px-4">
          <div className="flex items-center justify-center space-x-2 mb-2 flex-wrap">
            <div className="w-2 h-2 bg-electra-primary rounded-full animate-pulse"></div>
            <p className="text-xs sm:text-sm font-medium text-center">
              Powered by ElectraGH
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

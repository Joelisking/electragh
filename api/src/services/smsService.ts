import { logger } from '../utils/logger';

export interface SmsProvider {
  sendSms(
    to: string,
    message: string,
    type: string
  ): Promise<SmsResult>;
  // Optional: Only providers like Arkesel support server-side OTP verification
  verifyOtp?(to: string, code: string): Promise<boolean>;
}

export interface SmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// SMS service abstraction
class SmsService {
  private provider: SmsProvider;
  private generatedOtps: Map<
    string,
    { code: string; timestamp: number }
  > = new Map();

  constructor(provider: SmsProvider) {
    this.provider = provider;
  }

  async sendOtp(
    to: string,
    code: string,
    voterName: string
  ): Promise<SmsResult> {
    const message = `Hello ${voterName},\n\nYour OTP for Ghana Election is: ${code}\n\nThis code expires in 5 minutes.\n\nElectoral Commission`;
    const result = await this.provider.sendSms(
      to,
      message,
      'OTP_CODE'
    );

    // If using fallback SMS, store the generated OTP for verification
    if (
      result.success &&
      this.provider instanceof ArkeselSmsProvider
    ) {
      const arkeselProvider = this.provider as any;
      if (arkeselProvider.lastGeneratedOtp) {
        this.generatedOtps.set(to, {
          code: arkeselProvider.lastGeneratedOtp,
          timestamp: Date.now(),
        });
        // Clean up old OTPs (older than 5 minutes)
        this.cleanupOldOtps();
      }
    }

    return result;
  }

  async sendVoteConfirmation(
    to: string,
    voterName: string
  ): Promise<SmsResult> {
    const message = `Hello ${voterName},\n\nYour vote has been successfully recorded. Thank you for participating in the election.\n\nElectoral Commission`;
    return await this.provider.sendSms(
      to,
      message,
      'VOTE_CONFIRMATION'
    );
  }

  async sendElectionReminder(
    to: string,
    voterName: string,
    type: 'OPEN' | 'MIDWAY' | 'NEAR_END' | 'END'
  ): Promise<SmsResult> {
    let message = '';

    switch (type) {
      case 'OPEN':
        message = `Hello ${voterName},\n\nVoting is now OPEN! Cast your vote at [VOTING_URL]\n\nElectoral Commission`;
        break;
      case 'MIDWAY':
        message = `Hello ${voterName},\n\nReminder: Voting is still open. Don't miss your chance to vote!\n\nElectoral Commission`;
        break;
      case 'NEAR_END':
        message = `Hello ${voterName},\n\nFinal reminder: Voting ends soon! Cast your vote now.\n\nElectoral Commission`;
        break;
      case 'END':
        message = `Hello ${voterName},\n\nVoting has now ended. Thank you to all who participated.\n\nElectoral Commission`;
        break;
    }

    return await this.provider.sendSms(to, message, `VOTE_${type}`);
  }

  async verifyOtp(to: string, code: string): Promise<boolean> {
    // First try provider verification (e.g., Arkesel OTP API)
    if (typeof this.provider.verifyOtp === 'function') {
      const providerResult = await this.provider.verifyOtp(to, code);
      if (providerResult) {
        return true;
      }
    }

    // If provider verification failed, check local storage (for fallback SMS)
    const storedOtp = this.generatedOtps.get(to);
    if (storedOtp) {
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      if (
        storedOtp.timestamp > fiveMinutesAgo &&
        storedOtp.code === code
      ) {
        // Remove the OTP after successful verification
        this.generatedOtps.delete(to);
        return true;
      } else if (storedOtp.timestamp <= fiveMinutesAgo) {
        // Remove expired OTP
        this.generatedOtps.delete(to);
      }
    }

    return false;
  }

  private cleanupOldOtps(): void {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    for (const [phone, otpData] of this.generatedOtps.entries()) {
      if (otpData.timestamp <= fiveMinutesAgo) {
        this.generatedOtps.delete(phone);
      }
    }
  }
}

// Mock SMS provider for development
class MockSmsProvider implements SmsProvider {
  async sendSms(
    to: string,
    message: string,
    type: string
  ): Promise<SmsResult> {
    logger.info(`[MOCK SMS] To: ${to}, Type: ${type}`);
    logger.info(`[MOCK SMS] Message: ${message}`);

    // Simulate successful delivery in development
    return {
      success: true,
      messageId: `mock_${Date.now()}_${Math.random()}`,
    };
  }
}


// Arkesel SMS provider implementation
class ArkeselSmsProvider implements SmsProvider {
  private apiKey: string;
  private senderId: string;
  private generateUrl: string;
  private verifyUrl: string;
  private sandbox: boolean;
  public lastGeneratedOtp?: string;

  constructor(
    apiKey: string,
    senderId: string,
    sandbox: boolean = false
  ) {
    this.apiKey = apiKey;
    this.senderId = senderId;
    this.sandbox = sandbox;
    this.generateUrl = 'https://sms.arkesel.com/api/otp/generate';
    this.verifyUrl = 'https://sms.arkesel.com/api/otp/verify';
  }

  async sendSms(
    to: string,
    message: string,
    type: string
  ): Promise<SmsResult> {
    try {
      // Format phone number for Ghana (ensure it starts with 233)
      const formattedPhone = this.formatPhoneNumber(to);

      // Check if this is an OTP message
      const isOtpMessage =
        type === 'OTP_CODE' ||
        message.includes('%otp_code%') ||
        /\d{4,6}/.test(message);

      if (isOtpMessage) {
        // Use Arkesel's OTP API - they will generate and manage the OTP code
        // We need to use their verify endpoint to validate the OTP
        logger.info(`Sending OTP via Arkesel OTP API for ${to}`);

        const payload = {
          number: formattedPhone,
          sender_id: this.senderId,
          message: message.replace(/\d{4,6}/, '%otp_code%'), // Replace our code with placeholder
          type: 'numeric',
          length: 6, // Standard OTP length
          expiry: 5, // 5 minutes expiry
          medium: 'sms',
        };

        const response = await fetch(this.generateUrl, {
          method: 'POST',
          headers: {
            'api-key': this.apiKey,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const responseText = await response.text();
        logger.info(
          `Arkesel OTP generate response status: ${response.status}, body: ${responseText}`
        );

        if (!response.ok) {
          throw new Error(
            `Arkesel OTP API error: ${response.status} ${response.statusText} - ${responseText}`
          );
        }

        const data = JSON.parse(responseText);

        // Arkesel returns different response codes, check for success
        if (
          data.code === '1000' ||
          data.status === 'success' ||
          data.success === true
        ) {
          logger.info(
            `OTP sent successfully via Arkesel OTP API to ${to}, response: ${JSON.stringify(data)}`
          );
          return {
            success: true,
            messageId:
              data.ussd_code ||
              data.messageId ||
              data.message_id ||
              `arkesel_otp_${Date.now()}`,
          };
        } else if (
          data.code === '1007' ||
          data.message?.includes('Insufficient balance')
        ) {
          // Fallback to regular SMS with our own generated OTP
          logger.warn(
            `OTP API insufficient balance, falling back to regular SMS for ${to}`
          );

          // Extract the OTP code from the message (it was generated by the calling code)
          const otpMatch = message.match(/\d{6}/);
          const generatedOtp = otpMatch ? otpMatch[0] : null;

          if (generatedOtp) {
            this.lastGeneratedOtp = generatedOtp; // Store for local verification
          }

          const smsPayload = {
            sender: this.senderId,
            message: message, // Use the original message with our OTP
            recipients: [formattedPhone],
          };

          const smsResponse = await fetch(
            'https://sms.arkesel.com/api/v2/sms/send',
            {
              method: 'POST',
              headers: {
                'api-key': this.apiKey,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(smsPayload),
            }
          );

          const smsData = await smsResponse.json();
          logger.info(
            `Fallback SMS response for ${to}:`,
            JSON.stringify(smsData, null, 2)
          );

          if (
            smsData.code === '1000' ||
            smsData.status === 'success' ||
            smsData.success === true
          ) {
            logger.info(
              `OTP sent successfully via fallback SMS to ${to}, messageId: ${
                smsData.data?.[0]?.id ||
                smsData.messageId ||
                'unknown'
              }`
            );
            return {
              success: true,
              messageId:
                smsData.data?.[0]?.id ||
                smsData.messageId ||
                `arkesel_${Date.now()}`,
            };
          } else {
            throw new Error(
              `Arkesel fallback SMS API returned error: ${
                smsData.message || smsData.error || 'Unknown error'
              }`
            );
          }
        } else {
          throw new Error(
            `Arkesel OTP API returned error: ${
              data.message || data.error || 'Unknown error'
            }`
          );
        }
      } else {
        // For non-OTP messages, use regular SMS API
        const payload = {
          sender: this.senderId,
          message: message,
          recipients: [formattedPhone],
        };

        const response = await fetch(
          'https://sms.arkesel.com/api/v2/sms/send',
          {
            method: 'POST',
            headers: {
              'api-key': this.apiKey,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
          }
        );

        if (!response.ok) {
          const errorData = await response.text();
          throw new Error(
            `Arkesel SMS API error: ${response.status} ${response.statusText} - ${errorData}`
          );
        }

        const data = await response.json();

        // Check for success
        if (
          data.code === '1000' ||
          data.status === 'success' ||
          data.success === true
        ) {
          logger.info(
            `SMS sent successfully via Arkesel to ${to}, messageId: ${
              data.data?.messageId || data.messageId || 'unknown'
            }`
          );
          return {
            success: true,
            messageId:
              data.data?.messageId ||
              data.messageId ||
              `arkesel_${Date.now()}`,
          };
        } else {
          throw new Error(
            `Arkesel SMS API returned error: ${
              data.message || data.error || 'Unknown error'
            }`
          );
        }
      }
    } catch (error) {
      logger.error('Arkesel SMS error:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async verifyOtp(to: string, code: string): Promise<boolean> {
    try {
      const formattedPhone = this.formatPhoneNumber(to);

      logger.info(`[Arkesel Verify] Starting verification - Phone: ${formattedPhone}, Code: ${code}, Sandbox: ${this.sandbox}`);

      // In sandbox mode, Arkesel's OTP verification might not work
      // Return false to trigger local verification fallback
      if (this.sandbox) {
        logger.warn(`[Arkesel Verify] Sandbox mode enabled - skipping API verification, will use local fallback`);
        return false;
      }

      const payload = {
        number: formattedPhone,
        code: code,
      };

      logger.info(`[Arkesel Verify] Request payload: ${JSON.stringify(payload)}`);
      logger.info(`[Arkesel Verify] Calling: ${this.verifyUrl}`);

      const response = await fetch(this.verifyUrl, {
        method: 'POST',
        headers: {
          'api-key': this.apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      logger.info(`[Arkesel Verify] HTTP Status: ${response.status}`);
      logger.info(`[Arkesel Verify] Response Headers: ${JSON.stringify(Object.fromEntries(response.headers.entries()))}`);
      logger.info(`[Arkesel Verify] Response Body: ${responseText}`);

      // Try to parse the response
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        logger.error(`[Arkesel Verify] Failed to parse response as JSON: ${responseText}`);
        return false;
      }

      // Arkesel OTP verification response codes:
      // - code: "1000" = Success (OTP sent)
      // - code: "1100" = Success (OTP verified) ✓ This is what we get!
      // - code: "1001" = Invalid/expired OTP
      // - code: "1002" = No OTP found for this number
      // - Other codes = API errors

      logger.info(`[Arkesel Verify] Parsed response: ${JSON.stringify(data)}`);

      const successCodes = ['1000', '1100']; // 1100 is for successful verification
      const failureCodes = ['1001', '1002', '1003']; // Invalid/expired/not found

      if (successCodes.includes(data.code)) {
        logger.info(`[Arkesel Verify] ✓ OTP verified successfully for ${to}`);
        return true;
      }

      if (failureCodes.includes(data.code)) {
        logger.warn(`[Arkesel Verify] ✗ OTP verification failed for ${to}: ${data.message || data.code}`);
        return false;
      }

      // Check alternative success indicators
      if (data.status === 'success' || data.success === true) {
        logger.info(`[Arkesel Verify] ✓ OTP verified successfully for ${to} (via status field)`);
        return true;
      }

      // Unknown response
      logger.warn(
        `[Arkesel Verify] ⚠ Unexpected response for ${to}: ${JSON.stringify(data)}`
      );
      return false;

    } catch (error) {
      logger.error(`[Arkesel Verify] Exception during verification:`, error);
      return false;
    }
  }

  private formatPhoneNumber(phone: string): string {
    // Remove any non-digit characters
    let cleaned = phone.replace(/\D/g, '');

    // If it starts with +233, remove it
    if (cleaned.startsWith('233')) {
      cleaned = cleaned.substring(3);
    }

    // If it starts with 0, remove it
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }

    // Ensure it starts with 233
    if (!cleaned.startsWith('233')) {
      cleaned = `233${cleaned}`;
    }

    return cleaned;
  }
}

// Twilio Verify provider for international numbers
class TwilioVerifyProvider implements SmsProvider {
  private twilioClient: any;
  private verifyServiceSid: string;

  constructor(accountSid: string, authToken: string, verifyServiceSid: string) {
    const twilio = require('twilio');
    this.twilioClient = twilio(accountSid, authToken);
    this.verifyServiceSid = verifyServiceSid;
  }

  async sendSms(
    to: string,
    message: string,
    type: string
  ): Promise<SmsResult> {
    try {
      // For OTP messages, use Twilio Verify
      if (type === 'OTP_CODE' || message.includes('%otp_code%') || /\d{4,6}/.test(message)) {
        const verification = await this.twilioClient.verify.v2
          .services(this.verifyServiceSid)
          .verifications.create({
            channel: 'sms',
            to: to,
          });

        logger.info(
          `Twilio Verify OTP sent successfully to ${to}, verification SID: ${verification.sid}, status: ${verification.status}`
        );

        return {
          success: true,
          messageId: verification.sid,
        };
      } else {
        // For non-OTP messages, we would need regular SMS (not implemented in this version)
        // Since this provider is specifically for OTP via Verify, we'll return an error
        throw new Error('Twilio Verify provider only supports OTP messages');
      }
    } catch (error) {
      logger.error('Twilio Verify error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async verifyOtp(to: string, code: string): Promise<boolean> {
    try {
      const verificationCheck = await this.twilioClient.verify.v2
        .services(this.verifyServiceSid)
        .verificationChecks.create({
          to: to,
          code: code,
        });

      const isApproved = verificationCheck.status === 'approved';

      if (isApproved) {
        logger.info(`Twilio Verify OTP verification successful for ${to}`);
      } else {
        logger.warn(`Twilio Verify OTP verification failed for ${to}: status ${verificationCheck.status}`);
      }

      return isApproved;
    } catch (error) {
      logger.error('Twilio Verify OTP verification error:', error);
      return false;
    }
  }
}

// Composite SMS provider that routes to appropriate service based on phone number
class CompositeOtpProvider implements SmsProvider {
  private localProvider: SmsProvider;
  private internationalProvider: SmsProvider;

  constructor(localProvider: SmsProvider, internationalProvider: SmsProvider) {
    this.localProvider = localProvider;
    this.internationalProvider = internationalProvider;
  }

  private isGhanaNumber(phone: string): boolean {
    // Remove any non-digit characters
    const cleaned = phone.replace(/\D/g, '');

    // Check if it's a Ghana number (starts with 233 or is a local number)
    return (
      cleaned.startsWith('233') ||
      (cleaned.length === 9 && !cleaned.startsWith('233')) ||
      phone.startsWith('0')
    );
  }

  async sendSms(
    to: string,
    message: string,
    type: string
  ): Promise<SmsResult> {
    if (this.isGhanaNumber(to)) {
      logger.info(`Using local SMS provider for Ghana number: ${to}`);
      return await this.localProvider.sendSms(to, message, type);
    } else {
      logger.info(`Using Twilio Verify for international number: ${to}`);
      return await this.internationalProvider.sendSms(to, message, type);
    }
  }

  async verifyOtp?(to: string, code: string): Promise<boolean> {
    if (this.isGhanaNumber(to)) {
      if (typeof this.localProvider.verifyOtp === 'function') {
        return await this.localProvider.verifyOtp(to, code);
      }
      return false;
    } else {
      if (typeof this.internationalProvider.verifyOtp === 'function') {
        return await this.internationalProvider.verifyOtp(to, code);
      }
      return false;
    }
  }
}

// Factory function to create SMS service based on environment
export function createSmsService(): SmsService {
  const provider = process.env.SMS_PROVIDER || 'mock';

  let localProvider: SmsProvider;
  let internationalProvider: SmsProvider;

  // Set up local provider for Ghana numbers
  switch (provider) {
    case 'arkesel':
      if (!process.env.ARKESEL_API_KEY) {
        logger.warn(
          'Arkesel API key not configured, falling back to mock provider'
        );
        localProvider = new MockSmsProvider();
      } else {
        localProvider = new ArkeselSmsProvider(
          process.env.ARKESEL_API_KEY,
          process.env.ARKESEL_SENDER_ID || 'ELECTION',
          process.env.ARKESEL_SANDBOX === 'true'
        );
      }
      break;
    case 'mock':
    default:
      localProvider = new MockSmsProvider();
      break;
  }

  // Set up international provider (Twilio Verify)
  if (
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_VERIFY_SERVICE_SID
  ) {
    internationalProvider = new TwilioVerifyProvider(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN,
      process.env.TWILIO_VERIFY_SERVICE_SID
    );

    logger.info(
      `Twilio Verify configured with Service SID: ${process.env.TWILIO_VERIFY_SERVICE_SID}`
    );
  } else {
    logger.warn(
      'Twilio Verify credentials not configured, using mock provider for international numbers'
    );
    internationalProvider = new MockSmsProvider();
  }

  // Use composite provider that routes based on phone number
  const compositeProvider = new CompositeOtpProvider(localProvider, internationalProvider);

  return new SmsService(compositeProvider);
}

// Export convenience functions
const smsService = createSmsService();

export const sendOtpSms = (
  to: string,
  code: string,
  voterName: string
) => smsService.sendOtp(to, code, voterName);

export const sendVoteConfirmationSms = (
  to: string,
  voterName: string
) => smsService.sendVoteConfirmation(to, voterName);

export const sendElectionReminderSms = (
  to: string,
  voterName: string,
  type: 'OPEN' | 'MIDWAY' | 'NEAR_END' | 'END'
) => smsService.sendElectionReminder(to, voterName, type);

export const verifyOtpSms = (to: string, code: string) =>
  smsService.verifyOtp(to, code);

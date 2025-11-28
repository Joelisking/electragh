/**
 * ============================================================================
 * SMS SERVICE - MULTI-PROVIDER ROUTING AND FALLBACK SYSTEM
 * ============================================================================
 *
 * This service handles SMS delivery through multiple providers with automatic
 * routing based on destination country and fallback capabilities.
 *
 * CURRENT PROVIDER CONFIGURATION (as of deployment):
 * --------------------------------------------------
 * 1. African Countries (Ghana +233, Kenya +254, Tanzania +255, Nigeria +234, South Africa +27)
 *    PRIMARY: Arkesel SMS API
 *    FALLBACK: None
 *
 * 2. US & Canada (+1)
 *    PRIMARY: WhatsApp Business API (Facebook Graph API v21.0)
 *    FALLBACK: Twilio Messaging Service (if WhatsApp fails)
 *    REASON: Twilio A2P campaign is under review
 *
 * 3. Other International Numbers (UK, Europe, Asia, etc.)
 *    PRIMARY: Twilio Messaging Service
 *    FALLBACK: None (WhatsApp only used for US/Canada)
 *
 * HOW TO SWITCH US/CANADA FROM WHATSAPP TO TWILIO:
 * -------------------------------------------------
 * When Twilio A2P campaign is approved:
 *
 * 1. Update getCountryFromPhone() method (around line 819):
 *    FROM: if (cleaned.startsWith('1')) { return 'WHATSAPP'; }
 *    TO:   if (cleaned.startsWith('1')) { return 'TWILIO'; }
 *
 * 2. Update getProviderName() method (around line 122):
 *    FROM: if (cleaned.startsWith('1')) { return 'whatsapp'; }
 *    TO:   if (cleaned.startsWith('1')) { return 'twilio'; }
 *
 * 3. Restart the API server
 *
 * 4. Verify in .env that TWILIO_MESSAGING_SERVICE_SID is configured
 *
 * 5. (Optional) Set TWILIO_WEBHOOK_URL in production for delivery tracking
 *
 * The fallback logic will automatically use WhatsApp as backup if Twilio fails.
 *
 * FEATURES:
 * ---------
 * - Automatic provider routing based on phone number country code
 * - Fallback providers for US/Canada numbers
 * - Database logging for all messages (non-blocking)
 * - Twilio webhook support for delivery status tracking
 * - OTP verification support (Arkesel server-side, Twilio Verify, local fallback)
 * - Message templates for OTP, vote confirmation, and election reminders
 *
 * ============================================================================
 */

import { logger } from '../utils/logger';
import { prisma } from '../server';
import { SmsType, SmsStatus } from '@prisma/client';

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

  private async logMessageToDatabase(
    to: string,
    message: string,
    type: SmsType,
    provider: string,
    result: SmsResult,
    voterId?: string
  ): Promise<void> {
    try {
      const status: SmsStatus = result.success ? 'SENT' : 'FAILED';

      await prisma.smsMessage.create({
        data: {
          voterId,
          type,
          to,
          body: message,
          provider,
          status,
          providerMsgId: result.messageId,
          sentAt: result.success ? new Date() : null,
          failedAt: !result.success ? new Date() : null,
          error: result.error,
        },
      });
    } catch (error) {
      // Don't fail the SMS send if database logging fails
      logger.error('Failed to log SMS to database:', error);
    }
  }

  async sendOtp(
    to: string,
    code: string,
    voterName: string,
    voterId?: string
  ): Promise<SmsResult> {
    const message = `Hello ${voterName},\n\nYour OTP for Ghana Election is: ${code}\n\nThis code expires in 5 minutes.\n\nAGOSA EC`;
    const result = await this.provider.sendSms(
      to,
      message,
      'OTP_CODE'
    );

    // Determine provider name
    const providerName = this.getProviderName(to);

    // Log to database
    await this.logMessageToDatabase(
      to,
      message,
      'OTP_CODE',
      providerName,
      result,
      voterId
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

  private getProviderName(phone: string): string {
    const cleaned = phone.replace(/\D/g, '');
    const arkeselCountryCodes = ['233', '254', '255', '234', '27'];

    for (const code of arkeselCountryCodes) {
      if (cleaned.startsWith(code)) {
        return 'arkesel';
      }
    }

    // ============================================================================
    // PROVIDER NAME FOR DATABASE LOGGING
    // ============================================================================
    // IMPORTANT: This must match the actual primary provider being used
    // CURRENT: Twilio is primary for US/Canada (+1)
    // TO UPDATE: When switching back to WhatsApp, change 'twilio' to 'whatsapp' below
    // ============================================================================

    // US/Canada - Using Twilio as primary
    if (cleaned.startsWith('1')) {
      return 'twilio'; // A2P campaign approved
    }

    // All other international numbers use Twilio
    return 'twilio';
  }

  async sendVoteConfirmation(
    to: string,
    voterName: string,
    voterId?: string
  ): Promise<SmsResult> {
    const message = `Hello ${voterName},\n\nYour vote has been successfully recorded. Thank you for participating in the election.\n\nAGOSA EC`;
    const result = await this.provider.sendSms(
      to,
      message,
      'VOTE_CONFIRMATION'
    );

    // Determine provider name
    const providerName = this.getProviderName(to);

    // Log to database
    await this.logMessageToDatabase(
      to,
      message,
      'VOTE_CONFIRMATION',
      providerName,
      result,
      voterId
    );

    return result;
  }

  async sendElectionReminder(
    to: string,
    voterName: string,
    type: 'OPEN' | 'MIDWAY' | 'NEAR_END' | 'END',
    url: string,
    voterId?: string
  ): Promise<SmsResult> {
    let message = '';

    switch (type) {
      case 'OPEN':
        message = `Hello ${voterName},\n\nVoting is now OPEN! Cast your vote at ${url}\n\nAGOSA EC`;
        break;
      case 'MIDWAY':
        message = `Hello ${voterName},\n\nReminder: Voting is still open. Don't miss your chance to vote!\n\nAGOSA EC`;
        break;
      case 'NEAR_END':
        message = `Hello ${voterName},\n\nFinal reminder: Voting ends soon! Cast your vote now.\n\nAGOSA EC`;
        break;
      case 'END':
        message = `Hello ${voterName},\n\nVoting has now ended. Thank you to all who participated.\n\nAGOSA EC`;
        break;
    }

    const result = await this.provider.sendSms(
      to,
      message,
      `VOTE_${type}`
    );

    // Determine provider name
    const providerName = this.getProviderName(to);

    // Log to database
    await this.logMessageToDatabase(
      to,
      message,
      'VOTE_REMINDER',
      providerName,
      result,
      voterId
    );

    return result;
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
      // Format phone number for African countries
      // Supports: Ghana (+233), Kenya (+254), Tanzania (+255), Nigeria (+234), South Africa (+27)
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
            `OTP sent successfully via Arkesel OTP API to ${to}, response: ${JSON.stringify(
              data
            )}`
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

      logger.info(
        `[Arkesel Verify] Starting verification - Phone: ${formattedPhone}, Code: ${code}, Sandbox: ${this.sandbox}`
      );

      // In sandbox mode, Arkesel's OTP verification might not work
      // Return false to trigger local verification fallback
      if (this.sandbox) {
        logger.warn(
          `[Arkesel Verify] Sandbox mode enabled - skipping API verification, will use local fallback`
        );
        return false;
      }

      const payload = {
        number: formattedPhone,
        code: code,
      };

      logger.info(
        `[Arkesel Verify] Request payload: ${JSON.stringify(payload)}`
      );
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
      logger.info(
        `[Arkesel Verify] Response Headers: ${JSON.stringify(
          Object.fromEntries(response.headers.entries())
        )}`
      );
      logger.info(`[Arkesel Verify] Response Body: ${responseText}`);

      // Try to parse the response
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        logger.error(
          `[Arkesel Verify] Failed to parse response as JSON: ${responseText}`
        );
        return false;
      }

      // Arkesel OTP verification response codes:
      // - code: "1000" = Success (OTP sent)
      // - code: "1100" = Success (OTP verified) ✓ This is what we get!
      // - code: "1001" = Invalid/expired OTP
      // - code: "1002" = No OTP found for this number
      // - Other codes = API errors

      logger.info(
        `[Arkesel Verify] Parsed response: ${JSON.stringify(data)}`
      );

      const successCodes = ['1000', '1100']; // 1100 is for successful verification
      const failureCodes = ['1001', '1002', '1003']; // Invalid/expired/not found

      if (successCodes.includes(data.code)) {
        logger.info(
          `[Arkesel Verify] ✓ OTP verified successfully for ${to}`
        );
        return true;
      }

      if (failureCodes.includes(data.code)) {
        logger.warn(
          `[Arkesel Verify] ✗ OTP verification failed for ${to}: ${
            data.message || data.code
          }`
        );
        return false;
      }

      // Check alternative success indicators
      if (data.status === 'success' || data.success === true) {
        logger.info(
          `[Arkesel Verify] ✓ OTP verified successfully for ${to} (via status field)`
        );
        return true;
      }

      // Unknown response
      logger.warn(
        `[Arkesel Verify] ⚠ Unexpected response for ${to}: ${JSON.stringify(
          data
        )}`
      );
      return false;
    } catch (error) {
      logger.error(
        `[Arkesel Verify] Exception during verification:`,
        error
      );
      return false;
    }
  }

  private formatPhoneNumber(phone: string): string {
    // Remove any non-digit characters
    let cleaned = phone.replace(/\D/g, '');

    // African country codes
    const africanCountryCodes = ['233', '254', '255', '234', '27'];

    // Check if already has a country code
    for (const code of africanCountryCodes) {
      if (cleaned.startsWith(code)) {
        return cleaned; // Already formatted correctly
      }
    }

    // If starts with 0 (local number), remove it
    if (cleaned.startsWith('0')) {
      cleaned = cleaned.substring(1);
    }

    // Try to detect country code based on number length and pattern
    // This is a fallback - ideally the number should already include country code
    // For now, default to Ghana (233) if no country code is detected
    // In production, you should enforce international format from the frontend
    if (!cleaned.match(/^(233|254|255|234|27)/)) {
      logger.warn(
        `Phone number ${phone} doesn't have a valid African country code, defaulting to Ghana (+233)`
      );
      cleaned = `233${cleaned}`;
    }

    return cleaned;
  }
}

// Twilio SMS provider for international numbers (supports both OTP and regular SMS)
class TwilioSmsProvider implements SmsProvider {
  private twilioClient: any;
  private verifyServiceSid?: string;
  private messagingServiceSid?: string;

  constructor(
    accountSid: string,
    authToken: string,
    verifyServiceSid?: string,
    messagingServiceSid?: string
  ) {
    const twilio = require('twilio');
    this.twilioClient = twilio(accountSid, authToken);
    this.verifyServiceSid = verifyServiceSid;
    this.messagingServiceSid = messagingServiceSid;
  }

  async sendSms(
    to: string,
    message: string,
    type: string
  ): Promise<SmsResult> {
    try {
      // For OTP messages, use Twilio Verify if available
      if (
        (type === 'OTP_CODE' ||
          message.includes('%otp_code%') ||
          /\d{4,6}/.test(message)) &&
        this.verifyServiceSid
      ) {
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
        // For non-OTP messages, use Twilio Messaging Service (A2P for US/Canada)
        if (!this.messagingServiceSid) {
          throw new Error(
            'Twilio Messaging Service SID not configured for non-OTP messages'
          );
        }

        const messageParams: any = {
          messagingServiceSid: this.messagingServiceSid,
          to: to,
          body: message,
        };

        // Add StatusCallback webhook URL if TWILIO_WEBHOOK_URL is configured
        if (process.env.TWILIO_WEBHOOK_URL) {
          messageParams.statusCallback = `${process.env.TWILIO_WEBHOOK_URL}/api/webhooks/twilio/status`;
        }

        const messageResponse =
          await this.twilioClient.messages.create(messageParams);

        logger.info(
          `Twilio SMS sent successfully to ${to}, message SID: ${messageResponse.sid}, status: ${messageResponse.status}`
        );

        return {
          success: true,
          messageId: messageResponse.sid,
        };
      }
    } catch (error) {
      logger.error('Twilio SMS error:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async verifyOtp(to: string, code: string): Promise<boolean> {
    // Only works if Verify service is configured
    if (!this.verifyServiceSid) {
      logger.warn(
        'Twilio Verify service not configured, cannot verify OTP'
      );
      return false;
    }

    try {
      logger.info(
        `[Twilio Verify] Attempting verification - Phone: ${to}, Code: ${code}, Service SID: ${this.verifyServiceSid}`
      );

      const verificationCheck = await this.twilioClient.verify.v2
        .services(this.verifyServiceSid)
        .verificationChecks.create({
          to: to,
          code: code,
        });

      logger.info(
        `[Twilio Verify] Verification response - Status: ${verificationCheck.status}, SID: ${verificationCheck.sid}`
      );

      const isApproved = verificationCheck.status === 'approved';

      if (isApproved) {
        logger.info(
          `Twilio Verify OTP verification successful for ${to}`
        );
      } else {
        logger.warn(
          `Twilio Verify OTP verification failed for ${to}: status ${verificationCheck.status}`
        );
      }

      return isApproved;
    } catch (error) {
      logger.error('[Twilio Verify] OTP verification error:', error);
      logger.error('[Twilio Verify] Error details:', JSON.stringify(error, null, 2));
      return false;
    }
  }
}

// WhatsApp Business API provider for US and Canada (Facebook API)
class WhatsAppBusinessProvider implements SmsProvider {
  private accessToken: string;
  private phoneNumberId: string;
  private apiUrl: string;
  private apiVersion: string;

  constructor(
    accessToken: string,
    phoneNumberId: string,
    apiVersion?: string
  ) {
    this.accessToken = accessToken;
    this.phoneNumberId = phoneNumberId;
    this.apiVersion = apiVersion || 'v18.0';
    this.apiUrl = `https://graph.facebook.com/${this.apiVersion}/${phoneNumberId}/messages`;
  }

  async sendSms(
    to: string,
    message: string,
    type: string
  ): Promise<SmsResult> {
    try {
      // Format phone number (remove any non-digits and ensure it has country code)
      let formattedPhone = to.replace(/\D/g, '');

      // Ensure it starts with country code (no + sign for Facebook API)
      if (
        !formattedPhone.startsWith('1') &&
        formattedPhone.length === 10
      ) {
        formattedPhone = `1${formattedPhone}`; // Add US country code
      }

      // ============================================================================
      // WhatsApp Business API Template Message Support
      // ============================================================================
      // WhatsApp requires approved templates for messages outside 24-hour window
      // Template names available:
      // - election_start_notification: For election start reminders
      // - Add more templates as needed
      // ============================================================================

      let payload: any;

      // Use template message for known types to avoid 24-hour window restrictions
      if (
        type === 'VOTE_OPEN' ||
        type === 'ADMIN_NOTIFICATION' ||
        message.includes('OPEN')
      ) {
        // Extract voter name from message if available
        // Format: "Hello {name},\n\nVoting is now OPEN! Cast your vote at [VOTING_URL]\n\nElectoral Commission"
        let voterName = 'Voter'; // Default fallback
        const helloMatch = message.match(/^Hello\s+([^,]+),/);
        if (helloMatch) {
          voterName = helloMatch[1].trim();
        }

        const electionName = 'AGOSA Election';
        const closingTime = 'November 30, 2025 at 11:59pm';

        // Use approved template for election start notification
        payload = {
          messaging_product: 'whatsapp',
          to: formattedPhone,
          type: 'template',
          template: {
            name: 'election_start_notification',
            language: {
              code: 'en', // or 'en_US' depending on your template configuration
            },
            components: [
              {
                type: 'body',
                parameters: [
                  {
                    type: 'text',
                    text: voterName, // {{1}} - Voter name
                  },
                  {
                    type: 'text',
                    text: electionName, // {{2}} - Election name
                  },
                  {
                    type: 'text',
                    text: closingTime, // {{3}} - Closing date/time
                  },
                ],
              },
            ],
          },
        };
        logger.info(
          `Using WhatsApp template 'election_start_notification' for ${to} with params: ${voterName}, ${electionName}, ${closingTime}`
        );
      } else {
        // Fallback to text message (only works within 24-hour window)
        payload = {
          messaging_product: 'whatsapp',
          to: formattedPhone,
          type: 'text',
          text: {
            body: message,
          },
        };
        logger.warn(
          `Using WhatsApp text message for ${to} - only works within 24-hour window`
        );
      }

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(
          `WhatsApp API error: ${
            responseData.error?.message || response.statusText
          }`
        );
      }

      logger.info(
        `WhatsApp message sent successfully to ${to}, message ID: ${
          responseData.messages?.[0]?.id || 'unknown'
        }`
      );

      return {
        success: true,
        messageId:
          responseData.messages?.[0]?.id || `whatsapp_${Date.now()}`,
      };
    } catch (error) {
      logger.error('WhatsApp Business API error:', error);
      return {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // WhatsApp doesn't support automatic OTP verification
  // Will rely on local verification fallback
}

// Composite SMS provider that routes to appropriate service based on phone number
class CompositeOtpProvider implements SmsProvider {
  private arkeselProvider: SmsProvider; // For Ghana, Kenya, Tanzania, Nigeria, South Africa
  private whatsappProvider: SmsProvider; // For US and Canada
  private twilioProvider: SmsProvider; // For other international numbers

  constructor(
    arkeselProvider: SmsProvider,
    whatsappProvider: SmsProvider,
    twilioProvider: SmsProvider
  ) {
    this.arkeselProvider = arkeselProvider;
    this.whatsappProvider = whatsappProvider;
    this.twilioProvider = twilioProvider;
  }

  private getCountryFromPhone(
    phone: string
  ): 'ARKESEL' | 'WHATSAPP' | 'TWILIO' {
    // Remove any non-digit characters
    const cleaned = phone.replace(/\D/g, '');

    // African countries that should use Arkesel
    // Ghana: +233, Kenya: +254, Tanzania: +255, Nigeria: +234, South Africa: +27
    const arkeselCountryCodes = ['233', '254', '255', '234', '27'];

    // Check for Arkesel-supported countries (African countries)
    for (const code of arkeselCountryCodes) {
      if (cleaned.startsWith(code)) {
        return 'ARKESEL';
      }
    }

    // ============================================================================
    // PRIMARY PROVIDER FOR US/CANADA NUMBERS (+1)
    // ============================================================================
    // CURRENT: Twilio (A2P campaign approved)
    // FALLBACK: WhatsApp Business API (if Twilio fails)
    //
    // TO SWITCH BACK TO WHATSAPP (if needed):
    // 1. Change the code below from:
    //    if (cleaned.startsWith('1')) { return 'TWILIO'; }
    //    to:
    //    if (cleaned.startsWith('1')) { return 'WHATSAPP'; }
    // 2. The fallback logic in sendSms() will automatically use Twilio as backup
    // ============================================================================

    // US and Canada (+1) - Using Twilio as primary with WhatsApp fallback
    if (cleaned.startsWith('1')) {
      return 'TWILIO'; // A2P campaign approved
    }

    // All other international numbers use Twilio
    return 'TWILIO';
  }

  async sendSms(
    to: string,
    message: string,
    type: string
  ): Promise<SmsResult> {
    const provider = this.getCountryFromPhone(to);

    switch (provider) {
      case 'ARKESEL':
        logger.info(`Using Arkesel for African number: ${to}`);
        return await this.arkeselProvider.sendSms(to, message, type);

      case 'WHATSAPP':
        // ============================================================================
        // US/CANADA PRIMARY PROVIDER: WhatsApp Business API
        // ============================================================================
        // CURRENT SETUP: WhatsApp is PRIMARY for US/Canada (+1 numbers)
        // This case handles when getCountryFromPhone() returns 'WHATSAPP'
        //
        // FALLBACK: If WhatsApp fails, Twilio will be tried as backup (see below)
        // ============================================================================
        logger.info(
          `Using WhatsApp Business API for US/Canada number: ${to}`
        );
        const whatsappResult = await this.whatsappProvider.sendSms(
          to,
          message,
          type
        );

        // If WhatsApp fails for US/Canada, try Twilio as backup
        if (
          !whatsappResult.success &&
          to.replace(/\D/g, '').startsWith('1')
        ) {
          logger.warn(
            `WhatsApp failed for US/Canada number ${to}, attempting Twilio fallback`
          );
          return await this.twilioProvider.sendSms(to, message, type);
        }

        return whatsappResult;

      case 'TWILIO':
      default:
        // ============================================================================
        // TWILIO FOR OTHER INTERNATIONAL NUMBERS (non-US/Canada/Africa)
        // ============================================================================
        // When A2P campaign is approved and you switch US/Canada to TWILIO:
        // 1. Change getCountryFromPhone() to return 'TWILIO' for +1 numbers
        // 2. This case will handle US/Canada with automatic WhatsApp fallback
        // 3. The fallback logic below will activate if Twilio fails for US/Canada
        // ============================================================================
        logger.info(
          `Using Twilio SMS for international number: ${to}`
        );
        const twilioResult = await this.twilioProvider.sendSms(
          to,
          message,
          type
        );

        // If Twilio fails for US/Canada numbers (+1), try WhatsApp as backup
        if (
          !twilioResult.success &&
          to.replace(/\D/g, '').startsWith('1')
        ) {
          logger.warn(
            `Twilio failed for US/Canada number ${to}, attempting WhatsApp fallback`
          );
          return await this.whatsappProvider.sendSms(
            to,
            message,
            type
          );
        }

        return twilioResult;
    }
  }

  async verifyOtp?(to: string, code: string): Promise<boolean> {
    const provider = this.getCountryFromPhone(to);

    switch (provider) {
      case 'ARKESEL':
        if (typeof this.arkeselProvider.verifyOtp === 'function') {
          return await this.arkeselProvider.verifyOtp(to, code);
        }
        return false;

      case 'WHATSAPP':
        // WhatsApp doesn't support automatic OTP verification
        // BUT: For US/Canada numbers, we use Twilio Verify for OTP sending/verification
        // even though WhatsApp is used for other message types
        // So we should verify using Twilio Verify API
        logger.info(`US/Canada number detected, using Twilio Verify for OTP verification: ${to}`);
        if (typeof this.twilioProvider.verifyOtp === 'function') {
          return await this.twilioProvider.verifyOtp(to, code);
        }
        return false;

      case 'TWILIO':
      default:
        if (typeof this.twilioProvider.verifyOtp === 'function') {
          return await this.twilioProvider.verifyOtp(to, code);
        }
        return false;
    }
  }
}

// Factory function to create SMS service based on environment
export function createSmsService(): SmsService {
  const provider = process.env.SMS_PROVIDER || 'mock';

  let arkeselProvider: SmsProvider;
  let whatsappProvider: SmsProvider;
  let twilioProvider: SmsProvider;

  // Set up Arkesel provider for African countries
  // (Ghana, Kenya, Tanzania, Nigeria, South Africa)
  switch (provider) {
    case 'arkesel':
      if (!process.env.ARKESEL_API_KEY) {
        logger.warn(
          'Arkesel API key not configured, falling back to mock provider'
        );
        arkeselProvider = new MockSmsProvider();
      } else {
        arkeselProvider = new ArkeselSmsProvider(
          process.env.ARKESEL_API_KEY,
          process.env.ARKESEL_SENDER_ID || 'ELECTION',
          process.env.ARKESEL_SANDBOX === 'true'
        );
        logger.info(
          'Arkesel configured for Ghana, Kenya, Tanzania, Nigeria, and South Africa'
        );
      }
      break;
    case 'mock':
    default:
      arkeselProvider = new MockSmsProvider();
      break;
  }

  // Set up WhatsApp Business API for US and Canada (Facebook API)
  if (
    process.env.WHATSAPP_ACCESS_TOKEN &&
    process.env.WHATSAPP_PHONE_NUMBER_ID
  ) {
    whatsappProvider = new WhatsAppBusinessProvider(
      process.env.WHATSAPP_ACCESS_TOKEN,
      process.env.WHATSAPP_PHONE_NUMBER_ID,
      process.env.WHATSAPP_API_VERSION // Use version from .env (v21.0)
    );
    logger.info(
      `WhatsApp Business API (Facebook) configured for US and Canada with Phone Number ID: ${process.env.WHATSAPP_PHONE_NUMBER_ID}`
    );
  } else {
    logger.warn(
      'WhatsApp Business credentials not configured, using mock provider for US/Canada numbers'
    );
    whatsappProvider = new MockSmsProvider();
  }

  // Set up Twilio SMS for international numbers (including US/Canada with A2P campaign)
  // Supports both OTP (via Verify) and regular SMS (via Messaging Service with A2P)
  if (
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN
  ) {
    twilioProvider = new TwilioSmsProvider(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN,
      process.env.TWILIO_VERIFY_SERVICE_SID, // Optional: for OTP verification
      process.env.TWILIO_MESSAGING_SERVICE_SID // Required: for regular SMS (includes A2P campaign for US/Canada)
    );

    const features: string[] = [];
    if (process.env.TWILIO_VERIFY_SERVICE_SID) {
      features.push(
        `OTP via Verify Service (${process.env.TWILIO_VERIFY_SERVICE_SID})`
      );
    }
    if (process.env.TWILIO_MESSAGING_SERVICE_SID) {
      features.push(
        `SMS via Messaging Service with A2P (${process.env.TWILIO_MESSAGING_SERVICE_SID})`
      );
    }

    logger.info(
      `Twilio configured for international numbers including US/Canada A2P: ${features.join(
        ', '
      )}`
    );
  } else {
    logger.warn(
      'Twilio credentials not configured, using mock provider for international numbers'
    );
    twilioProvider = new MockSmsProvider();
  }

  // Use composite provider that routes based on phone number
  const compositeProvider = new CompositeOtpProvider(
    arkeselProvider,
    whatsappProvider,
    twilioProvider
  );

  return new SmsService(compositeProvider);
}

// Export convenience functions
const smsService = createSmsService();

export const sendOtpSms = (
  to: string,
  code: string,
  voterName: string,
  voterId?: string
) => smsService.sendOtp(to, code, voterName, voterId);

export const sendVoteConfirmationSms = (
  to: string,
  voterName: string,
  voterId?: string
) => smsService.sendVoteConfirmation(to, voterName, voterId);

export const sendElectionReminderSms = (
  to: string,
  voterName: string,
  type: 'OPEN' | 'MIDWAY' | 'NEAR_END' | 'END',
  url: string,
  voterId?: string
) =>
  smsService.sendElectionReminder(to, voterName, type, url, voterId);

export const verifyOtpSms = (to: string, code: string) =>
  smsService.verifyOtp(to, code);

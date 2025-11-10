import dotenv from 'dotenv';
import { logger } from '../src/utils/logger';
import { createSmsService } from '../src/services/smsService';

// Load environment variables from .env.local
dotenv.config({ path: '.env.local' });

async function testTwilioSms() {
  try {
    // Test international number
    const testPhone = '+233506232324'; // Example Ghana number
    const testName = 'Joel';
    const testOtp = '123456';

    logger.info('Testing Twilio SMS integration...');
    logger.info(`Test phone: ${testPhone}`);

    // Check configuration
    const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID;
    logger.info(
      `Twilio Verify configured with Service SID: ${verifyServiceSid}`
    );

    const smsService = createSmsService();

    // Test sending OTP
    logger.info('Sending OTP...');
    const result = await smsService.sendOtp(
      testPhone,
      testOtp,
      testName
    );

    if (result.success) {
      logger.info(
        `✅ OTP sent successfully! Message ID: ${result.messageId}`
      );

      // Test verification
      logger.info('Testing OTP verification...');
      const verifyResult = await smsService.verifyOtp(
        testPhone,
        testOtp
      );

      if (verifyResult) {
        logger.info('✅ OTP verification successful!');
      } else {
        logger.error('❌ OTP verification failed');
      }
    } else {
      logger.error(`❌ Failed to send OTP: ${result.error}`);
    }
  } catch (error) {
    logger.error('Error testing Twilio SMS:', error);
  }
}

testTwilioSms();

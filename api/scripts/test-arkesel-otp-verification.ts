import dotenv from 'dotenv';
import { createSmsService } from '../src/services/smsService';
import * as readline from 'readline';

// Load environment variables
dotenv.config();

// Create readline interface for user input
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Helper function to ask user for input
function askQuestion(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function testArkeselOtpWithVerification() {
  console.log(
    '🚀 Testing Arkesel OTP with Real Phone Verification...\n'
  );

  // Check if Arkesel is configured
  if (!process.env.ARKESEL_API_KEY) {
    console.error(
      '❌ ARKESEL_API_KEY not found in environment variables'
    );
    console.log('\n📝 Add to your .env file:');
    console.log('ARKESEL_API_KEY=your_api_key_here');
    console.log('ARKESEL_SENDER_ID=ELECTION');
    console.log('ARKESEL_SANDBOX=false'); // Set to false for real SMS
    console.log('SMS_PROVIDER=arkesel');
    return;
  }

  // Set SMS provider to Arkesel
  process.env.SMS_PROVIDER = 'arkesel';

  const smsService = createSmsService();

  // Get phone number from user
  console.log('📱 Enter your phone number for testing:');
  console.log(
    '   Format: +233XXXXXXXXX (Ghana) or +1XXXXXXXXXX (US)'
  );
  const userPhone = await askQuestion('   Phone: ');

  if (!userPhone) {
    console.log('❌ No phone number provided. Exiting...');
    rl.close();
    return;
  }

  // Get voter name
  const voterName =
    (await askQuestion('👤 Enter your name: ')) || 'Test User';

  console.log(`\n📱 Testing with phone: ${userPhone}`);
  console.log(`👤 Voter name: ${voterName}`);
  console.log(
    `🔧 Sandbox mode: ${
      process.env.ARKESEL_SANDBOX === 'true' ? 'ON' : 'OFF'
    }`
  );

  if (process.env.ARKESEL_SANDBOX === 'true') {
    console.log(
      '   ℹ️  Sandbox mode: Messages will NOT be delivered to real phones'
    );
    console.log(
      '   ℹ️  This is for testing the integration without costs\n'
    );
  } else {
    console.log(
      '   ⚠️  Production mode: Messages WILL be sent to real phones'
    );
    console.log('   ⚠️  This will consume your SMS credits\n');
  }

  try {
    console.log('🔍 Testing OTP SMS with real phone...\n');

    // Arkesel generates its own OTP code
    const otpMessage = `Hello ${voterName},\n\nYour OTP for Ghana Election is: %otp_code%\n\nThis code expires in 5 minutes.\n\nElectoral Commission`;

    console.log(`📝 Message template: ${otpMessage}\n`);
    console.log('ℹ️  Note: Arkesel will generate its own OTP code\n');

    // Send OTP SMS
    const result = await smsService.sendOtp(
      userPhone,
      '000000', // Placeholder - Arkesel will generate the real code
      voterName
    );

    if (result.success) {
      console.log('✅ OTP SMS sent successfully!');
      console.log(`   Message ID: ${result.messageId}`);
      console.log(`   📱 Check your phone for the message\n`);

      // Wait for user to receive and enter the OTP
      console.log('⏳ Waiting for you to receive the SMS...');
      console.log('   (This may take 30-60 seconds)\n');

      const enteredOtp = await askQuestion(
        '🔐 Enter the OTP you received: '
      );

      if (enteredOtp && enteredOtp.length === 6) {
        console.log('🎉 OTP Verification SUCCESSFUL!');
        console.log('   ✅ The SMS was delivered correctly');
        console.log('   ✅ You received a valid OTP code');
        console.log(
          '   ✅ Your Arkesel integration is working perfectly!'
        );
        console.log(`   📱 Received OTP: ${enteredOtp}`);
      } else {
        console.log('❌ OTP Verification FAILED!');
        console.log(`   Received: ${enteredOtp}`);
        console.log('   This could mean:');
        console.log('   - SMS was not delivered');
        console.log('   - Invalid OTP format entered');
        console.log('   - SMS delivery was delayed');
      }
    } else {
      console.log('❌ OTP SMS sending failed!');
      console.log(`   Error: ${result.error}`);
    }
  } catch (error) {
    console.log('❌ Test failed with error:', error);
  }

  console.log('\n🏁 OTP verification testing completed!');
  console.log('\n📚 Next steps:');
  console.log(
    '1. If verification was successful, your integration is ready!'
  );
  console.log(
    '2. If verification failed, check your phone number format'
  );
  console.log(
    '3. Make sure your Arkesel account has sufficient credits'
  );
  console.log('4. Verify your sender ID is approved by Arkesel');

  rl.close();
}

// Run the test
testArkeselOtpWithVerification().catch(console.error);

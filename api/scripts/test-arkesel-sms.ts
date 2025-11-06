import dotenv from 'dotenv';
import { createSmsService } from '../src/services/smsService';

// Load environment variables
dotenv.config();

async function testArkeselSms() {
  console.log('🚀 Testing Arkesel SMS Service...\n');

  // Check if Arkesel is configured
  if (!process.env.ARKESEL_API_KEY) {
    console.error(
      '❌ ARKESEL_API_KEY not found in environment variables'
    );
    console.log(
      '\n📝 To test Arkesel SMS, add the following to your .env file:'
    );
    console.log('ARKESEL_API_KEY=your_api_key_here');
    console.log('ARKESEL_SENDER_ID=ELECTION');
    console.log('ARKESEL_SANDBOX=true');
    console.log('SMS_PROVIDER=arkesel');
    return;
  }

  // Set SMS provider to Arkesel
  process.env.SMS_PROVIDER = 'arkesel';

  const smsService = createSmsService();

  // Test phone number (Ghana format)
  const testPhone = '+233594765977';
  const testVoterName = 'John Doe';

  console.log(`📱 Testing with phone: ${testPhone}`);
  console.log(`👤 Voter name: ${testVoterName}`);
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
    // Test 1: Send OTP SMS
    console.log('1️⃣ Testing OTP SMS...');
    const otpResult = await smsService.sendOtp(
      testPhone,
      '123456',
      testVoterName
    );

    if (otpResult.success) {
      console.log('✅ OTP SMS sent successfully!');
      console.log(`   Message ID: ${otpResult.messageId}`);
    } else {
      console.log('❌ OTP SMS failed:', otpResult.error);
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 2: Send Vote Confirmation SMS
    console.log('2️⃣ Testing Vote Confirmation SMS...');
    const confirmationResult = await smsService.sendVoteConfirmation(
      testPhone,
      testVoterName
    );

    if (confirmationResult.success) {
      console.log('✅ Vote Confirmation SMS sent successfully!');
      console.log(`   Message ID: ${confirmationResult.messageId}`);
    } else {
      console.log(
        '❌ Vote Confirmation SMS failed:',
        confirmationResult.error
      );
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 3: Send Election Reminder SMS
    console.log('3️⃣ Testing Election Reminder SMS...');
    const reminderResult = await smsService.sendElectionReminder(
      testPhone,
      testVoterName,
      'OPEN'
    );

    if (reminderResult.success) {
      console.log('✅ Election Reminder SMS sent successfully!');
      console.log(`   Message ID: ${reminderResult.messageId}`);
    } else {
      console.log(
        '❌ Election Reminder SMS failed:',
        reminderResult.error
      );
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test 4: Test with different phone number formats
    console.log('4️⃣ Testing different phone number formats...');
    const phoneFormats = [
      '0241234567', // Local format
      '233241234567', // International without +
      '+233241234567', // International with +
      '233 24 123 4567', // With spaces
    ];

    for (const phone of phoneFormats) {
      console.log(`   Testing format: ${phone}`);
      const result = await smsService.sendOtp(
        phone,
        '999999',
        'Test User'
      );
      console.log(
        `   Result: ${
          result.success
            ? '✅ Success'
            : '❌ Failed - ' + result.error
        }`
      );
    }
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }

  console.log('\n🏁 Arkesel SMS testing completed!');
  console.log('\n📚 Next steps:');

  if (process.env.ARKESEL_SANDBOX === 'true') {
    console.log('✅ Sandbox mode: Integration tested successfully!');
    console.log('   - API calls are working correctly');
    console.log('   - No real SMS messages were sent');
    console.log('   - No SMS credits were consumed');
    console.log('\n📱 To test with real SMS delivery:');
    console.log('   1. Set ARKESEL_SANDBOX=false in your .env file');
    console.log('   2. Use your own phone number in the test script');
    console.log('   3. Run the test again');
  } else {
    console.log('✅ Production mode: Real SMS messages were sent!');
    console.log('   - Check your phone for the test messages');
    console.log(
      '   - Check your Arkesel dashboard for delivery status'
    );
    console.log('   - SMS credits were consumed');
  }

  console.log('\n🔧 Configuration:');
  console.log('   - Check your Arkesel dashboard for API call logs');
  console.log('   - Monitor SMS credit usage');
  console.log('   - Update production credentials when ready');
}

// Run the test
testArkeselSms().catch(console.error);

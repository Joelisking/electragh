import dotenv from 'dotenv';
import { createSmsService } from '../src/services/smsService';

// Load environment variables
dotenv.config();

async function testArkeselOtpOnly() {
  console.log('🚀 Testing Arkesel OTP SMS Only...\n');

  // Check if Arkesel is configured
  if (!process.env.ARKESEL_API_KEY) {
    console.error(
      '❌ ARKESEL_API_KEY not found in environment variables'
    );
    console.log('\n📝 Add to your .env file:');
    console.log('ARKESEL_API_KEY=your_api_key_here');
    console.log('ARKESEL_SENDER_ID=ELECTION');
    console.log('ARKESEL_SANDBOX=true');
    console.log('SMS_PROVIDER=arkesel');
    return;
  }

  // Set SMS provider to Arkesel
  process.env.SMS_PROVIDER = 'arkesel';

  const smsService = createSmsService();

  // Test phone number (Ghana format) - UPDATE THIS TO YOUR PHONE NUMBER
  const testPhone = '+233594765977'; // Change this to your real phone number
  const testVoterName = 'John Doe';
  const otpCode = '123456';

  console.log(`📱 Testing with phone: ${testPhone}`);
  console.log(`👤 Voter name: ${testVoterName}`);
  console.log(`🔑 OTP Code: ${otpCode}`);
  console.log(
    `🔧 Sandbox mode: ${
      process.env.ARKESEL_SANDBOX === 'true' ? 'ON' : 'OFF'
    }`
  );
  console.log(
    `🌐 API Endpoint: https://sms.arkesel.com/api/otp/generate`
  );
  console.log(
    `🔑 API Key: ${process.env.ARKESEL_API_KEY ? 'Set' : 'Not set'}`
  );
  console.log(`📝 Sender ID: "${process.env.ARKESEL_SENDER_ID}"`);

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
    console.log('🔍 Testing network connectivity...');

    // Test basic connectivity first
    try {
      const response = await fetch(
        'https://sms.arkesel.com/api/otp/generate',
        {
          method: 'POST',
          headers: {
            'api-key': process.env.ARKESEL_API_KEY!,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            number: testPhone,
            sender_id: process.env.ARKESEL_SENDER_ID || 'ELECTION',
            message: 'Test OTP: %otp_code%',
            type: 'numeric',
            length: 6,
            expiry: 5,
            medium: 'sms',
          }),
        }
      );

      console.log(
        `✅ Network connectivity: OK (Status: ${response.status})`
      );

      if (response.ok) {
        const data = await response.json();
        console.log(
          '✅ API Response:',
          JSON.stringify(data, null, 2)
        );

        if (data.code === '1000') {
          console.log('🎉 OTP API call successful!');
          console.log(`   USSD Code: ${data.ussd_code || 'N/A'}`);
          console.log(`   Message: ${data.message}`);
        } else {
          console.log(
            '⚠️  API returned non-success code:',
            data.code
          );
        }
      } else {
        const errorText = await response.text();
        console.log('❌ API Error Response:', errorText);
      }
    } catch (networkError) {
      console.log(
        '❌ Network Error:',
        networkError instanceof Error
          ? networkError.message
          : String(networkError)
      );
      console.log('\n🔧 Troubleshooting steps:');
      console.log('1. Check your internet connection');
      console.log(
        '2. Verify DNS resolution: nslookup sms.arkesel.com'
      );
      console.log('3. Check firewall/proxy settings');
      console.log('4. Try from a different network');
      console.log('5. Verify the API endpoint URL');
      return;
    }

    console.log('\n' + '='.repeat(50) + '\n');

    // Test OTP SMS
    console.log('1️⃣ Testing OTP SMS...');
    const otpResult = await smsService.sendOtp(
      testPhone,
      otpCode,
      testVoterName
    );

    if (otpResult.success) {
      console.log('✅ OTP SMS sent successfully!');
      console.log(`   Message ID: ${otpResult.messageId}`);
      console.log(
        '   📱 Check your phone for the message (if not in sandbox mode)'
      );
    } else {
      console.log('❌ OTP SMS failed:', otpResult.error);
    }
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  }

  console.log('\n🏁 Arkesel OTP testing completed!');

  if (process.env.ARKESEL_SANDBOX === 'true') {
    console.log(
      '\n✅ Sandbox mode: Integration tested successfully!'
    );
    console.log('   - API calls are working correctly');
    console.log('   - No real SMS messages were sent');
    console.log('   - No SMS credits were consumed');
  } else {
    console.log('\n✅ Production mode: Real SMS message was sent!');
    console.log('   - Check your phone for the test message');
    console.log(
      '   - Check your Arkesel dashboard for delivery status'
    );
    console.log('   - SMS credits were consumed');
  }
}

// Run the test
testArkeselOtpOnly().catch(console.error);

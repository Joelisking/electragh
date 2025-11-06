import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testOtpViaApi() {
  console.log('🚀 Testing OTP via API Endpoints...\n');

  const baseUrl = process.env.API_BASE_URL || 'http://localhost:3000';
  const testPhone = '+233594765977'; // Change this to your phone number
  const testVoterName = 'Test User';

  console.log(`🌐 API Base URL: ${baseUrl}`);
  console.log(`📱 Test Phone: ${testPhone}`);
  console.log(`👤 Test Voter: ${testVoterName}\n`);

  try {
    // Step 1: Send OTP
    console.log('1️⃣ Sending OTP via API...');
    const otpResponse = await fetch(`${baseUrl}/api/auth/send-otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone: testPhone,
        fullName: testVoterName,
      }),
    });

    if (otpResponse.ok) {
      const otpData = await otpResponse.json();
      console.log('✅ OTP sent successfully!');
      console.log(`   Response:`, otpData);
      console.log(`   📱 Check your phone for the OTP message\n`);

      // Step 2: Wait for user input
      console.log(
        '⏳ Please check your phone and enter the OTP you received...'
      );
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const enteredOtp = await new Promise<string>((resolve) => {
        rl.question('🔐 Enter the OTP: ', resolve);
      });

      rl.close();

      // Step 3: Verify OTP
      console.log('\n2️⃣ Verifying OTP via API...');
      const verifyResponse = await fetch(
        `${baseUrl}/api/auth/verify-otp`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            phone: testPhone,
            otp: enteredOtp,
          }),
        }
      );

      if (verifyResponse.ok) {
        const verifyData = await verifyResponse.json();
        console.log('✅ OTP verification successful!');
        console.log(`   Response:`, verifyData);
        console.log(
          '   🎉 Your API OTP integration is working perfectly!'
        );
      } else {
        const errorData = await verifyResponse.json();
        console.log('❌ OTP verification failed!');
        console.log(`   Error:`, errorData);
      }
    } else {
      const errorData = await otpResponse.json();
      console.log('❌ OTP sending failed!');
      console.log(`   Error:`, errorData);
    }
  } catch (error) {
    console.log('❌ Test failed with error:', error);
  }

  console.log('\n🏁 API OTP testing completed!');
}

// Run the test
testOtpViaApi().catch(console.error);

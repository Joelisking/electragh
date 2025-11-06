#!/usr/bin/env node

/**
 * Arkesel Setup Script
 *
 * This script helps you set up Arkesel OTP integration by:
 * 1. Creating a .env file with Arkesel configuration
 * 2. Testing the Arkesel API connection
 * 3. Providing instructions for getting API credentials
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function setupArkesel() {
  console.log('🚀 Arkesel OTP Setup Script');
  console.log('============================\n');

  console.log(
    'This script will help you configure Arkesel OTP integration.\n'
  );

  // Check if .env file exists
  const envPath = path.join(__dirname, '.env');
  const envExists = fs.existsSync(envPath);

  if (envExists) {
    console.log('📄 Found existing .env file');
    const overwrite = await askQuestion(
      'Do you want to update it with Arkesel configuration? (y/n): '
    );
    if (overwrite.toLowerCase() !== 'y') {
      console.log('❌ Setup cancelled');
      rl.close();
      return;
    }
  }

  console.log('\n📋 Arkesel Setup Instructions:');
  console.log('1. Visit https://arkesel.com and create an account');
  console.log('2. Go to your dashboard and generate an API key');
  console.log(
    '3. Contact Arkesel support to get your sender ID approved'
  );
  console.log(
    '4. For testing, you can use sandbox mode (no SMS credits consumed)\n'
  );

  const apiKey = await askQuestion('Enter your Arkesel API key: ');
  if (!apiKey.trim()) {
    console.log('❌ API key is required');
    rl.close();
    return;
  }

  const senderId =
    (await askQuestion(
      'Enter your sender ID (default: ELECTION): '
    )) || 'ELECTION';
  const sandbox = await askQuestion(
    'Use sandbox mode for testing? (y/n, default: y): '
  );
  const useSandbox = sandbox.toLowerCase() !== 'n';

  // Create .env content
  const envContent = `# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/voting_db"

# JWT Configuration
JWT_SECRET="your_jwt_secret_here"
JWT_REFRESH_SECRET="your_jwt_refresh_secret_here"

# SMS Provider Configuration
SMS_PROVIDER=arkesel

# Arkesel Configuration (for SMS and OTP)
ARKESEL_API_KEY=${apiKey.trim()}
ARKESEL_SENDER_ID=${senderId.trim()}
ARKESEL_SANDBOX=${useSandbox}

# AWS S3 Configuration (for image storage)
AWS_ACCESS_KEY_ID=your_aws_access_key_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key_here
AWS_REGION=us-east-1
AWS_S3_BUCKET=your_s3_bucket_name_here

# Redis Configuration (for rate limiting and caching)
REDIS_URL="redis://localhost:6379"

# Server Configuration
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000  # 15 minutes
RATE_LIMIT_MAX_REQUESTS=100
OTP_RATE_LIMIT_WINDOW_MS=300000  # 5 minutes
OTP_RATE_LIMIT_MAX_REQUESTS=3
VOTING_RATE_LIMIT_WINDOW_MS=300000  # 5 minutes
VOTING_RATE_LIMIT_MAX_REQUESTS=1
`;

  try {
    fs.writeFileSync(envPath, envContent);
    console.log('\n✅ .env file created successfully!');

    console.log('\n🧪 Testing Arkesel API connection...');

    // Test the API connection
    const testResult = await testArkeselConnection(apiKey.trim());

    if (testResult.success) {
      console.log('✅ Arkesel API connection successful!');
      console.log(
        '\n🎉 Setup complete! You can now use Arkesel OTP integration.'
      );
      console.log('\n📝 Next steps:');
      console.log(
        '1. Run: npm run test:arkesel (to test OTP sending)'
      );
      console.log('2. Start your server: npm run dev');
      console.log('3. Test OTP endpoints in your application');
    } else {
      console.log('❌ Arkesel API connection failed:');
      console.log(`   Error: ${testResult.error}`);
      console.log('\n🔧 Troubleshooting:');
      console.log('1. Verify your API key is correct');
      console.log('2. Check your internet connection');
      console.log('3. Ensure your Arkesel account is active');
    }
  } catch (error) {
    console.log('❌ Error creating .env file:', error.message);
  }

  rl.close();
}

async function testArkeselConnection(apiKey) {
  try {
    const response = await fetch(
      'https://sms.arkesel.com/api/otp/generate',
      {
        method: 'POST',
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          number: '233200000000', // Test number
          sender_id: 'TEST',
          message: 'Test message: %otp_code%',
          type: 'numeric',
          length: 6,
          expiry: 5,
          medium: 'sms',
        }),
      }
    );

    const data = await response.json();

    if (
      response.ok &&
      (data.code === '1000' ||
        data.status === 'success' ||
        data.success === true)
    ) {
      return { success: true };
    } else {
      return {
        success: false,
        error:
          data.message || data.error || `HTTP ${response.status}`,
      };
    }
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

// Run the setup
setupArkesel().catch(console.error);

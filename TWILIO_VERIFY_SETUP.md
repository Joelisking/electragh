# Twilio Verify Setup Guide

## Overview

This guide explains how to set up Twilio Verify for the Ghana Election Platform. Twilio Verify is a specialized service for handling OTP (One-Time Password) verification that provides better security, fraud protection, and compliance compared to manual OTP generation.

## Why Twilio Verify?

### **Advantages over Manual OTP:**
- **Built-in Fraud Protection** - Automatic detection and blocking of fraudulent verification attempts
- **Rate Limiting** - Configurable limits to prevent abuse and excessive costs
- **Multiple Channels** - SMS, Voice, WhatsApp, Email support
- **Global Delivery** - Optimized routing for international destinations
- **Security Compliance** - Meets industry standards for verification workflows
- **Automatic Retry Logic** - Smart fallback between channels
- **Analytics & Monitoring** - Detailed delivery and conversion metrics

### **vs. Regular SMS:**
- **No Phone Number Management** - No need to purchase or manage phone numbers
- **Better Delivery Rates** - Twilio's global network optimizes delivery
- **Automatic OTP Generation** - Secure, random code generation
- **Code Validation** - Server-side verification prevents tampering
- **Cost Optimization** - Only pay for successful verifications

## Setup Instructions

### Step 1: Create a Verify Service

1. **Login to Twilio Console**
   - Go to [console.twilio.com](https://console.twilio.com)
   - Navigate to **Verify** > **Services**

2. **Create New Service**
   - Click **Create new Service**
   - Enter service details:
     - **Service Name**: "Ghana Election Verify"
     - **Use Case**: "User Registration/Authentication"

### Step 2: Configure Service Settings

#### **Basic Settings**
- **Friendly Name**: Ghana Election
- **Code Length**: 6 digits (recommended for security)
- **Default Country Code**: +233 (Ghana)

#### **Security Settings**
- **Code Expiry**: 5 minutes (balance between security and usability)
- **Max Attempts**: 3 verification attempts per phone number
- **Rate Limiting**: Enable to prevent abuse

#### **Channel Configuration**
1. **SMS** (Primary)
   - Enable SMS verification
   - Default channel for most users

2. **Voice** (Fallback)
   - Enable voice verification as backup
   - Useful for areas with poor SMS delivery

3. **Advanced Options** (Optional)
   - WhatsApp verification for international users
   - Email verification for additional security

### Step 3: Configure Rate Limits

1. **Go to Rate Limits**
   - In your Verify Service, click **Rate Limits**
   - Create custom limits for your use case

2. **Recommended Settings**
   ```
   Max Attempts per Phone Number: 3 per 5 minutes
   Max Send Attempts: 3 per hour per phone number
   Max Check Attempts: 5 per 5 minutes per phone number
   ```

### Step 4: Get Your Service SID

1. **Copy Service SID**
   - In your Verify Service overview
   - Copy the **Service SID** (starts with `VA`)
   - Format: `VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

2. **Add to Environment**
   ```bash
   TWILIO_VERIFY_SERVICE_SID=VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

## Environment Configuration

### Required Variables

```bash
# Twilio Account Credentials
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here

# Verify Service
TWILIO_VERIFY_SERVICE_SID=VAxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

### Optional Configuration

```bash
# Custom code length (if different from service default)
TWILIO_VERIFY_CODE_LENGTH=6

# Custom expiry time in seconds (if different from service default)
TWILIO_VERIFY_CODE_EXPIRY=300
```

## Testing Your Setup

### 1. Test Configuration

```bash
# Test Twilio Verify integration
npm run test:twilio
```

### 2. Manual Testing

Create a simple test script:

```javascript
const twilio = require('twilio');

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Send verification
async function sendVerification(phoneNumber) {
  try {
    const verification = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verifications
      .create({
        to: phoneNumber,
        channel: 'sms'
      });

    console.log('Verification sent:', verification.status);
    return verification.sid;
  } catch (error) {
    console.error('Error sending verification:', error);
  }
}

// Check verification
async function checkVerification(phoneNumber, code) {
  try {
    const verificationCheck = await client.verify.v2
      .services(process.env.TWILIO_VERIFY_SERVICE_SID)
      .verificationChecks
      .create({
        to: phoneNumber,
        code: code
      });

    console.log('Verification status:', verificationCheck.status);
    return verificationCheck.status === 'approved';
  } catch (error) {
    console.error('Error checking verification:', error);
    return false;
  }
}
```

## Best Practices

### 1. Security Configuration

- **Rate Limiting**: Always enable rate limiting to prevent abuse
- **Code Length**: Use 6-digit codes for good security/usability balance
- **Expiry Time**: 5 minutes is recommended
- **Max Attempts**: Limit to 3-5 attempts per phone number

### 2. User Experience

- **Clear Instructions**: Tell users to check spam/junk folders
- **Retry Options**: Provide voice verification as fallback
- **International Format**: Always use E.164 format (+country_code)
- **Error Handling**: Provide clear error messages

### 3. Cost Optimization

- **Rate Limiting**: Prevents excessive usage
- **Channel Preference**: SMS is usually most cost-effective
- **Geographic Optimization**: Consider local regulations and costs

### 4. Monitoring & Analytics

- **Delivery Rates**: Monitor in Twilio Console
- **Conversion Rates**: Track successful verifications
- **Error Patterns**: Watch for common failure reasons
- **Cost Tracking**: Monitor usage and costs

## Troubleshooting

### Common Issues

1. **Invalid Service SID**
   ```
   Error: Service not found
   ```
   - Verify SID format starts with `VA`
   - Check SID is copied correctly
   - Ensure service is active

2. **Rate Limit Exceeded**
   ```
   Error: Too many requests
   ```
   - Check rate limit configuration
   - Implement client-side rate limiting
   - Monitor usage patterns

3. **Invalid Phone Number**
   ```
   Error: Invalid phone number
   ```
   - Ensure E.164 format (+country_code)
   - Validate phone numbers client-side
   - Check country code restrictions

4. **Delivery Failures**
   ```
   Error: Message not delivered
   ```
   - Check destination country restrictions
   - Try voice verification as fallback
   - Verify phone number is active

### Debugging Steps

1. **Check Service Configuration**
   - Verify service is active
   - Check rate limits aren't too restrictive
   - Ensure channels are enabled

2. **Test with Known Numbers**
   - Use your own phone number for testing
   - Try both local and international numbers
   - Test different channels (SMS, Voice)

3. **Monitor Logs**
   - Check Twilio Console logs
   - Monitor application logs
   - Track verification attempts and success rates

## Advanced Features

### 1. Custom Templates

You can customize the verification message:

```bash
# In Twilio Console > Verify > Services > Templates
# Customize SMS template:
"Your Ghana Election verification code is {{code}}. Valid for 5 minutes."
```

### 2. Webhook Integration

Set up webhooks for real-time verification events:

```bash
# Webhook URL in Verify Service settings
https://your-api.com/webhook/verify-status
```

### 3. Analytics Integration

Track verification metrics:

```javascript
// Custom analytics after verification
await analytics.track('verification_sent', {
  phone: phoneNumber,
  channel: 'sms',
  service: 'twilio_verify'
});
```

## Support and Resources

- **Twilio Verify Docs**: [www.twilio.com/docs/verify](https://www.twilio.com/docs/verify)
- **Rate Limiting Guide**: [www.twilio.com/docs/verify/api/programmable-rate-limits](https://www.twilio.com/docs/verify/api/programmable-rate-limits)
- **Best Practices**: [www.twilio.com/docs/verify/preventing-toll-fraud](https://www.twilio.com/docs/verify/preventing-toll-fraud)
- **Console**: [console.twilio.com/verify](https://console.twilio.com/verify)

For integration support with the Ghana Election Platform, contact the development team.
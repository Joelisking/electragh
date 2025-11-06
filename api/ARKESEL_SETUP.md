# Arkesel SMS Integration Setup

This guide explains how to set up and use Arkesel as your SMS provider for the voting API system.

## Overview

Arkesel is a Ghana-based SMS service provider that offers:

- SMS delivery to all Ghanaian mobile networks
- OTP (One-Time Password) services
- Sandbox environment for testing without costs
- USSD-based OTP retrieval as an alternative
- Competitive pricing and reliable delivery

## Prerequisites

1. An Arkesel account at [https://arkesel.com](https://arkesel.com)
2. API key from your Arkesel dashboard
3. Approved sender ID (e.g., "ELECTION")

## Setup Instructions

### 1. Create Arkesel Account

1. Visit [https://arkesel.com](https://arkesel.com) and sign up
2. Complete the account verification process
3. You'll receive 10 free SMS credits for testing

### 2. Generate API Key

1. Log in to your Arkesel dashboard
2. Navigate to the SMS API section
3. Create a new API key
4. Copy the API key for use in your application

### 3. Configure Environment Variables

Add the following variables to your `.env` file:

```env
# SMS Provider Configuration
SMS_PROVIDER=arkesel

# Arkesel Configuration
ARKESEL_API_KEY=your_api_key_here
ARKESEL_SENDER_ID=ELECTION
ARKESEL_SANDBOX=true  # Set to false for production
```

### 4. Sender ID Approval

- Contact Arkesel support to get your sender ID approved
- Common approved sender IDs: "ELECTION", "VOTE", "EC"
- This process may take 1-2 business days

## Testing with Sandbox

Arkesel provides a sandbox environment for testing without incurring costs:

### Enable Sandbox Mode

```env
ARKESEL_SANDBOX=true
```

### Run Test Script

```bash
npm run test:arkesel
```

This will test:

- OTP SMS sending
- Vote confirmation SMS
- Election reminder SMS
- Different phone number formats

### Sandbox Behavior

- Messages are not delivered to actual phones
- API responses simulate successful delivery
- No SMS credits are consumed
- Perfect for development and testing

## Production Setup

### 1. Disable Sandbox Mode

```env
ARKESEL_SANDBOX=false
```

### 2. Use Production API Key

- Generate a production API key from your dashboard
- Update `ARKESEL_API_KEY` with the production key

### 3. Monitor Usage

- Check your Arkesel dashboard for delivery reports
- Monitor SMS credit usage
- Set up alerts for low credit balance

## API Integration Details

### SMS Service Implementation

The system includes a complete Arkesel SMS provider implementation:

```typescript
// Arkesel SMS Provider
class ArkeselSmsProvider implements SmsProvider {
  private apiKey: string;
  private senderId: string;
  private sandbox: boolean;

  async sendSms(
    to: string,
    message: string,
    type: string
  ): Promise<SmsResult>;
}
```

### Supported Features

1. **OTP SMS**: Send verification codes to voters
2. **Vote Confirmation**: Confirm successful vote casting
3. **Election Reminders**: Send voting reminders
4. **Phone Number Formatting**: Automatic Ghana number formatting
5. **Error Handling**: Comprehensive error handling and logging

### Phone Number Formatting

The system automatically formats phone numbers for Ghana:

- Input: `0241234567`, `+233241234567`, `233241234567`
- Output: `233241234567` (standard international format)

## Usage Examples

### Send OTP

```typescript
import { sendOtpSms } from './services/smsService';

const result = await sendOtpSms(
  '+233241234567',
  '123456',
  'John Doe'
);
```

### Send Vote Confirmation

```typescript
import { sendVoteConfirmationSms } from './services/smsService';

const result = await sendVoteConfirmationSms(
  '+233241234567',
  'John Doe'
);
```

### Send Election Reminder

```typescript
import { sendElectionReminderSms } from './services/smsService';

const result = await sendElectionReminderSms(
  '+233241234567',
  'John Doe',
  'OPEN'
);
```

## Error Handling

The system includes comprehensive error handling:

```typescript
interface SmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
}
```

Common error scenarios:

- Invalid API key
- Insufficient SMS credits
- Invalid phone number format
- Network connectivity issues
- Rate limiting

## Monitoring and Logging

### Logs

All SMS operations are logged with:

- Phone number (masked for privacy)
- Message type
- Success/failure status
- Message ID
- Error details (if any)

### Dashboard Monitoring

Monitor your SMS delivery through:

- Arkesel dashboard delivery reports
- Application logs
- Database audit trails

## Migration from Hubtel

To migrate from Hubtel to Arkesel:

1. **Update Environment Variables**:

   ```env
   SMS_PROVIDER=arkesel
   # Remove Hubtel variables
   # Add Arkesel variables
   ```

2. **Test Thoroughly**:

   ```bash
   npm run test:arkesel
   ```

3. **Update Documentation**:
   - Update any hardcoded references
   - Update API documentation
   - Update deployment scripts

## Troubleshooting

### Common Issues

1. **"API key not configured"**

   - Check `ARKESEL_API_KEY` in `.env`
   - Ensure no extra spaces or quotes

2. **"Invalid sender ID"**

   - Contact Arkesel to approve your sender ID
   - Use a generic sender ID like "SMS" for testing

3. **"Insufficient credits"**

   - Top up your Arkesel account
   - Check credit balance in dashboard

4. **Messages not delivered**
   - Verify phone number format
   - Check if recipient's network is supported
   - Review delivery reports in dashboard

### Support

- Arkesel Support: [https://arkesel.com/support](https://arkesel.com/support)
- API Documentation: [https://developers.arkesel.com](https://developers.arkesel.com)
- GitHub Issues: Create an issue in the project repository

## Cost Optimization

### Tips to Reduce Costs

1. **Use Sandbox for Development**: Always test with sandbox mode
2. **Batch Messages**: Send multiple messages in one request when possible
3. **Message Length**: Keep messages concise to reduce costs
4. **Targeted Messaging**: Only send to verified phone numbers
5. **Monitor Usage**: Set up alerts for unusual usage patterns

### Pricing

- Check current pricing at [https://arkesel.com/pricing](https://arkesel.com/pricing)
- SMS credits are consumed per message sent
- Different rates for different networks
- Bulk discounts available for high volume

## Security Considerations

1. **API Key Security**:

   - Store API keys in environment variables
   - Never commit API keys to version control
   - Rotate API keys regularly

2. **Phone Number Privacy**:

   - Log phone numbers in masked format
   - Implement data retention policies
   - Comply with privacy regulations

3. **Rate Limiting**:
   - Implement rate limiting for SMS endpoints
   - Monitor for abuse patterns
   - Set up alerts for unusual activity

## Next Steps

1. Set up your Arkesel account
2. Configure environment variables
3. Run the test script
4. Test with real phone numbers (in sandbox mode)
5. Deploy to production when ready

For additional help, refer to the [Arkesel API Documentation](https://developers.arkesel.com/) or contact their support team.

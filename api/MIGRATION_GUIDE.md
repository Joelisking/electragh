# Migration Guide: Hubtel to Arkesel SMS

This guide will help you migrate your SMS provider from Hubtel to Arkesel.

## Quick Migration Steps

### 1. Set up Arkesel Account

1. Visit [https://arkesel.com](https://arkesel.com) and create an account
2. Get your API key from the dashboard
3. Request sender ID approval (e.g., "ELECTION")

### 2. Update Environment Variables

Update your `.env` file:

```env
# Change SMS provider
SMS_PROVIDER=arkesel

# Add Arkesel credentials
ARKESEL_API_KEY=your_api_key_here
ARKESEL_SENDER_ID=ELECTION
ARKESEL_SANDBOX=true  # Start with sandbox for testing

# Remove or comment out Hubtel credentials
# HUBTEL_CLIENT_ID=...
# HUBTEL_CLIENT_SECRET=...
# HUBTEL_SENDER_ID=...
```

### 3. Test the Integration

Run the test script to verify everything works:

```bash
npm run test:arkesel
```

### 4. Deploy to Production

When ready for production:

```env
ARKESEL_SANDBOX=false
```

## What's Changed

### New Features

- ✅ Arkesel SMS provider implementation
- ✅ Sandbox mode for testing without costs
- ✅ Vote confirmation SMS after successful voting
- ✅ Comprehensive error handling
- ✅ Phone number formatting for Ghana
- ✅ Test script for validation

### Backward Compatibility

- ✅ Existing Hubtel integration remains functional
- ✅ Same SMS service interface
- ✅ No changes to API endpoints
- ✅ No database schema changes

## Testing with Sandbox

Arkesel provides a sandbox environment that:

- ✅ Simulates SMS delivery without sending real messages
- ✅ Doesn't consume SMS credits
- ✅ Perfect for development and testing
- ✅ Returns realistic API responses

## Cost Benefits

- **Lower costs**: Arkesel typically offers better rates
- **Free testing**: Sandbox mode for development
- **Better delivery**: Optimized for Ghana networks
- **Transparent pricing**: Clear cost structure

## Support and Documentation

- **Arkesel Documentation**: [https://developers.arkesel.com](https://developers.arkesel.com)
- **Setup Guide**: See `ARKESEL_SETUP.md`
- **Environment Config**: See `ENVIRONMENT_CONFIG.md`
- **Test Script**: `scripts/test-arkesel-sms.ts`

## Rollback Plan

If you need to rollback to Hubtel:

1. Update environment variables:

   ```env
   SMS_PROVIDER=hubtel
   HUBTEL_CLIENT_ID=your_client_id
   HUBTEL_CLIENT_SECRET=your_client_secret
   HUBTEL_SENDER_ID=ELECTION
   ```

2. Restart the application

3. Test with existing Hubtel test script:
   ```bash
   npm run test:sms
   ```

## Need Help?

- Check the comprehensive setup guide in `ARKESEL_SETUP.md`
- Review environment configuration in `ENVIRONMENT_CONFIG.md`
- Run the test script to verify your setup
- Contact Arkesel support for API-related issues

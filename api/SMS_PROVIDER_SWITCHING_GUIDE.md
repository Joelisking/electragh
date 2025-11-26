# SMS Provider Switching Guide

## Current Configuration

### Provider Routing
- **African Countries** (Ghana +233, Kenya +254, Tanzania +255, Nigeria +234, South Africa +27)
  - **Primary:** Arkesel SMS API
  - **Fallback:** None

- **US & Canada** (+1)
  - **Primary:** WhatsApp Business API (Facebook Graph API v21.0)
  - **Fallback:** Twilio Messaging Service
  - **Reason:** Twilio A2P campaign is under review

- **Other International** (UK, Europe, Asia, etc.)
  - **Primary:** Twilio Messaging Service
  - **Fallback:** None

---

## How to Switch US/Canada to Twilio

When your Twilio A2P campaign is approved, follow these steps:

### Step 1: Update Code (2 changes required)

#### File: `/api/src/services/smsService.ts`

**Change 1 - Update `getCountryFromPhone()` method (around line 867)**
```typescript
// BEFORE (WhatsApp primary):
if (cleaned.startsWith('1')) {
  return 'WHATSAPP'; // CHANGE TO 'TWILIO' when A2P campaign is approved
}

// AFTER (Twilio primary):
if (cleaned.startsWith('1')) {
  return 'TWILIO'; // A2P campaign approved
}
```

**Change 2 - Update `getProviderName()` method (around line 170)**
```typescript
// BEFORE (WhatsApp primary):
if (cleaned.startsWith('1')) {
  return 'whatsapp'; // CHANGE TO 'twilio' when A2P campaign is approved
}

// AFTER (Twilio primary):
if (cleaned.startsWith('1')) {
  return 'twilio'; // A2P campaign approved
}
```

### Step 2: Verify Environment Variables

Ensure these are set in your production `.env`:

```bash
# Required for Twilio
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_MESSAGING_SERVICE_SID=your_messaging_service_sid

# Optional but recommended for delivery tracking
TWILIO_WEBHOOK_URL=https://your-production-api.com
```

### Step 3: Restart API Server

```bash
# Stop the current server
# Start it again to pick up the code changes
npm run dev  # or your production start command
```

### Step 4: Test

Send a test SMS to a US/Canada number:

```bash
curl -X POST https://your-api.com/api/admin/test-sms \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"phone": "+1234567890", "message": "Test SMS from ElectraGH"}'
```

Check the logs to confirm:
- Message is sent via Twilio
- If Twilio fails, it falls back to WhatsApp
- Message appears in the admin messages page

---

## How to Switch Back to WhatsApp

If you need to revert (e.g., Twilio campaign gets suspended):

1. Reverse the two code changes in Step 1 above
2. Restart the API server
3. US/Canada will use WhatsApp primary with Twilio fallback

---

## Troubleshooting

### Twilio Webhook Errors
If you see "StatusCallback URL is not valid":
- Ensure `TWILIO_WEBHOOK_URL` is set to a publicly accessible URL
- For local development, comment out or remove the webhook URL
- Webhooks only work in production with a public domain

### Messages Not Sending
1. Check provider credentials in `.env`
2. Check API server logs for errors
3. Verify phone number format (should include country code)
4. Check admin messages page for error details

### Database Logging Issues
- Database logging is non-blocking
- If logging fails, the SMS will still send
- Check server logs for database connection issues

---

## Files Modified

1. `/api/src/services/smsService.ts` - Core SMS routing logic
2. `/api/.env` - Provider credentials and configuration
3. `/api/src/routes/webhooks.ts` - Twilio webhook endpoint
4. `/api/src/routes/admin.ts` - SMS messages API and test endpoint
5. `/api/prisma/schema.prisma` - Database schema for message tracking
6. `/web/app/admin/messages/page.tsx` - Admin messages tracking UI

---

## Support

For additional help:
- See inline code comments in `smsService.ts`
- Check `.env` file comments
- Review this guide
- Contact the development team

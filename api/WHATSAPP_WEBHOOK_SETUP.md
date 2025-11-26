# WhatsApp Webhook Setup Guide

This guide explains how to configure the WhatsApp Business API webhook to track message delivery status.

## What the Webhook Does

The WhatsApp webhook allows you to receive real-time updates about your message statuses:
- **sent**: Message sent to WhatsApp servers
- **delivered**: Message delivered to recipient's device
- **read**: Message read by recipient
- **failed**: Message failed to deliver

These status updates are automatically stored in your database and visible in the admin Messages page.

## Prerequisites

- WhatsApp Business API account configured
- Production API deployed and accessible via HTTPS
- `WHATSAPP_VERIFY_TOKEN` set in your `.env` file

## Setup Steps

### 1. Configure Your Verify Token

In your production `.env` file, set a secure verify token:

```bash
WHATSAPP_VERIFY_TOKEN=your_secure_random_string_here_12345
```

**Important**: Choose a strong, random string. This token is used by Facebook to verify your webhook endpoint.

### 2. Configure Webhook in Meta Business Suite

1. Go to [Meta Business Suite](https://business.facebook.com/)
2. Navigate to **WhatsApp** > **Configuration** > **Webhooks**
3. Click **Edit** or **Configure Webhooks**

### 3. Set Webhook URL

**Callback URL**:
```
https://your-production-api.com/api/webhooks/whatsapp
```

Replace `your-production-api.com` with your actual production domain.

**Examples**:
- Vercel: `https://electragh.vercel.app/api/webhooks/whatsapp`
- Railway: `https://your-app.railway.app/api/webhooks/whatsapp`
- Custom domain: `https://api.agosaec.com/api/webhooks/whatsapp`

### 4. Verify Webhook

**Verify Token**: Enter the same token you set in `WHATSAPP_VERIFY_TOKEN`

Click **Verify and Save**. Facebook will send a GET request to your webhook URL to verify it.

### 5. Subscribe to Webhook Fields

After verification, subscribe to the following fields:
- ✅ **messages** (required for status updates)

You can also subscribe to:
- message_template_status_update (optional)
- messaging_handovers (optional)

### 6. Test the Webhook

Send a test message using the admin test endpoint:

```bash
curl -X POST https://your-api.com/api/admin/test-sms \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"phone": "+12604468987", "message": "Test message"}'
```

Then check:
1. **API Logs**: Watch for webhook events
2. **Admin Messages Page**: Status should update from SENT → DELIVERED → READ

## Webhook Payload Structure

### Verification Request (GET)

Facebook sends this during setup:

```
GET /api/webhooks/whatsapp?hub.mode=subscribe&hub.challenge=12345&hub.verify_token=your_token
```

Your endpoint responds with the `hub.challenge` value.

### Status Update (POST)

Facebook sends this when message status changes:

```json
{
  "object": "whatsapp_business_account",
  "entry": [{
    "id": "WHATSAPP_BUSINESS_ACCOUNT_ID",
    "changes": [{
      "value": {
        "messaging_product": "whatsapp",
        "statuses": [{
          "id": "wamid.HBgLMTI2MDQ0Njg5ODcVAgARGBI...",
          "status": "delivered",
          "timestamp": "1638457835",
          "recipient_id": "12604468987"
        }]
      },
      "field": "messages"
    }]
  }]
}
```

## Status Mapping

| WhatsApp Status | Database Status | Description |
|----------------|-----------------|-------------|
| `sent` | `SENT` | Message sent to WhatsApp servers |
| `delivered` | `DELIVERED` | Message delivered to recipient's device |
| `read` | `READ` | Message read by recipient |
| `failed` | `FAILED` | Message failed to deliver |

## Troubleshooting

### Webhook Verification Fails

**Problem**: "Verify Token Mismatch" error

**Solution**:
1. Ensure `WHATSAPP_VERIFY_TOKEN` in `.env` matches exactly
2. Restart your API server after changing `.env`
3. Check server logs for verification attempts

### Not Receiving Status Updates

**Problem**: Messages show as SENT but never update to DELIVERED

**Solution**:
1. Check webhook is subscribed to `messages` field
2. Verify webhook URL is accessible (not blocked by firewall)
3. Check API logs for incoming webhook requests
4. Ensure production API is running (not just local)

### Webhook Returns Errors

**Problem**: WhatsApp shows webhook errors in dashboard

**Solution**:
1. Check API server logs for error details
2. Ensure database connection is working
3. Verify `providerMsgId` is being stored correctly when sending messages

### Testing Locally

**Problem**: Need to test webhook during development

**Solution**:
Use a tool like [ngrok](https://ngrok.com/) to expose your local server:

```bash
# Start your local API
npm run dev

# In another terminal, expose it
ngrok http 4000

# Use the ngrok URL for webhook
# Example: https://abc123.ngrok.io/api/webhooks/whatsapp
```

**Note**: Update `WHATSAPP_VERIFY_TOKEN` in your local `.env` to match what you configure in Meta Business Suite.

## Security Notes

1. **HTTPS Required**: WhatsApp webhooks only work with HTTPS URLs
2. **Verify Token**: Keep your verify token secret and use a strong random string
3. **Signature Validation**: For production, consider implementing [webhook signature validation](https://developers.facebook.com/docs/graph-api/webhooks/getting-started#verification-requests)

## Monitoring

Monitor webhook activity:

1. **API Logs**: Check server logs for webhook events
   ```bash
   # Look for these log entries
   "WhatsApp webhook received"
   "WhatsApp status update for {messageId}"
   "Updated {count} message(s) with WhatsApp ID {messageId}"
   ```

2. **Admin Messages Page**: View real-time status updates at `/admin/messages`

3. **Database**: Query the `sms_messages` table:
   ```sql
   SELECT * FROM sms_messages
   WHERE provider = 'whatsapp'
   ORDER BY updatedAt DESC
   LIMIT 10;
   ```

## Related Documentation

- [WhatsApp Cloud API Webhooks](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/components)
- [Message Status Callbacks](https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples#message-status-updates)
- [Meta Business Suite](https://business.facebook.com/)

## Support

If you encounter issues:
1. Check the troubleshooting section above
2. Review API server logs
3. Verify all configuration settings
4. Contact Meta support for WhatsApp API issues

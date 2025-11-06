# Twilio Messaging Service Setup Guide

## Overview

This guide explains how to set up a Twilio Messaging Service for the Ghana Election Platform. Using a Messaging Service instead of a single phone number provides better delivery rates, redundancy, and scalability for international SMS.

## Benefits of Messaging Service

- **Better Delivery Rates**: Automatic failover between multiple phone numbers
- **Load Balancing**: Distributes messages across your phone number pool
- **Redundancy**: If one number has issues, others continue working
- **Scalability**: Easy to add more phone numbers as your volume grows
- **Number Pool Management**: Supports long codes, short codes, and toll-free numbers
- **Sticky Sender**: Maintains consistent sender for conversation threads

## Setup Instructions

### Step 1: Create a Messaging Service

1. **Login to Twilio Console**
   - Go to [console.twilio.com](https://console.twilio.com)
   - Navigate to **Messaging** > **Services**

2. **Create New Service**
   - Click **Create Messaging Service**
   - Choose **Send messages to my users**
   - Enter a service name (e.g., "Ghana Election SMS")
   - Click **Create Messaging Service**

### Step 2: Add Phone Numbers

1. **Add Senders**
   - In your Messaging Service, go to **Senders**
   - Click **Add Senders**

2. **Add Phone Numbers**
   - Select **Phone Number** tab
   - Add your existing Twilio phone numbers
   - Or buy new numbers if needed

3. **Recommended Number Types for International SMS**
   - **US/Canada**: Long code (+1) numbers work well
   - **Toll-Free**: Better delivery in some regions
   - **Short Codes**: Premium option for high volume

### Step 3: Configure Service Settings

1. **Inbound Settings**
   - Set webhook URL if you want to handle replies
   - For election platform: Usually not needed

2. **Opt-Out Management**
   - Enable automatic opt-out handling
   - Recommended: Keep default settings

3. **Area Code Geomatch**
   - Enable if you want numbers to match recipient area codes
   - Good for US/Canada numbers

### Step 4: Get Your Messaging Service SID

1. **Copy the SID**
   - In your Messaging Service overview
   - Copy the **Messaging Service SID** (starts with `MG...`)

2. **Add to Environment**
   ```bash
   TWILIO_MESSAGING_SERVICE_SID=MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
   ```

## Phone Number Recommendations

### For Global Coverage

1. **US Long Code**: Good for most international destinations
2. **Toll-Free Numbers**: Better delivery in some countries
3. **Multiple Numbers**: Add 2-3 numbers for redundancy

### Number Purchasing Tips

1. **Geographic Distribution**
   - Buy numbers from different regions
   - Helps with delivery and compliance

2. **Number Types**
   - Mix of long codes and toll-free
   - Avoid short codes unless you need high volume

3. **Testing**
   - Test each number before adding to production
   - Verify delivery to your target countries

## Configuration Examples

### Environment Variables

```bash
# Required Twilio credentials
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=your_auth_token_here

# Messaging Service (recommended)
TWILIO_MESSAGING_SERVICE_SID=MGxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Fallback: Single phone number (comment out if using Messaging Service)
# TWILIO_FROM_NUMBER=+1234567890
```

### Testing Configuration

```bash
# Test with your actual Messaging Service SID
npm run test:twilio
```

## Best Practices

### 1. Number Pool Management

- **Start Small**: Begin with 1-2 numbers
- **Monitor Usage**: Watch delivery reports
- **Scale Up**: Add more numbers as volume increases

### 2. Delivery Optimization

- **Geographic Matching**: Use local numbers when possible
- **Message Content**: Follow SMS best practices
- **Rate Limiting**: Don't exceed Twilio's rate limits

### 3. Monitoring

- **Delivery Reports**: Monitor in Twilio Console
- **Error Handling**: Log failures in your application
- **Cost Tracking**: Monitor SMS costs and usage

### 4. Compliance

- **Local Regulations**: Follow SMS laws in target countries
- **Opt-Out Handling**: Respect unsubscribe requests
- **Content Guidelines**: Avoid promotional language for transactional messages

## Troubleshooting

### Common Issues

1. **Invalid Messaging Service SID**
   - Verify SID starts with `MG`
   - Check it's copied correctly
   - Ensure service is active

2. **No Phone Numbers in Service**
   - Add at least one phone number to the service
   - Verify numbers are active and SMS-capable

3. **Delivery Failures**
   - Check destination country restrictions
   - Verify phone number format
   - Review Twilio error logs

### Testing Steps

1. **Configuration Test**
   ```bash
   npm run test:twilio
   ```

2. **Manual Testing**
   - Send test message to your own international number
   - Verify message content and delivery time

3. **Load Testing**
   - Test with multiple recipients
   - Monitor rate limiting and delivery

## Cost Considerations

### Messaging Service Costs

- **No Additional Fee**: Messaging Services are free to use
- **Phone Number Costs**: Pay for each phone number in the service
- **Message Costs**: Same per-message pricing as direct sending

### Cost Optimization

- **Right-Size Numbers**: Don't over-provision phone numbers
- **Monitor Usage**: Remove unused numbers
- **Regional Optimization**: Use local numbers when cost-effective

## Support and Resources

- **Twilio Documentation**: [www.twilio.com/docs/messaging/services](https://www.twilio.com/docs/messaging/services)
- **Phone Number Guide**: [www.twilio.com/docs/phone-numbers](https://www.twilio.com/docs/phone-numbers)
- **SMS Best Practices**: [www.twilio.com/docs/messaging/guides/best-practices](https://www.twilio.com/docs/messaging/guides/best-practices)

For technical support with the Ghana Election Platform integration, contact the development team.
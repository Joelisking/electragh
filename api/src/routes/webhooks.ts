import { Router } from 'express';
import { prisma } from '../server';
import { logger } from '../utils/logger';
import { SmsStatus } from '@prisma/client';

const router = Router();

// Twilio webhook for SMS status updates
// https://www.twilio.com/docs/sms/tutorials/how-to-confirm-delivery-node-js
router.post('/twilio/status', async (req, res) => {
  try {
    const {
      MessageSid,
      MessageStatus,
      To,
      From,
      ErrorCode,
      ErrorMessage,
      Price,
      PriceUnit,
      NumSegments,
    } = req.body;

    logger.info(`Twilio webhook received for ${MessageSid}:`, {
      status: MessageStatus,
      to: To,
      errorCode: ErrorCode,
      errorMessage: ErrorMessage,
    });

    // Map Twilio status to our SmsStatus enum
    const statusMap: Record<string, SmsStatus> = {
      'queued': 'QUEUED',
      'sending': 'SENDING',
      'sent': 'SENT',
      'delivered': 'DELIVERED',
      'undelivered': 'UNDELIVERED',
      'failed': 'FAILED',
      'rejected': 'REJECTED',
    };

    const mappedStatus = statusMap[MessageStatus] || 'PENDING';

    // Update the message in the database
    const updateData: any = {
      status: mappedStatus,
      webhookData: req.body, // Store full webhook payload for debugging
      updatedAt: new Date(),
    };

    // Update timestamps based on status
    if (mappedStatus === 'SENT' && !updateData.sentAt) {
      updateData.sentAt = new Date();
    }
    if (mappedStatus === 'DELIVERED') {
      updateData.deliveredAt = new Date();
    }
    if (mappedStatus === 'FAILED' || mappedStatus === 'UNDELIVERED' || mappedStatus === 'REJECTED') {
      updateData.failedAt = new Date();
      updateData.error = ErrorMessage;
      updateData.errorCode = ErrorCode;
    }

    // Update pricing information if available
    if (Price) {
      updateData.priceAmount = parseFloat(Price);
    }
    if (PriceUnit) {
      updateData.priceUnit = PriceUnit;
    }
    if (NumSegments) {
      updateData.numSegments = parseInt(NumSegments, 10);
    }
    if (From) {
      updateData.from = From;
    }

    // Find and update the message
    const message = await prisma.smsMessage.updateMany({
      where: { providerMsgId: MessageSid },
      data: updateData,
    });

    if (message.count === 0) {
      logger.warn(`No message found with providerMsgId: ${MessageSid}`);
    } else {
      logger.info(`Updated ${message.count} message(s) with SID ${MessageSid} to status ${mappedStatus}`);
    }

    // Twilio requires a 200 OK response
    res.status(200).send('OK');
  } catch (error) {
    logger.error('Error processing Twilio webhook:', error);
    // Still return 200 to Twilio to prevent retries
    res.status(200).send('OK');
  }
});

// WhatsApp Business API webhook for message status updates
// https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/components
router.get('/whatsapp', async (req, res) => {
  try {
    // WhatsApp webhook verification (one-time setup)
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    // Verify the webhook - check if a token and mode were sent
    if (mode && token) {
      // Check the mode and token sent are correct
      if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
        // Respond with 200 OK and challenge token from the request
        logger.info('WhatsApp webhook verified successfully');
        res.status(200).send(challenge);
      } else {
        // Responds with '403 Forbidden' if verify tokens do not match
        logger.warn('WhatsApp webhook verification failed - invalid token');
        res.sendStatus(403);
      }
    } else {
      logger.warn('WhatsApp webhook verification failed - missing parameters');
      res.sendStatus(400);
    }
  } catch (error) {
    logger.error('Error processing WhatsApp webhook verification:', error);
    res.sendStatus(500);
  }
});

router.post('/whatsapp', async (req, res) => {
  try {
    const body = req.body;

    logger.info('WhatsApp webhook received:', JSON.stringify(body, null, 2));

    // Check if this is a status update
    if (body.object === 'whatsapp_business_account') {
      if (body.entry && body.entry.length > 0) {
        for (const entry of body.entry) {
          if (entry.changes && entry.changes.length > 0) {
            for (const change of entry.changes) {
              if (change.field === 'messages') {
                const value = change.value;

                // Process status updates
                if (value.statuses && value.statuses.length > 0) {
                  for (const status of value.statuses) {
                    await processWhatsAppStatus(status);
                  }
                }

                // Process message events (received, read, etc.)
                if (value.messages && value.messages.length > 0) {
                  logger.info(`Received ${value.messages.length} WhatsApp message(s)`);
                }
              }
            }
          }
        }
      }
    }

    // WhatsApp requires a 200 OK response
    res.status(200).send('OK');
  } catch (error) {
    logger.error('Error processing WhatsApp webhook:', error);
    // Still return 200 to WhatsApp to prevent retries
    res.status(200).send('OK');
  }
});

async function processWhatsAppStatus(status: any) {
  try {
    const {
      id: messageId,
      status: whatsappStatus,
      timestamp,
      recipient_id,
      errors,
      pricing,
    } = status;

    logger.info(`WhatsApp status update for ${messageId}:`, {
      status: whatsappStatus,
      recipient: recipient_id,
      errors: errors,
    });

    // Map WhatsApp status to our SmsStatus enum
    // WhatsApp statuses: sent, delivered, read, failed
    const statusMap: Record<string, SmsStatus> = {
      'sent': 'SENT',
      'delivered': 'DELIVERED',
      'read': 'READ',
      'failed': 'FAILED',
    };

    const mappedStatus = statusMap[whatsappStatus] || 'PENDING';

    // Update the message in the database
    const updateData: any = {
      status: mappedStatus,
      webhookData: status, // Store full webhook payload for debugging
      updatedAt: new Date(),
    };

    // Update timestamps based on status
    if (mappedStatus === 'SENT' && timestamp) {
      updateData.sentAt = new Date(parseInt(timestamp) * 1000);
    }
    if (mappedStatus === 'DELIVERED' && timestamp) {
      updateData.deliveredAt = new Date(parseInt(timestamp) * 1000);
    }
    if (mappedStatus === 'FAILED' && timestamp) {
      updateData.failedAt = new Date(parseInt(timestamp) * 1000);
    }

    // Handle errors
    if (errors && errors.length > 0) {
      const error = errors[0];
      updateData.error = error.message || error.title;
      updateData.errorCode = error.code?.toString();
    }

    // Handle pricing information if available
    if (pricing) {
      if (pricing.billable !== undefined && pricing.pricing_model) {
        // WhatsApp pricing is conversation-based, not per-message
        // Store it if provided
        updateData.priceAmount = parseFloat(pricing.billable ? '0.005' : '0'); // Example rate
        updateData.priceUnit = pricing.currency || 'USD';
      }
    }

    // Find and update the message by WhatsApp message ID
    const message = await prisma.smsMessage.updateMany({
      where: { providerMsgId: messageId },
      data: updateData,
    });

    if (message.count === 0) {
      logger.warn(`No message found with providerMsgId: ${messageId}`);
    } else {
      logger.info(`Updated ${message.count} message(s) with WhatsApp ID ${messageId} to status ${mappedStatus}`);
    }
  } catch (error) {
    logger.error('Error processing WhatsApp status update:', error);
  }
}

export default router;

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

export default router;

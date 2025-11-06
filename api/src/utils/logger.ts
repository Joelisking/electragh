import winston from 'winston';
import fs from 'fs';
import path from 'path';

const logLevel = process.env.LOG_LEVEL || 'info';

export const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.printf(
      ({ timestamp, level, message, stack, ...meta }) => {
        let logMessage = `${timestamp} [${level.toUpperCase()}]: ${message}`;

        if (Object.keys(meta).length > 0) {
          logMessage += ` ${JSON.stringify(meta)}`;
        }

        if (stack) {
          logMessage += `\n${stack}`;
        }

        return logMessage;
      }
    )
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    }),
  ],
});

// Add file logging in production, but only if we can write to the logs directory
if (process.env.NODE_ENV === 'production') {
  const logsDir = path.join(process.cwd(), 'logs');

  try {
    // Check if logs directory exists or can be created
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    // Test if we can write to the directory
    const testFile = path.join(logsDir, '.test');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);

    // If we get here, we can write to the directory
    logger.add(
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
      })
    );

    logger.add(
      new winston.transports.File({
        filename: 'logs/combined.log',
      })
    );

    logger.info('File logging enabled');
  } catch (error) {
    // If we can't create or write to logs directory, just log to console
    logger.warn('File logging disabled - using console only');
    logger.debug('File logging error:', error);
  }
}

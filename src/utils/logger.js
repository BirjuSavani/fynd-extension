const winston = require('winston');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
require('winston-daily-rotate-file');

dayjs.extend(utc);
dayjs.extend(timezone);

// Base logs directory
const baseLogsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(baseLogsDir)) {
  fs.mkdirSync(baseLogsDir);
}

// Create date-wise subfolder (e.g., logs/2025-04-15)
const today = dayjs().tz('Asia/Kolkata').format('YYYY-MM-DD');
const datedLogDir = path.join(baseLogsDir, today);
if (!fs.existsSync(datedLogDir)) {
  fs.mkdirSync(datedLogDir, { recursive: true });
}

// Daily rotate file transports
const errorFileTransport = new winston.transports.DailyRotateFile({
  filename: path.join(datedLogDir, 'error-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  level: 'error',
  format: winston.format.combine(
    winston.format.timestamp({
      format: () => dayjs().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss'),
    }),
    winston.format.json()
  ),
});

const combinedFileTransport = new winston.transports.DailyRotateFile({
  filename: path.join(datedLogDir, 'combined-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  format: winston.format.combine(
    winston.format.timestamp({
      format: () => dayjs().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss'),
    }),
    winston.format.json()
  ),
});

const accessFileTransport = new winston.transports.DailyRotateFile({
  filename: path.join(datedLogDir, 'access-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  level: 'http',
  format: winston.format.combine(
    winston.format.timestamp({
      format: () => dayjs().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss'),
    }),
    winston.format.json()
  ),
});

// Console log formatting
const colorizer = winston.format.colorize();
const consoleFormat = winston.format.combine(
  winston.format.timestamp({
    format: () => dayjs().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss'),
  }),
  winston.format.printf(
    ({
      level,
      message,
      timestamp,
      requestId,
      method,
      path,
      statusCode,
      responseTime,
      ip,
      user,
    }) => {
      let logMessage = `${timestamp} [${level}]`;

      if (requestId) logMessage += ` [${requestId}]`;
      if (method && path) logMessage += ` ${method} ${path}`;
      if (statusCode) logMessage += ` ${statusCode}`;
      if (responseTime) logMessage += ` ${responseTime}ms`;
      if (ip) logMessage += ` IP: ${ip}`;
      if (user) logMessage += ` User: ${user}`;

      logMessage += ` - ${message}`;

      return colorizer.colorize(level, logMessage);
    }
  )
);

// Create logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  defaultMeta: { service: 'fdk-extension' },
  transports: [
    errorFileTransport,
    combinedFileTransport,
    accessFileTransport,
    new winston.transports.Console({ format: consoleFormat }),
  ],
  exitOnError: false,
});

// Exception handling
const exceptionFileTransport = new winston.transports.DailyRotateFile({
  filename: path.join(datedLogDir, 'exceptions-%DATE%.log'),
  datePattern: 'YYYY-MM-DD',
  zippedArchive: true,
  maxSize: '20m',
  maxFiles: '14d',
  format: winston.format.combine(
    winston.format.timestamp({
      format: () => dayjs().tz('Asia/Kolkata').format('YYYY-MM-DD HH:mm:ss'),
    }),
    winston.format.json()
  ),
});

logger.exceptions.handle(exceptionFileTransport);

process.on('unhandledRejection', err => {
  logger.error('Unhandled rejection', err);
});

// Request logger middleware
const requestLogger = (req, res, next) => {
  const requestId = uuidv4();
  req.requestId = requestId;
  req.startTime = Date.now();

  logger.http({
    requestId,
    method: req.method,
    path: req.originalUrl,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('User-Agent'),
    message: `Incoming request: ${req.method} ${req.originalUrl}`,
  });

  const originalEnd = res.end;
  res.end = function () {
    const responseTime = Date.now() - req.startTime;
    const logLevel = res.statusCode >= 400 ? 'warn' : 'http';

    logger[logLevel]({
      requestId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      responseTime: `${responseTime}ms`,
      message: `${req.method} ${req.originalUrl} ${res.statusCode} ${responseTime}ms`,
    });

    originalEnd.apply(res, arguments);
  };

  next();
};

module.exports = {
  logger,
  requestLogger,
};

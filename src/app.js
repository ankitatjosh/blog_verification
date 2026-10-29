require('dotenv').config();
const express = require('express');
const rateLimit = require('express-rate-limit');
const blogVerificationRoutes = require('./routes/blogVerification.routes');
const { AppError } = require('./utils/errors');
const { ERROR_CODES } = require('./constants/errorCodes');

const app = express();

// Security: Disable X-Powered-By
app.disable('x-powered-by');

// Rate limiting middleware
const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 60000;
const maxRequests = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS, 10) || 100;

const limiter = rateLimit({
  windowMs,
  max: maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      status: 'error',
      message: 'Too many requests, please try again later.',
      errors: [
        {
          code: 'RATE_LIMIT_EXCEEDED',
          field: null,
          message: `Exceeded request limit of ${maxRequests} requests per ${windowMs / 1000} seconds.`
        }
      ]
    });
  }
});

// Apply rate limiting in production or non-test environments
if (process.env.NODE_ENV !== 'test') {
  app.use(limiter);
}

// Content-Type validation for POST/PUT requests
app.use((req, res, next) => {
  if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.headers['content-length'] !== '0') {
    const contentType = req.headers['content-type'];
    if (!contentType || !contentType.includes('application/json')) {
      return res.status(415).json({
        success: false,
        status: 'error',
        message: 'Unsupported content type. Only application/json is accepted.',
        errors: [
          {
            code: ERROR_CODES.INVALID_REQUEST,
            field: 'Content-Type',
            message: 'Content-Type must be application/json.'
          }
        ]
      });
    }
  }
  next();
});

// Body parsing with configurable size limit
const maxBodySize = process.env.MAX_REQUEST_BODY_SIZE || '100kb';
app.use(express.json({ limit: maxBodySize }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount API routes
app.use('/api/v1/blogs', blogVerificationRoutes);

// Handle 404 Route Not Found
app.use((req, res) => {
  res.status(404).json({
    success: false,
    status: 'error',
    message: `Route not found: ${req.method} ${req.originalUrl}`,
    errors: [
      {
        code: 'ROUTE_NOT_FOUND',
        field: null,
        message: `The requested endpoint does not exist.`
      }
    ]
  });
});

// Centralized error-handling middleware
app.use((err, req, res, next) => {
  // Handle JSON syntax errors
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      status: 'error',
      message: 'Malformed JSON payload.',
      errors: [
        {
          code: ERROR_CODES.INVALID_REQUEST,
          field: null,
          message: 'The request body could not be parsed as valid JSON.'
        }
      ]
    });
  }

  // Handle payload too large
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      status: 'error',
      message: 'Request entity too large.',
      errors: [
        {
          code: ERROR_CODES.INVALID_REQUEST,
          field: null,
          message: `Request body exceeds maximum size limit of ${maxBodySize}.`
        }
      ]
    });
  }

  // Handle known application errors
  if (err instanceof AppError) {
    return res.status(err.statusCode || 400).json({
      success: false,
      status: 'error',
      message: err.message,
      errors: [
        {
          code: err.errorCode,
          field: err.field,
          message: err.message
        }
      ]
    });
  }

  // Unhandled internal server error (never expose stack trace or internal details)
  console.error('Unhandled Server Error:', err.message);

  return res.status(500).json({
    success: false,
    status: 'error',
    message: 'An unexpected internal error occurred.',
    errors: [
      {
        code: ERROR_CODES.INTERNAL_ERROR,
        field: null,
        message: 'An unexpected internal error occurred.'
      }
    ]
  });
});

module.exports = app;

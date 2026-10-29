const { ERROR_CODES, ERROR_MESSAGES } = require('../constants/errorCodes');

class AppError extends Error {
  constructor(errorCode, message, statusCode = 400, field = null, details = {}) {
    super(message || ERROR_MESSAGES[errorCode] || 'An error occurred.');
    this.name = 'AppError';
    this.errorCode = errorCode;
    this.statusCode = statusCode;
    this.field = field;
    this.details = details;
  }
}

class UpstreamError extends Error {
  constructor(errorCode, message, details = {}) {
    super(message || ERROR_MESSAGES[errorCode] || 'Upstream error');
    this.name = 'UpstreamError';
    this.errorCode = errorCode;
    this.details = details;
  }
}

module.exports = {
  AppError,
  UpstreamError
};

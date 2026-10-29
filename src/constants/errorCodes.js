/**
 * Standard Error Codes, Check Statuses, and Verification Statuses
 * Defined in accordance with PRD Section 7 and Section 5 (FR-10).
 */

const ERROR_CODES = {
  INVALID_REQUEST: 'INVALID_REQUEST',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_PLATFORM: 'INVALID_PLATFORM',
  INVALID_URL: 'INVALID_URL',
  UNSAFE_URL: 'UNSAFE_URL',
  ARTICLE_NOT_FOUND: 'ARTICLE_NOT_FOUND',
  ARTICLE_ACCESS_DENIED: 'ARTICLE_ACCESS_DENIED',
  AUTHOR_MISMATCH: 'AUTHOR_MISMATCH',
  PUBLICATION_DATE_MISMATCH: 'PUBLICATION_DATE_MISMATCH',
  NOT_IN_CURRENT_QUARTER: 'NOT_IN_CURRENT_QUARTER',
  TAGS_MISMATCH: 'TAGS_MISMATCH',
  TOPIC_MISMATCH: 'TOPIC_MISMATCH',
  SUMMARY_MISMATCH: 'SUMMARY_MISMATCH',
  INSUFFICIENT_CONTENT_LENGTH: 'INSUFFICIENT_CONTENT_LENGTH',
  SOURCE_METADATA_UNAVAILABLE: 'SOURCE_METADATA_UNAVAILABLE',
  SOURCE_RATE_LIMITED: 'SOURCE_RATE_LIMITED',
  SOURCE_TIMEOUT: 'SOURCE_TIMEOUT',
  SOURCE_UNAVAILABLE: 'SOURCE_UNAVAILABLE',
  SOURCE_RESPONSE_INVALID: 'SOURCE_RESPONSE_INVALID',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
};

const CHECK_STATUS = {
  PASSED: 'passed',
  FAILED: 'failed',
  UNVERIFIED: 'unverified',
  SKIPPED: 'skipped'
};

const VERIFICATION_STATUS = {
  VALID: 'valid',
  INVALID: 'invalid',
  UNVERIFIED: 'unverified'
};

const ERROR_MESSAGES = {
  [ERROR_CODES.AUTHOR_MISMATCH]: 'The submitted username does not match the blog author.',
  [ERROR_CODES.PUBLICATION_DATE_MISMATCH]: "The submitted publication date does not match the blog's publication date.",
  [ERROR_CODES.NOT_IN_CURRENT_QUARTER]: 'The blog publication date is not within the current quarter.',
  [ERROR_CODES.TAGS_MISMATCH]: "The submitted tags do not match the blog's tags.",
  [ERROR_CODES.TOPIC_MISMATCH]: "The submitted topic does not match the article's verified topic.",
  [ERROR_CODES.SUMMARY_MISMATCH]: 'The submitted summary does not match the article description.',
  [ERROR_CODES.INSUFFICIENT_CONTENT_LENGTH]: 'The blog content does not meet the minimum required length.',
  [ERROR_CODES.ARTICLE_NOT_FOUND]: 'The specified article does not exist on the platform.',
  [ERROR_CODES.ARTICLE_ACCESS_DENIED]: 'Access to the article on the source platform is restricted or denied.',
  [ERROR_CODES.SOURCE_TIMEOUT]: 'The source platform did not respond within the allowed time.',
  [ERROR_CODES.SOURCE_RATE_LIMITED]: 'The source platform rate-limited the verification request.',
  [ERROR_CODES.SOURCE_UNAVAILABLE]: 'The source platform is temporarily unavailable.',
  [ERROR_CODES.SOURCE_METADATA_UNAVAILABLE]: 'Required metadata cannot be established from the source platform.',
  [ERROR_CODES.SOURCE_RESPONSE_INVALID]: 'Source response cannot be parsed or validated.',
  [ERROR_CODES.UNSAFE_URL]: 'URL or redirect violates outbound request policy.',
  [ERROR_CODES.INVALID_URL]: 'Malformed or unsupported URL format.',
  [ERROR_CODES.INVALID_PLATFORM]: 'Unsupported platform specified.',
  [ERROR_CODES.INVALID_REQUEST]: 'Request body or structure is invalid.',
  [ERROR_CODES.MISSING_REQUIRED_FIELD]: 'A required field is missing from the request.',
  [ERROR_CODES.INTERNAL_ERROR]: 'An unexpected internal error occurred.'
};

module.exports = {
  ERROR_CODES,
  CHECK_STATUS,
  VERIFICATION_STATUS,
  ERROR_MESSAGES
};

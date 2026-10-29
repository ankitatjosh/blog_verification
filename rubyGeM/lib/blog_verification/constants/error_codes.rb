# frozen_string_literal: true

module BlogVerification
  module ErrorCodes
    # Top-level verification outcomes
    module VerificationStatus
      VALID = 'valid'
      INVALID = 'invalid'
      UNVERIFIED = 'unverified'
    end

    # Individual field check status
    module CheckStatus
      PASSED = 'passed'
      FAILED = 'failed'
      SKIPPED = 'skipped'
      UNVERIFIED = 'unverified'
    end

    # Standard error codes
    INVALID_REQUEST              = 'INVALID_REQUEST'
    MISSING_REQUIRED_FIELD       = 'MISSING_REQUIRED_FIELD'
    INVALID_PLATFORM             = 'INVALID_PLATFORM'
    INVALID_URL                  = 'INVALID_URL'
    UNSAFE_URL                   = 'UNSAFE_URL'
    ARTICLE_NOT_FOUND            = 'ARTICLE_NOT_FOUND'
    ARTICLE_ACCESS_DENIED        = 'ARTICLE_ACCESS_DENIED'
    AUTHOR_MISMATCH              = 'AUTHOR_MISMATCH'
    PUBLICATION_DATE_MISMATCH    = 'PUBLICATION_DATE_MISMATCH'
    NOT_IN_CURRENT_QUARTER       = 'NOT_IN_CURRENT_QUARTER'
    TAGS_MISMATCH                = 'TAGS_MISMATCH'
    TOPIC_MISMATCH               = 'TOPIC_MISMATCH'
    SUMMARY_MISMATCH             = 'SUMMARY_MISMATCH'
    INSUFFICIENT_CONTENT_LENGTH  = 'INSUFFICIENT_CONTENT_LENGTH'
    SOURCE_METADATA_UNAVAILABLE  = 'SOURCE_METADATA_UNAVAILABLE'
    SOURCE_RATE_LIMITED          = 'SOURCE_RATE_LIMITED'
    SOURCE_TIMEOUT               = 'SOURCE_TIMEOUT'
    SOURCE_UNAVAILABLE           = 'SOURCE_UNAVAILABLE'
    SOURCE_RESPONSE_INVALID      = 'SOURCE_RESPONSE_INVALID'
    INTERNAL_ERROR               = 'INTERNAL_ERROR'

    DEFAULT_ERROR_MESSAGES = {
      INVALID_REQUEST => 'The verification request body is malformed or invalid JSON.',
      MISSING_REQUIRED_FIELD => 'A required request field is missing.',
      INVALID_PLATFORM => 'The requested platform is not supported. Supported platforms: devto, medium.',
      INVALID_URL => 'The submitted URL is invalid, uses an unapproved host, or targets an unsupported path.',
      UNSAFE_URL => 'The submitted URL or a redirect destination targets an unapproved or private network address.',
      ARTICLE_NOT_FOUND => 'The requested article could not be found on the platform.',
      ARTICLE_ACCESS_DENIED => 'The article cannot be verified because of access restrictions or paywalls.',
      AUTHOR_MISMATCH => 'The submitted username does not match the blog author.',
      PUBLICATION_DATE_MISMATCH => "The submitted publication date does not match the blog's publication date.",
      NOT_IN_CURRENT_QUARTER => 'The blog publication date is not in the current quarter.',
      TAGS_MISMATCH => "The submitted tags do not match the blog's tags.",
      TOPIC_MISMATCH => "The submitted topic does not match the blog's topic.",
      SUMMARY_MISMATCH => "The submitted summary does not match the blog's description.",
      INSUFFICIENT_CONTENT_LENGTH => 'The blog content does not meet the minimum required word count of 500 words.',
      SOURCE_METADATA_UNAVAILABLE => 'Required metadata could not be retrieved from the source platform.',
      SOURCE_RATE_LIMITED => 'Verification is temporarily unavailable due to upstream rate limits.',
      SOURCE_TIMEOUT => 'The source platform did not respond within the allowed time.',
      SOURCE_UNAVAILABLE => 'The source platform is temporarily unavailable.',
      SOURCE_RESPONSE_INVALID => 'The response from the source platform could not be parsed.',
      INTERNAL_ERROR => 'An unexpected internal error occurred during verification.'
    }.freeze
  end
end

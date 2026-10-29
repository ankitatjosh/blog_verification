# frozen_string_literal: true

require_relative 'blog_verification/version'
require_relative 'blog_verification/configuration'
require_relative 'blog_verification/errors'
require_relative 'blog_verification/constants/error_codes'
require_relative 'blog_verification/constants/taxonomy'
require_relative 'blog_verification/utils/date_helper'
require_relative 'blog_verification/utils/normalizer'
require_relative 'blog_verification/utils/url_security'
require_relative 'blog_verification/adapters/base_adapter'
require_relative 'blog_verification/adapters/devto_adapter'
require_relative 'blog_verification/adapters/medium_adapter'
require_relative 'blog_verification/services/validation_service'
require_relative 'blog_verification/services/verification_service'

if defined?(Rails::Railtie)
  require_relative 'blog_verification/rails/railtie'
end

module BlogVerification
  class << self
    # Top-level verification method
    #
    # @example Verify DEV Community article
    #   result = BlogVerification.verify(
    #     platform: 'devto',
    #     url: 'https://dev.to/janedoe/building-a-rest-api-with-nodejs-123',
    #     username: 'janedoe',
    #     published_at: '2026-10-11',
    #     tags: ['nodejs', 'api'],
    #     topic: 'Backend Development',
    #     summary: 'A comprehensive guide to building clean REST APIs...',
    #     min_word_count: 500
    #   )
    #   if result['status'] == 'valid'
    #     puts "Article verified successfully!"
    #   end
    #
    # @param [Hash] params Input attributes
    # @return [Hash] Structured JSON-compliant result
    def verify(params)
      default_service.verify(params)
    end

    # Same as verify, but raises BlogVerification::ValidationError on invalid input
    def verify!(params)
      default_service.verify!(params)
    end

    # Shared default VerificationService instance
    def default_service
      @default_service ||= Services::VerificationService.new
    end
  end
end

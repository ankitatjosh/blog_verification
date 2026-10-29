# frozen_string_literal: true

require_relative '../constants/error_codes'
require_relative '../errors'
require_relative '../utils/url_security'
require_relative '../utils/date_helper'
require_relative '../adapters/devto_adapter'
require_relative '../adapters/medium_adapter'
require_relative 'validation_service'

module BlogVerification
  module Services
    class VerificationService
      include ErrorCodes

      attr_reader :adapters, :validation_service

      def initialize(adapters = nil, validation_service = nil)
        @adapters = adapters || {
          'devto' => Adapters::DevtoAdapter.new,
          'medium' => Adapters::MediumAdapter.new
        }
        @validation_service = validation_service || ValidationService.new
      end

      # Validates input attributes and returns { valid: boolean, errors: [...], sanitized: {...} }
      def validate_input(params)
        errors = []
        unless params.is_a?(Hash)
          return {
            valid: false,
            errors: [
              {
                'code' => INVALID_REQUEST,
                'field' => nil,
                'message' => 'Verification input must be a Hash or Object.'
              }
            ]
          }
        end

        # Normalize keys to string
        h = {}
        params.each { |k, v| h[k.to_s] = v }

        platform = h['platform']
        url = h['url']
        username = h['username']
        published_at = h['publishedAt'] || h['published_at']
        topic = h['topic']
        summary = h['summary']
        tags = h['tags']
        min_word_count = h['minWordCount'] || h['min_word_count']
        reference_date = h['referenceDate'] || h['reference_date']

        # 1. Platform validation
        if platform.nil? || platform.to_s.strip.empty?
          errors << {
            'code' => MISSING_REQUIRED_FIELD,
            'field' => 'platform',
            'message' => 'Platform is required.'
          }
        else
          plat = platform.to_s.downcase.strip
          unless %w[devto medium].include?(plat)
            errors << {
              'code' => INVALID_PLATFORM,
              'field' => 'platform',
              'message' => "Platform must be either 'medium' or 'devto'."
            }
          end
        end

        # 2. URL validation
        if url.nil? || url.to_s.strip.empty?
          errors << {
            'code' => MISSING_REQUIRED_FIELD,
            'field' => 'url',
            'message' => 'URL is required.'
          }
        end

        # 3. Username validation
        if username.nil? || username.to_s.strip.empty?
          errors << {
            'code' => MISSING_REQUIRED_FIELD,
            'field' => 'username',
            'message' => 'Username is required.'
          }
        end

        # 4. publishedAt validation
        if published_at.nil? || published_at.to_s.strip.empty?
          errors << {
            'code' => MISSING_REQUIRED_FIELD,
            'field' => 'publishedAt',
            'message' => 'publishedAt date is required.'
          }
        elsif !Utils::DateHelper.valid_calendar_date?(published_at.to_s.strip)
          errors << {
            'code' => INVALID_REQUEST,
            'field' => 'publishedAt',
            'message' => 'publishedAt must be a valid calendar date in YYYY-MM-DD format.'
          }
        end

        # 5. Topic validation
        if topic.nil? || topic.to_s.strip.empty?
          errors << {
            'code' => MISSING_REQUIRED_FIELD,
            'field' => 'topic',
            'message' => 'Topic is required.'
          }
        end

        # 6. Summary validation
        if summary.nil? || summary.to_s.strip.empty?
          errors << {
            'code' => MISSING_REQUIRED_FIELD,
            'field' => 'summary',
            'message' => 'Summary is required.'
          }
        end

        # 7. Tags validation (optional)
        if !tags.nil? && !tags.is_a?(Array)
          errors << {
            'code' => INVALID_REQUEST,
            'field' => 'tags',
            'message' => 'Tags must be an array of strings.'
          }
        end

        # 8. minWordCount validation (optional)
        if !min_word_count.nil? && (!min_word_count.is_a?(Numeric) || min_word_count < 1)
          errors << {
            'code' => INVALID_REQUEST,
            'field' => 'minWordCount',
            'message' => 'minWordCount must be a positive integer.'
          }
        end

        # 9. referenceDate validation (optional)
        if !reference_date.nil? && !Utils::DateHelper.valid_calendar_date?(reference_date.to_s.strip)
          errors << {
            'code' => INVALID_REQUEST,
            'field' => 'referenceDate',
            'message' => 'referenceDate must be a valid calendar date in YYYY-MM-DD format.'
          }
        end

        if errors.empty?
          {
            valid: true,
            sanitized: {
              'platform' => platform.to_s.downcase.strip,
              'url' => url.to_s.strip,
              'username' => username.to_s.strip,
              'publishedAt' => published_at.to_s.strip,
              'topic' => topic.to_s.strip,
              'summary' => summary.to_s.strip,
              'tags' => tags,
              'minWordCount' => min_word_count ? min_word_count.to_i : 500,
              'referenceDate' => reference_date ? reference_date.to_s.strip : nil
            }
          }
        else
          { valid: false, errors: errors }
        end
      end

      # Retrieves adapter for the requested platform
      def get_adapter(platform)
        plat = platform.to_s.downcase.strip
        adapter = @adapters[plat]
        unless adapter
          raise ValidationError.new(INVALID_PLATFORM, "Unsupported platform: '#{platform}'.", 'platform')
        end
        adapter
      end

      # Performs end-to-end verification of blog metadata
      # Returns JSON-compatible verification result
      def verify(params)
        validation = validate_input(params)
        unless validation[:valid]
          return {
            'success' => false,
            'status' => 'error',
            'errors' => validation[:errors]
          }
        end

        request_data = validation[:sanitized]
        platform = request_data['platform']
        url = request_data['url']

        adapter = get_adapter(platform)

        # Validate URL format and platform host
        begin
          Utils::UrlSecurity.validate_article_url(url, platform)
        rescue ValidationError => e
          return {
            'success' => false,
            'status' => 'error',
            'errors' => [
              {
                'code' => e.error_code,
                'field' => e.field || 'url',
                'message' => e.message
              }
            ]
          }
        rescue SSRFError => e
          return {
            'success' => false,
            'status' => 'error',
            'errors' => [
              {
                'code' => e.error_code,
                'field' => 'url',
                'message' => e.message
              }
            ]
          }
        end

        metadata = nil
        begin
          metadata = adapter.get_article_metadata(url)
        rescue UpstreamError => e
          return @validation_service.build_source_failure_response(request_data, e)
        rescue SSRFError => e
          return {
            'success' => false,
            'status' => 'error',
            'errors' => [
              {
                'code' => e.error_code,
                'field' => 'url',
                'message' => e.message
              }
            ]
          }
        rescue StandardError => e
          return {
            'success' => false,
            'status' => 'error',
            'errors' => [
              {
                'code' => INTERNAL_ERROR,
                'field' => nil,
                'message' => "Internal verification error: #{e.message}"
              }
            ]
          }
        end

        @validation_service.evaluate(request_data, metadata)
      end

      # Same as verify, but raises exceptions on input or network failures
      def verify!(params)
        result = verify(params)
        if result['status'] == 'error' && result['errors']
          first_err = result['errors'].first
          raise ValidationError.new(first_err['code'], first_err['message'], first_err['field'])
        end
        result
      end
    end
  end
end

# frozen_string_literal: true

require_relative 'constants/error_codes'

module BlogVerification
  class Error < StandardError
    attr_reader :error_code, :field, :details

    def initialize(error_code, message = nil, field = nil, details = {})
      @error_code = error_code
      @field = field
      @details = details || {}
      msg = message || ErrorCodes::DEFAULT_ERROR_MESSAGES[error_code] || 'An error occurred.'
      super(msg)
    end
  end

  class ValidationError < Error; end

  class UpstreamError < Error
    attr_reader :status_code

    def initialize(error_code, message = nil, status_code = nil, details = {})
      @status_code = status_code
      super(error_code, message, nil, details)
    end
  end

  class SSRFError < Error
    def initialize(message = 'The target host or IP is private or restricted.')
      super(ErrorCodes::UNSAFE_URL, message, 'url')
    end
  end
end

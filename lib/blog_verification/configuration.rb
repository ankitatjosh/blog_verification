# frozen_string_literal: true

module BlogVerification
  class Configuration
    attr_accessor :request_timeout, :max_redirects, :user_agent, :skip_dns_check, :require_https

    def initialize
      @request_timeout = 5.0 # seconds
      @max_redirects = 5
      @user_agent = "BlogVerificationRubyGem/#{BlogVerification::VERSION} (+https://github.com/example/blog_verification)"
      @skip_dns_check = ENV['SKIP_DNS_CHECK'] == 'true'
      @require_https = true
    end
  end

  class << self
    def configuration
      @configuration ||= Configuration.new
    end

    def configure
      yield(configuration) if block_given?
    end

    def reset_configuration!
      @configuration = Configuration.new
    end
  end
end

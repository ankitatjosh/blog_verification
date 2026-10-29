# frozen_string_literal: true

require 'uri'
require 'net/http'
require 'openssl'
require 'resolv'
require 'ipaddr'
require 'json'
require_relative '../constants/error_codes'
require_relative '../errors'

module BlogVerification
  module Utils
    module UrlSecurity
      ALLOWED_HOSTS = {
        'devto' => ['dev.to', 'www.dev.to'].freeze,
        'medium' => ['medium.com', 'www.medium.com'].freeze
      }.freeze

      PROHIBITED_IPV4_RANGES = [
        IPAddr.new('0.0.0.0/8'),
        IPAddr.new('10.0.0.0/8'),
        IPAddr.new('100.64.0.0/10'),
        IPAddr.new('127.0.0.0/8'),
        IPAddr.new('169.254.0.0/16'),
        IPAddr.new('172.16.0.0/12'),
        IPAddr.new('192.0.0.0/24'),
        IPAddr.new('192.168.0.0/16'),
        IPAddr.new('198.18.0.0/15'),
        IPAddr.new('224.0.0.0/4'),
        IPAddr.new('240.0.0.0/4'),
        IPAddr.new('255.255.255.255/32')
      ].freeze

      PROHIBITED_IPV6_RANGES = [
        IPAddr.new('::/128'),
        IPAddr.new('::1/128'),
        IPAddr.new('fc00::/7'),
        IPAddr.new('fe80::/10'),
        IPAddr.new('ff00::/8')
      ].freeze

      class HttpResponse
        attr_reader :status_code, :body, :headers, :uri

        def initialize(status_code, body, headers = {}, uri = nil)
          @status_code = status_code.to_i
          @body = body.to_s
          @headers = headers || {}
          @uri = uri
        end

        def ok?
          @status_code >= 200 && @status_code < 300
        end

        def status
          @status_code
        end

        def text
          @body
        end

        def json
          JSON.parse(@body)
        rescue JSON::ParserError => e
          raise UpstreamError.new(
            ErrorCodes::SOURCE_RESPONSE_INVALID,
            "Failed to parse upstream JSON response: #{e.message}"
          )
        end
      end

      class << self
        def ip_address_safe?(ip_string)
          return false if ip_string.nil? || ip_string.to_s.strip.empty?

          ip = IPAddr.new(ip_string.to_s.strip)
          if ip.ipv4?
            PROHIBITED_IPV4_RANGES.none? { |range| range.include?(ip) }
          elsif ip.ipv6?
            # Check IPv4-mapped IPv6 address (e.g. ::ffff:192.168.1.1)
            if ip.ipv4_mapped?
              ipv4 = ip.native
              PROHIBITED_IPV4_RANGES.none? { |range| range.include?(ipv4) }
            else
              PROHIBITED_IPV6_RANGES.none? { |range| range.include?(ip) }
            end
          else
            false
          end
        rescue IPAddr::Error
          false
        end

        def host_allowed_for_platform?(hostname, platform)
          return false if hostname.nil? || hostname.to_s.strip.empty?

          lower_host = hostname.to_s.strip.downcase
          plat = platform.to_s.downcase

          if plat == 'devto'
            return ALLOWED_HOSTS['devto'].include?(lower_host)
          end

          if plat == 'medium'
            return true if ALLOWED_HOSTS['medium'].include?(lower_host)

            if lower_host.end_with?('.medium.com')
              subdomain = lower_host[0...-'.medium.com'.length]
              return subdomain.match?(/\A[a-z0-9-]+\z/)
            end
            return false
          end

          false
        end

        def validate_article_url(url_string, platform)
          raise ValidationError.new(ErrorCodes::INVALID_URL, 'URL cannot be empty.', 'url') if url_string.nil? || url_string.to_s.strip.empty?

          begin
            parsed_uri = URI.parse(url_string.to_s.strip)
          rescue URI::InvalidURIError
            raise ValidationError.new(ErrorCodes::INVALID_URL, 'Malformed URL provided.', 'url')
          end

          unless parsed_uri.is_a?(URI::HTTP) || parsed_uri.is_a?(URI::HTTPS)
            raise ValidationError.new(ErrorCodes::INVALID_URL, 'Malformed URL provided.', 'url')
          end

          require_https = BlogVerification.configuration.require_https
          if require_https && parsed_uri.scheme != 'https'
            raise ValidationError.new(ErrorCodes::INVALID_URL, 'URL must use HTTPS protocol.', 'url')
          end

          hostname = parsed_uri.host
          unless host_allowed_for_platform?(hostname, platform)
            raise ValidationError.new(
              ErrorCodes::INVALID_URL,
              "URL host '#{hostname}' is not supported for platform '#{platform}'.",
              'url'
            )
          end

          path = (parsed_uri.path || '').gsub(%r{/+\z}, '')
          segments = path.split('/').reject(&:empty?)

          if segments.empty?
            raise ValidationError.new(
              ErrorCodes::INVALID_URL,
              'Homepage URLs are not allowed. Provide a specific article URL.',
              'url'
            )
          end

          plat = platform.to_s.downcase
          if plat == 'devto'
            reserved_dev_paths = %w[t tags top latest search listings podcasts videos enter admin about privacy terms]
            if segments.length < 2 || reserved_dev_paths.include?(segments[0].downcase)
              raise ValidationError.new(
                ErrorCodes::INVALID_URL,
                'Profile or index DEV.to URLs are not allowed. An article slug is required.',
                'url'
              )
            end
          elsif plat == 'medium'
            is_subdomain = hostname.downcase.end_with?('.medium.com') &&
                           !ALLOWED_HOSTS['medium'].include?(hostname.downcase)
            reserved_medium_paths = %w[tag topics m search plans creators about policy]

            if is_subdomain
              if segments.empty? || reserved_medium_paths.include?(segments[0].downcase)
                raise ValidationError.new(
                  ErrorCodes::INVALID_URL,
                  'Subdomain index URLs are not allowed. An article slug is required.',
                  'url'
                )
              end
            else
              if segments.length == 1 && segments[0].start_with?('@')
                raise ValidationError.new(
                  ErrorCodes::INVALID_URL,
                  'Profile URLs are not allowed. An article slug is required.',
                  'url'
                )
              end
              if segments.length < 2 || reserved_medium_paths.include?(segments[0].downcase)
                raise ValidationError.new(
                  ErrorCodes::INVALID_URL,
                  'Invalid Medium article URL format.',
                  'url'
                )
              end
            end
          end

          parsed_uri
        end

        def assert_safe_destination(hostname)
          return if BlogVerification.configuration.skip_dns_check

          # Disallow explicit IP literals or loopback hostnames
          if hostname == 'localhost' || hostname.start_with?('127.') || hostname == '::1' || hostname == '0.0.0.0'
            raise SSRFError.new('URL targets a loopback or internal address.')
          end

          begin
            addresses = Resolv.getaddresses(hostname)
          rescue StandardError => e
            raise ValidationError.new(ErrorCodes::INVALID_URL, "Unable to resolve host: #{hostname} (#{e.message})", 'url')
          end

          if addresses.empty?
            raise ValidationError.new(ErrorCodes::INVALID_URL, "No DNS records found for host: #{hostname}", 'url')
          end

          addresses.each do |addr|
            unless ip_address_safe?(addr)
              raise SSRFError.new("Resolved destination IP '#{addr}' violates outbound request security policy.")
            end
          end
        end

        # Outbound HTTP client preventing SSRF, following redirects securely, and enforcing timeouts
        def safe_fetch(url_string, options = {}, platform = nil)
          current_url = url_string.to_s
          redirect_count = 0
          max_redirects = BlogVerification.configuration.max_redirects
          timeout = BlogVerification.configuration.request_timeout

          while redirect_count <= max_redirects
            uri = URI.parse(current_url)

            if platform && !host_allowed_for_platform?(uri.host, platform)
              raise SSRFError.new("Redirect to unapproved host '#{uri.host}' is not permitted.")
            end

            assert_safe_destination(uri.host)

            http = Net::HTTP.new(uri.host, uri.port)
            http.open_timeout = timeout
            http.read_timeout = timeout

            if uri.scheme == 'https'
              http.use_ssl = true
              http.verify_mode = OpenSSL::SSL::VERIFY_PEER
            end

            req_method = options[:method] || 'GET'
            request = case req_method.to_s.upcase
                      when 'GET' then Net::HTTP::Get.new(uri.request_uri)
                      when 'HEAD' then Net::HTTP::Head.new(uri.request_uri)
                      else Net::HTTP::Get.new(uri.request_uri)
                      end

            request['User-Agent'] = options[:user_agent] || BlogVerification.configuration.user_agent
            request['Accept'] = options[:accept] || 'application/json, text/html; charset=utf-8'

            if options[:headers].is_a?(Hash)
              options[:headers].each { |k, v| request[k.to_s] = v.to_s }
            end

            begin
              response = http.request(request)
            rescue Net::OpenTimeout, Net::ReadTimeout, Timeout::Error
              raise UpstreamError.new(
                ErrorCodes::SOURCE_TIMEOUT,
                'The source platform did not respond within the allowed time.'
              )
            rescue StandardError => e
              raise UpstreamError.new(
                ErrorCodes::SOURCE_UNAVAILABLE,
                "Upstream network error: #{e.message}"
              )
            end

            status = response.code.to_i

            # Handle redirects
            if [301, 302, 303, 307, 308].include?(status)
              location = response['location']
              if location.nil? || location.strip.empty?
                raise UpstreamError.new(
                  ErrorCodes::SOURCE_RESPONSE_INVALID,
                  'Redirect response missing Location header.'
                )
              end

              redirect_count += 1
              if redirect_count > max_redirects
                raise UpstreamError.new(
                  ErrorCodes::SOURCE_RESPONSE_INVALID,
                  'Too many redirects encountered.'
                )
              end

              current_url = URI.join(current_url, location).to_s
              next
            end

            headers_hash = {}
            response.each_header { |k, v| headers_hash[k.downcase] = v }
            return HttpResponse.new(status, response.body, headers_hash, uri)
          end

          raise UpstreamError.new(ErrorCodes::SOURCE_RESPONSE_INVALID, 'Exceeded maximum redirect depth.')
        end
      end
    end
  end
end

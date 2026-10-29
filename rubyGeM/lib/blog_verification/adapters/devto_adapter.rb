# frozen_string_literal: true

require_relative 'base_adapter'
require_relative '../utils/url_security'
require_relative '../utils/normalizer'
require_relative '../errors'
require_relative '../constants/error_codes'

module BlogVerification
  module Adapters
    class DevtoAdapter < BaseAdapter
      def initialize
        super('devto')
      end

      # Builds the official Forem / DEV.to API endpoint URL for an article URL
      def build_api_url(url_string)
        parsed = Utils::UrlSecurity.validate_article_url(url_string, 'devto')
        path = (parsed.path || '').gsub(%r{/+\z}, '')
        segments = path.split('/').reject(&:empty?)

        if segments.length >= 2
          return "https://dev.to/api/articles/#{segments[0]}/#{segments[1]}"
        end

        raise UpstreamError.new(ErrorCodes::INVALID_URL, 'Could not determine DEV.to article path.')
      end

      # Retrieves metadata for a DEV.to article using the official Forem API
      def get_article_metadata(url, _options = {})
        api_url = build_api_url(url)

        response = Utils::UrlSecurity.safe_fetch(
          api_url,
          {
            headers: {
              'Accept' => 'application/json',
              'User-Agent' => BlogVerification.configuration.user_agent
            }
          },
          'devto'
        )

        case response.status
        when 404
          raise UpstreamError.new(ErrorCodes::ARTICLE_NOT_FOUND, 'The specified article does not exist on DEV Community.', 404)
        when 401, 403
          raise UpstreamError.new(ErrorCodes::ARTICLE_ACCESS_DENIED, 'Access to the DEV Community article is restricted.', response.status)
        when 429
          raise UpstreamError.new(ErrorCodes::SOURCE_RATE_LIMITED, 'DEV Community API rate limit exceeded.', 429)
        else
          if response.status >= 500
            raise UpstreamError.new(ErrorCodes::SOURCE_UNAVAILABLE, "DEV Community returned HTTP #{response.status}.", response.status)
          elsif !response.ok?
            raise UpstreamError.new(ErrorCodes::SOURCE_RESPONSE_INVALID, "DEV Community returned unexpected status #{response.status}.", response.status)
          end
        end

        data = response.json
        unless data.is_a?(Hash)
          raise UpstreamError.new(ErrorCodes::SOURCE_RESPONSE_INVALID, 'Malformed JSON payload from DEV Community.')
        end

        # Extract tags
        tags = if data['tag_list'].is_a?(Array)
                 data['tag_list']
               elsif data['tags'].is_a?(Array)
                 data['tags']
               elsif data['tags'].is_a?(String)
                 data['tags'].split(',').map(&:strip).reject(&:empty?)
               end

        # Extract body content and word count
        content = data['body_markdown'] || data['body_html']
        word_count = content ? Utils::Normalizer.count_words(content) : nil

        user_hash = data['user'].is_a?(Hash) ? data['user'] : {}

        {
          canonical_url: data['canonical_url'] || data['url'] || url,
          platform: 'devto',
          author: {
            username: user_hash['username'],
            display_name: user_hash['name']
          },
          published_at: data['published_at'],
          updated_at: data['edited_at'],
          tags: tags,
          topic: nil, # Resolved via taxonomy mapping
          description: data['description'],
          content: content,
          word_count: word_count,
          raw_metadata: data
        }
      end
    end
  end
end

# frozen_string_literal: true

require 'json'
require_relative 'base_adapter'
require_relative '../utils/url_security'
require_relative '../utils/normalizer'
require_relative '../errors'
require_relative '../constants/error_codes'

module BlogVerification
  module Adapters
    class MediumAdapter < BaseAdapter
      def initialize
        super('medium')
      end

      # Extracts canonical username from a username string, identifier, or Medium author URL.
      # Medium canonical usernames are formatted as @username or bare username identifiers.
      def extract_username(input)
        return nil if input.nil? || !input.is_a?(String)

        trimmed = input.strip

        # 1. @username in URL or path (e.g. https://medium.com/@thedevankit or @thedevankit)
        at_match = trimmed.match(/@([a-zA-Z0-9_.-]+)/)
        return at_match[1] if at_match && at_match[1]

        # 2. Subdomain URL (e.g. https://thedevankit.medium.com)
        sub_match = trimmed.match(%r{\Ahttps?://([a-zA-Z0-9_-]+)\.medium\.com}i)
        if sub_match && sub_match[1] && !%w[www api cdn-images-1].include?(sub_match[1].downcase)
          return sub_match[1]
        end

        # 3. Clean bare username / identifier string (e.g. "thedevankit")
        if !trimmed.include?('/') && !trimmed.include?(':') && trimmed.match?(/\A[a-zA-Z0-9_.-]+\z/)
          return trimmed.sub(/\A@/, '')
        end

        nil
      end

      # Extracts article body HTML/text content from Medium page
      def extract_article_content(html)
        return nil if html.nil? || !html.is_a?(String)

        article_match = html.match(%r{<article\b[^>]*>([\s\S]*?)</article>}i)
        return article_match[1] if article_match

        p_matches = html.scan(%r{<p\b[^>]*>([\s\S]*?)</p>}i).flatten
        return p_matches.join(' ') unless p_matches.empty?

        nil
      end

      # Parses JSON-LD script blocks from HTML string
      def parse_json_ld(html)
        blocks = []
        return blocks if html.nil? || !html.is_a?(String)

        # Match script tags with type application/ld+json
        regex = %r{<script\b[^>]*\btype=["']application/ld\+json["'][^>]*>([\s\S]*?)</script>}i
        html.scan(regex) do |match|
          content = match[0]
          begin
            parsed = JSON.parse(content)
            if parsed.is_a?(Array)
              blocks.concat(parsed)
            elsif parsed.is_a?(Hash)
              if parsed['@graph'].is_a?(Array)
                blocks.concat(parsed['@graph'])
              else
                blocks << parsed
              end
            end
          rescue JSON::ParserError
            # Skip invalid JSON-LD block
          end
        end

        blocks
      end

      # Extracts meta tag attributes from HTML
      def parse_meta_tags(html)
        meta = {
          published_time: nil,
          author_url: nil,
          author_name: nil,
          description: nil,
          canonical_url: nil,
          tags: []
        }

        return meta if html.nil? || !html.is_a?(String)

        meta_regex = /<meta\s+([^>]+)>/i
        html.scan(meta_regex) do |match|
          tag_content = match[0]

          get_attr = lambda do |name|
            m = tag_content.match(/#{name}=["']([^"']*)["']/i)
            m ? m[1] : nil
          end

          prop = get_attr.call('property') || get_attr.call('name')
          content = get_attr.call('content')

          next unless prop && content

          lower_prop = prop.downcase
          case lower_prop
          when 'article:published_time'
            meta[:published_time] = content
          when 'article:author'
            meta[:author_url] = content
          when 'author'
            meta[:author_name] = content
          when 'description'
            meta[:description] ||= content
          when 'og:description'
            meta[:description] ||= content
          when 'article:tag'
            meta[:tags] << content
          end
        end

        canonical_match = html.match(%r{<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']}i)
        meta[:canonical_url] = canonical_match[1] if canonical_match

        meta
      end

      # Retrieves and normalizes metadata for a Medium article
      def get_article_metadata(url, _options = {})
        Utils::UrlSecurity.validate_article_url(url, 'medium')

        response = Utils::UrlSecurity.safe_fetch(
          url,
          {
            headers: {
              'Accept' => 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'User-Agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 BlogVerificationAPI/1.0'
            }
          },
          'medium'
        )

        case response.status
        when 404
          raise UpstreamError.new(ErrorCodes::ARTICLE_NOT_FOUND, 'The specified article does not exist on Medium.', 404)
        when 401, 403
          raise UpstreamError.new(ErrorCodes::ARTICLE_ACCESS_DENIED, 'Access to Medium article is restricted.', response.status)
        when 429
          raise UpstreamError.new(ErrorCodes::SOURCE_RATE_LIMITED, 'Medium rate limit exceeded.', 429)
        else
          if response.status >= 500
            raise UpstreamError.new(ErrorCodes::SOURCE_UNAVAILABLE, "Medium returned HTTP #{response.status}.", response.status)
          elsif !response.ok?
            raise UpstreamError.new(ErrorCodes::SOURCE_RESPONSE_INVALID, "Medium returned HTTP #{response.status}.", response.status)
          end
        end

        html = response.text
        meta_tags = parse_meta_tags(html)
        json_ld_blocks = parse_json_ld(html)

        # 1. Locate article JSON-LD block and author block
        author_obj = nil
        article_block = json_ld_blocks.find do |b|
          %w[NewsArticle BlogPosting Article TechArticle].include?(b['@type'])
        end

        if article_block && article_block['author']
          author_obj = article_block['author'].is_a?(Array) ? article_block['author'][0] : article_block['author']
        end

        # Inspect all blocks if author not found in article block
        unless author_obj
          json_ld_blocks.each do |b|
            if b.is_a?(Hash) && b['author']
              author_obj = b['author'].is_a?(Array) ? b['author'][0] : b['author']
              article_block ||= b
              break
            elsif b.is_a?(Hash) && b['@type'] == 'Person'
              author_obj = b
              break
            end
          end
        end

        article_block ||= json_ld_blocks[0] || {}

        # Canonical URL
        canonical_url = meta_tags[:canonical_url] || article_block['mainEntityOfPage'] || article_block['url'] || url

        # Canonical Author Extraction
        canonical_username = nil
        display_name = nil

        if author_obj
          if author_obj.is_a?(Hash)
            display_name = author_obj['name']

            # 1. Identifier
            canonical_username = extract_username(author_obj['identifier']) if author_obj['identifier']
            # 2. @id
            canonical_username ||= extract_username(author_obj['@id']) if author_obj['@id']
            # 3. url
            canonical_username ||= extract_username(author_obj['url']) if author_obj['url']
          elsif author_obj.is_a?(String)
            canonical_username = extract_username(author_obj)
          end
        end

        # Fallbacks to meta tags or article URL
        if !canonical_username && meta_tags[:author_url]
          canonical_username = extract_username(meta_tags[:author_url])
        end

        canonical_username ||= extract_username(canonical_url) || extract_username(url)
        display_name ||= meta_tags[:author_name]

        # Publication date
        published_at = article_block['datePublished'] ||
                       (json_ld_blocks[0] && json_ld_blocks[0]['datePublished']) ||
                       meta_tags[:published_time]

        updated_at = article_block['dateModified'] ||
                     (json_ld_blocks[0] && json_ld_blocks[0]['dateModified'])

        # Description / Summary
        description = article_block['description'] ||
                      (json_ld_blocks[0] && json_ld_blocks[0]['description']) ||
                      meta_tags[:description]

        # Tags / Keywords
        raw_keywords = article_block['keywords'] || (json_ld_blocks[0] && json_ld_blocks[0]['keywords'])
        tags = if raw_keywords.is_a?(Array)
                 raw_keywords
               elsif raw_keywords.is_a?(String)
                 raw_keywords.split(',').map(&:strip).reject(&:empty?)
               elsif !meta_tags[:tags].empty?
                 meta_tags[:tags]
               end

        content = extract_article_content(html)
        word_count = content ? Utils::Normalizer.count_words(content) : nil

        {
          canonical_url: canonical_url,
          platform: 'medium',
          author: {
            username: canonical_username,
            display_name: display_name
          },
          published_at: published_at,
          updated_at: updated_at,
          tags: tags,
          topic: nil,
          description: description,
          content: content,
          word_count: word_count,
          raw_metadata: {
            meta_tags: meta_tags,
            article_block: article_block
          }
        }
      end
    end
  end
end

# frozen_string_literal: true

require 'cgi'
require 'set'

module BlogVerification
  module Utils
    module Normalizer
      class << self
        # Normalizes a username:
        # - Trims whitespace
        # - Removes leading '@' if present
        # - Lowercases for case-insensitive comparison
        def normalize_username(username)
          return '' unless username.is_a?(String)

          cleaned = username.strip
          cleaned = cleaned[1..-1].strip if cleaned.start_with?('@')
          cleaned.downcase
        end

        # Normalizes an array of tags:
        # - Trims whitespace
        # - Lowercases
        # - Removes duplicates
        # - Filters out empty strings
        # - Sorts for deterministic representation
        def normalize_tags(tags)
          return [] unless tags.is_a?(Array)

          tags.map do |tag|
            tag.is_a?(String) ? tag.strip.downcase : nil
          end.compact.reject(&:empty?).uniq.sort
        end

        # Compares two sets of tags for equality, ignoring order
        def compare_tag_sets(expected_tags, source_tags)
          norm_expected = normalize_tags(expected_tags)
          norm_actual = normalize_tags(source_tags)

          if norm_expected.length != norm_actual.length
            return {
              match: false,
              normalized_expected: norm_expected,
              normalized_actual: norm_actual
            }
          end

          match = norm_expected == norm_actual
          {
            match: match,
            normalized_expected: norm_expected,
            normalized_actual: norm_actual
          }
        end

        # Normalizes article summary/description according to FR-08:
        # - Removes HTML tags
        # - Decodes HTML entities (e.g. &amp;, &quot;, &#39;, &lt;, &gt;)
        # - Trims leading and trailing whitespace
        # - Collapses repeated whitespace
        # - Case-normalization (lowercase)
        def normalize_summary(text)
          return '' unless text.is_a?(String)

          # 1. Remove HTML tags
          stripped = text.gsub(/<[^>]*>/, ' ')
          # 2. Decode HTML entities
          decoded = CGI.unescapeHTML(stripped)
          # 3. Collapse whitespace and trim
          collapsed = decoded.gsub(/\s+/, ' ').strip
          # 4. Lowercase
          collapsed.downcase
        end

        # Compares expected summary and actual source description
        def compare_summaries(expected_summary, source_description)
          norm_expected = normalize_summary(expected_summary)
          norm_actual = normalize_summary(source_description)

          match = !norm_expected.empty? && !norm_actual.empty? && (norm_expected == norm_actual)
          {
            match: match,
            normalized_expected: norm_expected,
            normalized_actual: norm_actual
          }
        end

        # Calculates the number of words in an article or text.
        # - Strips HTML tags
        # - Decodes HTML entities
        # - Splits on whitespace and counts non-empty word tokens
        def count_words(text)
          return 0 unless text.is_a?(String)

          stripped = text.gsub(/<[^>]*>/, ' ')
          decoded = CGI.unescapeHTML(stripped)
          words = decoded.strip.split(/\s+/).reject(&:empty?)
          words.length
        end
      end
    end
  end
end

# frozen_string_literal: true

module BlogVerification
  module Adapters
    class BaseAdapter
      attr_reader :platform

      def initialize(platform)
        @platform = platform.to_s
      end

      # Retrieves and normalizes article metadata from the source platform.
      # Returns a Hash containing:
      # - canonical_url
      # - platform
      # - author: { username: ..., display_name: ... }
      # - published_at
      # - updated_at
      # - tags
      # - topic
      # - description
      # - content
      # - word_count
      # - raw_metadata
      def get_article_metadata(_url, _options = {})
        raise NotImplementedError, "#{self.class}#get_article_metadata must be implemented."
      end
    end
  end
end

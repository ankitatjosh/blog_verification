# frozen_string_literal: true

require_relative '../constants/error_codes'

module BlogVerification
  module Rails
    # Custom ActiveModel validator for Rails models:
    #
    #   class ArticleSubmission < ApplicationRecord
    #     validates :url, blog_verification: {
    #       platform: :platform,
    #       username: :author_username,
    #       published_at: :published_date,
    #       topic: :expected_topic,
    #       summary: :expected_summary,
    #       tags: :expected_tags,
    #       min_word_count: 500
    #     }
    #   end
    class BlogVerificationValidator < ::ActiveModel::EachValidator
      def validate_each(record, attribute, value)
        return if value.nil? || value.to_s.strip.empty?

        resolve_attr = lambda do |key|
          val = options[key]
          if val.is_a?(Symbol) && record.respond_to?(val)
            record.public_send(val)
          elsif val.is_a?(Proc)
            val.call(record)
          else
            val
          end
        end

        platform       = resolve_attr.call(:platform)
        username       = resolve_attr.call(:username)
        published_at   = resolve_attr.call(:published_at) || resolve_attr.call(:publishedAt)
        topic          = resolve_attr.call(:topic)
        summary        = resolve_attr.call(:summary)
        tags           = resolve_attr.call(:tags)
        min_word_count = resolve_attr.call(:min_word_count) || resolve_attr.call(:minWordCount) || 500
        reference_date = resolve_attr.call(:reference_date) || resolve_attr.call(:referenceDate)

        payload = {
          'platform' => platform,
          'url' => value,
          'username' => username,
          'publishedAt' => published_at,
          'topic' => topic,
          'summary' => summary,
          'tags' => tags,
          'minWordCount' => min_word_count,
          'referenceDate' => reference_date
        }

        result = BlogVerification.verify(payload)

        # Store full verification result on the record if accessor exists
        if record.respond_to?(:verification_result=)
          record.verification_result = result
        end

        if result['status'] == 'error'
          (result['errors'] || []).each do |err|
            record.errors.add(attribute, err['message'] || 'is invalid')
          end
        elsif result['status'] == BlogVerification::ErrorCodes::VerificationStatus::INVALID
          (result['errors'] || []).each do |err|
            record.errors.add(attribute, err['message'] || 'failed blog verification')
          end
        elsif result['status'] == BlogVerification::ErrorCodes::VerificationStatus::UNVERIFIED
          if options[:allow_unverified] != true
            record.errors.add(attribute, 'could not be verified from the platform')
          end
        end
      end
    end
  end
end

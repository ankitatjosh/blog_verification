# frozen_string_literal: true

require_relative '../constants/error_codes'
require_relative '../constants/taxonomy'
require_relative '../utils/normalizer'
require_relative '../utils/date_helper'

module BlogVerification
  module Services
    class ValidationService
      include ErrorCodes

      # Evaluates all validation checks against retrieved source metadata
      #
      # @param [Hash] request_data User request hash
      # @param [Hash] source_metadata Metadata extracted by platform adapter
      # @return [Hash] JSON-compliant verification response structure
      def evaluate(request_data, source_metadata)
        req = normalize_request_data(request_data)
        src = normalize_source_metadata(source_metadata)

        checks = {}
        errors = []

        # 1. URL check
        checks['url'] = { 'status' => CheckStatus::PASSED }

        # 2. Author username check (FR-04)
        author_username = src.dig('author', 'username')
        if author_username && !author_username.to_s.strip.empty?
          norm_expected = Utils::Normalizer.normalize_username(req['username'])
          norm_actual = Utils::Normalizer.normalize_username(author_username)

          if norm_expected == norm_actual
            checks['username'] = {
              'status' => CheckStatus::PASSED,
              'expected' => req['username'],
              'actual' => author_username
            }
          else
            checks['username'] = {
              'status' => CheckStatus::FAILED,
              'expected' => req['username'],
              'actual' => author_username
            }
            errors << {
              'code' => AUTHOR_MISMATCH,
              'field' => 'username',
              'message' => DEFAULT_ERROR_MESSAGES[AUTHOR_MISMATCH],
              'expected' => req['username'],
              'actual' => author_username
            }
          end
        else
          checks['username'] = {
            'status' => CheckStatus::UNVERIFIED,
            'message' => 'Author username could not be established from source metadata.'
          }
          errors << {
            'code' => SOURCE_METADATA_UNAVAILABLE,
            'field' => 'username',
            'message' => 'Author username could not be established from source metadata.'
          }
        end

        # 3. Publication date check (FR-05)
        published_at_src = src['published_at']
        if published_at_src && !published_at_src.to_s.strip.empty?
          date_comp = Utils::DateHelper.compare_calendar_dates(req['published_at'], published_at_src)
          normalized_actual = date_comp[:normalized_actual]

          if normalized_actual
            if date_comp[:match]
              checks['publishedAt'] = {
                'status' => CheckStatus::PASSED,
                'expected' => req['published_at'],
                'actual' => normalized_actual
              }
            else
              checks['publishedAt'] = {
                'status' => CheckStatus::FAILED,
                'expected' => req['published_at'],
                'actual' => normalized_actual
              }
              errors << {
                'code' => PUBLICATION_DATE_MISMATCH,
                'field' => 'publishedAt',
                'message' => DEFAULT_ERROR_MESSAGES[PUBLICATION_DATE_MISMATCH],
                'expected' => req['published_at'],
                'actual' => normalized_actual
              }
            end
          else
            checks['publishedAt'] = {
              'status' => CheckStatus::UNVERIFIED,
              'message' => 'Source publication date could not be parsed to a valid UTC date.'
            }
            errors << {
              'code' => SOURCE_METADATA_UNAVAILABLE,
              'field' => 'publishedAt',
              'message' => 'Source publication date could not be parsed to a valid UTC date.'
            }
          end
        else
          checks['publishedAt'] = {
            'status' => CheckStatus::UNVERIFIED,
            'message' => 'Original publication date could not be established from source metadata.'
          }
          errors << {
            'code' => SOURCE_METADATA_UNAVAILABLE,
            'field' => 'publishedAt',
            'message' => 'Original publication date could not be established from source metadata.'
          }
        end

        # 4. Quarter verification check
        if published_at_src && !published_at_src.to_s.strip.empty?
          quarter_result = Utils::DateHelper.date_in_current_quarter?(published_at_src, req['reference_date'])
          if quarter_result[:in_current_quarter]
            checks['quarter'] = {
              'status' => CheckStatus::PASSED,
              'currentQuarter' => quarter_result[:current_quarter][:label],
              'blogQuarter' => quarter_result[:blog_quarter][:label],
              'message' => "Blog publication date is in the current quarter (#{quarter_result[:current_quarter][:label]})."
            }
          elsif quarter_result[:blog_quarter] && quarter_result[:current_quarter]
            checks['quarter'] = {
              'status' => CheckStatus::FAILED,
              'currentQuarter' => quarter_result[:current_quarter][:label],
              'blogQuarter' => quarter_result[:blog_quarter][:label],
              'message' => "Blog publication date is not in the current quarter. Expected #{quarter_result[:current_quarter][:label]}, but blog was published in #{quarter_result[:blog_quarter][:label]}."
            }
            errors << {
              'code' => NOT_IN_CURRENT_QUARTER,
              'field' => 'publishedAt',
              'message' => "Blog publication date is not in the current quarter. Expected #{quarter_result[:current_quarter][:label]}, but blog was published in #{quarter_result[:blog_quarter][:label]}.",
              'expected' => quarter_result[:current_quarter][:label],
              'actual' => quarter_result[:blog_quarter][:label]
            }
          else
            checks['quarter'] = {
              'status' => CheckStatus::UNVERIFIED,
              'message' => 'Quarter could not be established from source publication date.'
            }
            errors << {
              'code' => SOURCE_METADATA_UNAVAILABLE,
              'field' => 'quarter',
              'message' => 'Quarter could not be established from source publication date.'
            }
          end
        else
          checks['quarter'] = {
            'status' => CheckStatus::UNVERIFIED,
            'message' => 'Quarter could not be verified because source publication date is unavailable.'
          }
          errors << {
            'code' => SOURCE_METADATA_UNAVAILABLE,
            'field' => 'quarter',
            'message' => 'Quarter could not be verified because source publication date is unavailable.'
          }
        end

        # 5. Tags check (FR-06 - Optional)
        has_supplied_tags = req['tags'].is_a?(Array) && !req['tags'].empty?
        if !has_supplied_tags
          checks['tags'] = {
            'status' => CheckStatus::SKIPPED,
            'message' => 'Tag validation was skipped because tags were not provided.'
          }
        else
          source_tags = src['tags']
          if source_tags.is_a?(Array)
            comp = Utils::Normalizer.compare_tag_sets(req['tags'], source_tags)
            if comp[:match]
              checks['tags'] = {
                'status' => CheckStatus::PASSED,
                'expected' => comp[:normalized_expected],
                'actual' => comp[:normalized_actual]
              }
            else
              checks['tags'] = {
                'status' => CheckStatus::FAILED,
                'expected' => comp[:normalized_expected],
                'actual' => comp[:normalized_actual]
              }
              errors << {
                'code' => TAGS_MISMATCH,
                'field' => 'tags',
                'message' => DEFAULT_ERROR_MESSAGES[TAGS_MISMATCH],
                'expected' => comp[:normalized_expected],
                'actual' => comp[:normalized_actual]
              }
            end
          else
            checks['tags'] = {
              'status' => CheckStatus::UNVERIFIED,
              'message' => 'Source platform does not expose reliable tag metadata.'
            }
            errors << {
              'code' => SOURCE_METADATA_UNAVAILABLE,
              'field' => 'tags',
              'message' => 'Source platform does not expose reliable tag metadata.'
            }
          end
        end

        # 6. Topic check (FR-07)
        verified_topic = Taxonomy.derive_topic_from_metadata(src)
        if verified_topic
          if Taxonomy.compare_topics(req['topic'], verified_topic)
            checks['topic'] = {
              'status' => CheckStatus::PASSED,
              'expected' => req['topic'],
              'actual' => verified_topic
            }
          else
            checks['topic'] = {
              'status' => CheckStatus::FAILED,
              'expected' => req['topic'],
              'actual' => verified_topic
            }
            errors << {
              'code' => TOPIC_MISMATCH,
              'field' => 'topic',
              'message' => DEFAULT_ERROR_MESSAGES[TOPIC_MISMATCH],
              'expected' => req['topic'],
              'actual' => verified_topic
            }
          end
        else
          checks['topic'] = {
            'status' => CheckStatus::UNVERIFIED,
            'message' => 'Article topic could not be established reliably from source metadata.'
          }
          errors << {
            'code' => SOURCE_METADATA_UNAVAILABLE,
            'field' => 'topic',
            'message' => 'Article topic could not be established reliably from source metadata.'
          }
        end

        # 7. Summary check (FR-08)
        source_description = src['description']
        if source_description && !source_description.to_s.strip.empty?
          comp = Utils::Normalizer.compare_summaries(req['summary'], source_description)
          if comp[:match]
            checks['summary'] = { 'status' => CheckStatus::PASSED }
          else
            checks['summary'] = { 'status' => CheckStatus::FAILED }
            errors << {
              'code' => SUMMARY_MISMATCH,
              'field' => 'summary',
              'message' => DEFAULT_ERROR_MESSAGES[SUMMARY_MISMATCH],
              'expected' => req['summary'],
              'actual' => source_description
            }
          end
        else
          checks['summary'] = {
            'status' => CheckStatus::UNVERIFIED,
            'message' => 'Article description or excerpt could not be established from source metadata.'
          }
          errors << {
            'code' => SOURCE_METADATA_UNAVAILABLE,
            'field' => 'summary',
            'message' => 'Article description or excerpt could not be established from source metadata.'
          }
        end

        # 8. Blog content length / word count check
        min_words = req['min_word_count'] || 500
        actual_word_count = src['word_count']
        if actual_word_count.is_a?(Numeric)
          if actual_word_count >= min_words
            checks['contentLength'] = {
              'status' => CheckStatus::PASSED,
              'wordCount' => actual_word_count,
              'minRequired' => min_words,
              'message' => "Blog length passed (#{actual_word_count} words >= #{min_words} words)."
            }
          else
            checks['contentLength'] = {
              'status' => CheckStatus::FAILED,
              'wordCount' => actual_word_count,
              'minRequired' => min_words,
              'message' => "Blog length failed: article has #{actual_word_count} words, which is below the required #{min_words} words."
            }
            errors << {
              'code' => INSUFFICIENT_CONTENT_LENGTH,
              'field' => 'contentLength',
              'message' => "The blog content does not meet the minimum required length of #{min_words} words.",
              'expected' => min_words,
              'actual' => actual_word_count
            }
          end
        else
          checks['contentLength'] = {
            'status' => CheckStatus::UNVERIFIED,
            'message' => 'Blog content length could not be established from source metadata.'
          }
          errors << {
            'code' => SOURCE_METADATA_UNAVAILABLE,
            'field' => 'contentLength',
            'message' => 'Blog content length could not be established from source metadata.'
          }
        end

        aggregate_status(checks, errors, req)
      end

      # Aggregates individual check statuses into valid, invalid, or unverified response
      def aggregate_status(checks, errors, req)
        check_statuses = checks.values.map { |c| c['status'] }
        has_failed = check_statuses.include?(CheckStatus::FAILED)
        has_unverified = check_statuses.include?(CheckStatus::UNVERIFIED)

        if has_failed
          overall_status = VerificationStatus::INVALID
          msg = 'Blog verification failed.'
        elsif has_unverified
          overall_status = VerificationStatus::UNVERIFIED
          msg = 'Blog verification could not be completed.'
        else
          overall_status = VerificationStatus::VALID
          msg = 'Blog verification completed successfully.'
        end

        res = {
          'success' => true,
          'status' => overall_status,
          'message' => msg,
          'data' => {
            'platform' => req['platform'],
            'url' => req['url'],
            'checks' => checks
          }
        }

        res['errors'] = errors unless errors.empty?
        res
      end

      # Builds a structured response when upstream source fails
      def build_source_failure_response(request_data, upstream_error)
        req = normalize_request_data(request_data)
        has_supplied_tags = req['tags'].is_a?(Array) && !req['tags'].empty?
        is_not_found = upstream_error.respond_to?(:error_code) &&
                       upstream_error.error_code == ARTICLE_NOT_FOUND

        if is_not_found
          return {
            'success' => true,
            'status' => VerificationStatus::INVALID,
            'message' => 'Blog verification failed.',
            'errors' => [
              {
                'code' => ARTICLE_NOT_FOUND,
                'field' => 'url',
                'message' => upstream_error.message || DEFAULT_ERROR_MESSAGES[ARTICLE_NOT_FOUND]
              }
            ],
            'data' => {
              'platform' => req['platform'],
              'url' => req['url'],
              'checks' => {
                'url' => {
                  'status' => CheckStatus::FAILED,
                  'message' => upstream_error.message || DEFAULT_ERROR_MESSAGES[ARTICLE_NOT_FOUND]
                },
                'username' => { 'status' => CheckStatus::UNVERIFIED },
                'publishedAt' => { 'status' => CheckStatus::UNVERIFIED },
                'quarter' => { 'status' => CheckStatus::UNVERIFIED },
                'tags' => has_supplied_tags ? { 'status' => CheckStatus::UNVERIFIED } : { 'status' => CheckStatus::SKIPPED, 'message' => 'Tag validation was skipped because tags were not provided.' },
                'topic' => { 'status' => CheckStatus::UNVERIFIED },
                'summary' => { 'status' => CheckStatus::UNVERIFIED },
                'contentLength' => { 'status' => CheckStatus::UNVERIFIED }
              }
            }
          }
        end

        err_code = upstream_error.respond_to?(:error_code) ? upstream_error.error_code : SOURCE_UNAVAILABLE
        {
          'success' => true,
          'status' => VerificationStatus::UNVERIFIED,
          'message' => 'Blog verification could not be completed.',
          'errors' => [
            {
              'code' => err_code,
              'field' => nil,
              'message' => upstream_error.message
            }
          ],
          'data' => {
            'platform' => req['platform'],
            'url' => req['url'],
            'checks' => {
              'url' => { 'status' => CheckStatus::UNVERIFIED },
              'username' => { 'status' => CheckStatus::UNVERIFIED },
              'publishedAt' => { 'status' => CheckStatus::UNVERIFIED },
              'quarter' => { 'status' => CheckStatus::UNVERIFIED },
              'tags' => has_supplied_tags ? { 'status' => CheckStatus::UNVERIFIED } : { 'status' => CheckStatus::SKIPPED, 'message' => 'Tag validation was skipped because tags were not provided.' },
              'topic' => { 'status' => CheckStatus::UNVERIFIED },
              'summary' => { 'status' => CheckStatus::UNVERIFIED },
              'contentLength' => { 'status' => CheckStatus::UNVERIFIED }
            }
          }
        }
      end

      private

      def normalize_request_data(data)
        h = {}
        data.each do |k, v|
          key_str = k.to_s
          case key_str
          when 'platform' then h['platform'] = v.to_s.downcase.strip
          when 'url' then h['url'] = v.to_s.strip
          when 'username' then h['username'] = v.to_s.strip
          when 'publishedAt', 'published_at' then h['published_at'] = v.to_s.strip
          when 'tags' then h['tags'] = v
          when 'topic' then h['topic'] = v.to_s.strip
          when 'summary' then h['summary'] = v.to_s.strip
          when 'minWordCount', 'min_word_count' then h['min_word_count'] = v.to_i
          when 'referenceDate', 'reference_date' then h['reference_date'] = v.to_s.strip
          end
        end
        h
      end

      def normalize_source_metadata(metadata)
        return {} unless metadata.is_a?(Hash)

        h = {}
        metadata.each do |k, v|
          key_str = k.to_s
          case key_str
          when 'canonical_url', 'canonicalUrl' then h['canonical_url'] = v
          when 'platform' then h['platform'] = v
          when 'author'
            if v.is_a?(Hash)
              author_hash = {}
              v.each do |ak, av|
                ak_str = ak.to_s
                if %w[username].include?(ak_str)
                  author_hash['username'] = av
                elsif %w[displayName display_name name].include?(ak_str)
                  author_hash['display_name'] = av
                end
              end
              h['author'] = author_hash
            end
          when 'published_at', 'publishedAt' then h['published_at'] = v
          when 'updated_at', 'updatedAt' then h['updated_at'] = v
          when 'tags' then h['tags'] = v
          when 'topic' then h['topic'] = v
          when 'description' then h['description'] = v
          when 'content' then h['content'] = v
          when 'word_count', 'wordCount' then h['word_count'] = v
          when 'raw_metadata', 'rawMetadata' then h['raw_metadata'] = v
          end
        end
        h
      end
    end
  end
end

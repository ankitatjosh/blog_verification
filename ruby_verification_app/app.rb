# frozen_string_literal: true

require 'bundler/setup'
require 'blog_verification'
require 'json'
require 'optparse'
require 'webrick'
require 'stringio'

module BlogVerificationApp
  class Color
    def self.green(text); "\e[32m#{text}\e[0m"; end
    def self.red(text); "\e[31m#{text}\e[0m"; end
    def self.yellow(text); "\e[33m#{text}\e[0m"; end
    def self.blue(text); "\e[34m#{text}\e[0m"; end
    def self.cyan(text); "\e[36m#{text}\e[0m"; end
    def self.bold(text); "\e[1m#{text}\e[0m"; end
  end

  class Runner
    FIXTURES_DIR = File.expand_path('../rubyGeM/spec/fixtures', __dir__)

    def self.run_suite
      puts Color.bold(Color.cyan("=" * 70))
      puts Color.bold(Color.cyan("  BLOG VERIFICATION GEM — COMPREHENSIVE VERIFICATION SUITE"))
      puts Color.bold(Color.cyan("=" * 70))
      puts "Using BlogVerification Gem Version: #{Color.bold(BlogVerification::VERSION)}"
      puts "Ruby Version: #{Color.bold(RUBY_VERSION)} (#{RUBY_PLATFORM})"
      puts

      passed_count = 0
      failed_count = 0

      test_cases = [
        method(:test_devto_valid),
        method(:test_medium_valid_jsonld),
        method(:test_author_mismatch),
        method(:test_publication_date_mismatch),
        method(:test_quarter_mismatch),
        method(:test_content_length_insufficient),
        method(:test_tags_skipped_when_omitted),
        method(:test_tags_mismatch),
        method(:test_topic_derivation_and_match),
        method(:test_summary_mismatch),
        method(:test_not_found_article),
        method(:test_ssrf_protection),
        method(:test_input_validation_errors)
      ]

      test_cases.each_with_index do |test_case, idx|
        print "[#{idx + 1}/#{test_cases.size}] #{test_case.name.to_s.sub('test_', '').tr('_', ' ').capitalize}... "
        begin
          test_case.call
          puts Color.green("✓ PASSED")
          passed_count += 1
        rescue StandardError => e
          puts Color.red("✗ FAILED: #{e.message}")
          puts e.backtrace.first(3).map { |l| "    #{l}" }
          failed_count += 1
        end
      end

      puts
      puts Color.bold(Color.cyan("-" * 70))
      if failed_count.zero?
        puts Color.bold(Color.green("ALL #{passed_count} GEM VERIFICATION SCENARIOS PASSED!"))
      else
        puts Color.bold(Color.red("#{failed_count} SCENARIOS FAILED out of #{passed_count + failed_count}"))
      end
      puts Color.bold(Color.cyan("=" * 70))
      failed_count.zero?
    end

    # 1. DEV.to Valid Article with full check passes
    def self.test_devto_valid
      service = BlogVerification::Services::ValidationService.new
      request = {
        'platform' => 'devto',
        'url' => 'https://dev.to/janedoe/building-a-rest-api-with-nodejs-123',
        'username' => 'janedoe',
        'publishedAt' => '2026-10-11',
        'tags' => ['nodejs', 'api', 'express'],
        'topic' => 'Backend Development',
        'summary' => 'A comprehensive guide to building clean, maintainable REST APIs with Node.js and Express.',
        'minWordCount' => 500,
        'referenceDate' => '2026-10-15'
      }

      metadata = {
        'canonical_url' => 'https://dev.to/janedoe/building-a-rest-api-with-nodejs-123',
        'platform' => 'devto',
        'author' => { 'username' => 'janedoe', 'display_name' => 'Jane Doe' },
        'published_at' => '2026-10-11T18:30:00Z',
        'tags' => ['nodejs', 'api', 'express'],
        'description' => 'A comprehensive guide to building clean, maintainable REST APIs with Node.js and Express.',
        'word_count' => 840
      }

      result = service.evaluate(request, metadata)
      raise "Expected status 'valid', got #{result['status']}" unless result['status'] == 'valid'
      raise "Expected url check passed" unless result['data']['checks']['url']['status'] == 'passed'
      raise "Expected username check passed" unless result['data']['checks']['username']['status'] == 'passed'
      raise "Expected publishedAt check passed" unless result['data']['checks']['publishedAt']['status'] == 'passed'
      raise "Expected quarter check passed" unless result['data']['checks']['quarter']['status'] == 'passed'
      raise "Expected tags check passed" unless result['data']['checks']['tags']['status'] == 'passed'
      raise "Expected topic check passed" unless result['data']['checks']['topic']['status'] == 'passed'
      raise "Expected summary check passed" unless result['data']['checks']['summary']['status'] == 'passed'
      raise "Expected contentLength check passed" unless result['data']['checks']['contentLength']['status'] == 'passed'
    end

    # 2. Medium Valid Article with JSON-LD author detection
    def self.test_medium_valid_jsonld
      fixture_path = File.join(FIXTURES_DIR, 'medium_html.html')
      html = File.read(fixture_path)
      adapter = BlogVerification::Adapters::MediumAdapter.new

      # Verify parsing of JSON-LD
      json_ld = adapter.parse_json_ld(html)
      raise "Failed to parse JSON-LD from Medium fixture" if json_ld.empty?

      author = json_ld[0]['author']
      author_username = adapter.extract_username(author['identifier'] || author['@id'] || author['url'])
      raise "Expected username 'janedoe', got #{author_username}" unless author_username == 'janedoe'

      words = BlogVerification::Utils::Normalizer.count_words(adapter.extract_article_content(html))
      raise "Expected word count >= 500, got #{words}" unless words >= 500
    end

    # 3. Author Mismatch
    def self.test_author_mismatch
      service = BlogVerification::Services::ValidationService.new
      request = {
        'platform' => 'devto',
        'url' => 'https://dev.to/janedoe/article-123',
        'username' => 'wrongauthor',
        'publishedAt' => '2026-10-11',
        'topic' => 'Backend Development',
        'summary' => 'Summary text',
        'referenceDate' => '2026-10-15'
      }

      metadata = {
        'canonical_url' => 'https://dev.to/janedoe/article-123',
        'platform' => 'devto',
        'author' => { 'username' => 'janedoe' },
        'published_at' => '2026-10-11T18:30:00Z',
        'description' => 'Summary text',
        'word_count' => 600
      }

      result = service.evaluate(request, metadata)
      raise "Expected invalid status" unless result['status'] == 'invalid'
      raise "Expected username check to fail" unless result['data']['checks']['username']['status'] == 'failed'
      error_codes = result['errors'].map { |e| e['code'] }
      raise "Expected AUTHOR_MISMATCH code" unless error_codes.include?('AUTHOR_MISMATCH')
    end

    # 4. Publication Date Mismatch
    def self.test_publication_date_mismatch
      service = BlogVerification::Services::ValidationService.new
      request = {
        'platform' => 'devto',
        'url' => 'https://dev.to/janedoe/article-123',
        'username' => 'janedoe',
        'publishedAt' => '2026-10-12', # Different calendar day
        'topic' => 'Backend Development',
        'summary' => 'Summary text',
        'referenceDate' => '2026-10-15'
      }

      metadata = {
        'canonical_url' => 'https://dev.to/janedoe/article-123',
        'platform' => 'devto',
        'author' => { 'username' => 'janedoe' },
        'published_at' => '2026-10-11T18:30:00Z',
        'description' => 'Summary text',
        'word_count' => 600
      }

      result = service.evaluate(request, metadata)
      raise "Expected invalid status" unless result['status'] == 'invalid'
      raise "Expected publishedAt check to fail" unless result['data']['checks']['publishedAt']['status'] == 'failed'
      error_codes = result['errors'].map { |e| e['code'] }
      raise "Expected PUBLICATION_DATE_MISMATCH" unless error_codes.include?('PUBLICATION_DATE_MISMATCH')
    end

    # 5. Quarter Mismatch Check (April-June vs October-December)
    def self.test_quarter_mismatch
      service = BlogVerification::Services::ValidationService.new
      request = {
        'platform' => 'devto',
        'url' => 'https://dev.to/janedoe/article-123',
        'username' => 'janedoe',
        'publishedAt' => '2026-05-15', # Q1 (April-June)
        'topic' => 'Backend Development',
        'summary' => 'Summary text',
        'referenceDate' => '2026-10-15' # Q3 (October-December)
      }

      metadata = {
        'canonical_url' => 'https://dev.to/janedoe/article-123',
        'platform' => 'devto',
        'author' => { 'username' => 'janedoe' },
        'published_at' => '2026-05-15T12:00:00Z',
        'description' => 'Summary text',
        'word_count' => 600
      }

      result = service.evaluate(request, metadata)
      raise "Expected invalid status" unless result['status'] == 'invalid'
      quarter_check = result['data']['checks']['quarter']
      raise "Expected quarter check failed" unless quarter_check['status'] == 'failed'
      raise "Expected blogQuarter to be Q1" unless quarter_check['blogQuarter'] == 'April - June 2026'
      raise "Expected currentQuarter to be Q3" unless quarter_check['currentQuarter'] == 'October - December 2026'
      error_codes = result['errors'].map { |e| e['code'] }
      raise "Expected NOT_IN_CURRENT_QUARTER" unless error_codes.include?('NOT_IN_CURRENT_QUARTER')
    end

    # 6. Insufficient Word Count (< 500 words)
    def self.test_content_length_insufficient
      service = BlogVerification::Services::ValidationService.new
      request = {
        'platform' => 'devto',
        'url' => 'https://dev.to/janedoe/article-123',
        'username' => 'janedoe',
        'publishedAt' => '2026-10-11',
        'topic' => 'Backend Development',
        'summary' => 'Summary text',
        'minWordCount' => 500,
        'referenceDate' => '2026-10-15'
      }

      metadata = {
        'canonical_url' => 'https://dev.to/janedoe/article-123',
        'platform' => 'devto',
        'author' => { 'username' => 'janedoe' },
        'published_at' => '2026-10-11T18:30:00Z',
        'description' => 'Summary text',
        'word_count' => 320 # Under 500 words
      }

      result = service.evaluate(request, metadata)
      raise "Expected invalid status" unless result['status'] == 'invalid'
      cl_check = result['data']['checks']['contentLength']
      raise "Expected contentLength check failed" unless cl_check['status'] == 'failed'
      raise "Expected wordCount 320" unless cl_check['wordCount'] == 320
      error_codes = result['errors'].map { |e| e['code'] }
      raise "Expected INSUFFICIENT_CONTENT_LENGTH" unless error_codes.include?('INSUFFICIENT_CONTENT_LENGTH')
    end

    # 7. Optional Tags Skipped When Omitted
    def self.test_tags_skipped_when_omitted
      service = BlogVerification::Services::ValidationService.new
      request = {
        'platform' => 'devto',
        'url' => 'https://dev.to/janedoe/article-123',
        'username' => 'janedoe',
        'publishedAt' => '2026-10-11',
        'topic' => 'Backend Development',
        'summary' => 'Summary text',
        'referenceDate' => '2026-10-15'
        # tags omitted
      }

      metadata = {
        'canonical_url' => 'https://dev.to/janedoe/article-123',
        'platform' => 'devto',
        'author' => { 'username' => 'janedoe' },
        'published_at' => '2026-10-11T18:30:00Z',
        'description' => 'Summary text',
        'tags' => ['ruby', 'rails'],
        'word_count' => 600
      }

      result = service.evaluate(request, metadata)
      raise "Expected valid status" unless result['status'] == 'valid'
      raise "Expected tags status skipped" unless result['data']['checks']['tags']['status'] == 'skipped'
    end

    # 8. Tags Mismatch
    def self.test_tags_mismatch
      service = BlogVerification::Services::ValidationService.new
      request = {
        'platform' => 'devto',
        'url' => 'https://dev.to/janedoe/article-123',
        'username' => 'janedoe',
        'publishedAt' => '2026-10-11',
        'tags' => ['python', 'django'],
        'topic' => 'Backend Development',
        'summary' => 'Summary text',
        'referenceDate' => '2026-10-15'
      }

      metadata = {
        'canonical_url' => 'https://dev.to/janedoe/article-123',
        'platform' => 'devto',
        'author' => { 'username' => 'janedoe' },
        'published_at' => '2026-10-11T18:30:00Z',
        'tags' => ['ruby', 'rails'],
        'description' => 'Summary text',
        'word_count' => 600
      }

      result = service.evaluate(request, metadata)
      raise "Expected invalid status" unless result['status'] == 'invalid'
      raise "Expected tags failed" unless result['data']['checks']['tags']['status'] == 'failed'
      error_codes = result['errors'].map { |e| e['code'] }
      raise "Expected TAGS_MISMATCH" unless error_codes.include?('TAGS_MISMATCH')
    end

    # 9. Topic Derivation & Synonym Match
    def self.test_topic_derivation_and_match
      canonical = BlogVerification::Taxonomy.resolve_canonical_topic('backend')
      raise "Expected 'Backend Development', got #{canonical}" unless canonical == 'Backend Development'

      derived = BlogVerification::Taxonomy.derive_topic_from_metadata({ 'tags' => ['nodejs', 'express'] })
      raise "Expected 'Backend Development', got #{derived}" unless derived == 'Backend Development'

      match = BlogVerification::Taxonomy.compare_topics('backend', 'Backend Development')
      raise "Expected alias 'backend' to match 'Backend Development'" unless match
    end

    # 10. Summary Mismatch
    def self.test_summary_mismatch
      service = BlogVerification::Services::ValidationService.new
      request = {
        'platform' => 'devto',
        'url' => 'https://dev.to/janedoe/article-123',
        'username' => 'janedoe',
        'publishedAt' => '2026-10-11',
        'topic' => 'Backend Development',
        'summary' => 'Totally wrong summary about something else entirely.',
        'referenceDate' => '2026-10-15'
      }

      metadata = {
        'canonical_url' => 'https://dev.to/janedoe/article-123',
        'platform' => 'devto',
        'author' => { 'username' => 'janedoe' },
        'published_at' => '2026-10-11T18:30:00Z',
        'description' => 'Official article description about Node.js and Express APIs.',
        'word_count' => 600
      }

      result = service.evaluate(request, metadata)
      raise "Expected invalid status" unless result['status'] == 'invalid'
      raise "Expected summary check failed" unless result['data']['checks']['summary']['status'] == 'failed'
      error_codes = result['errors'].map { |e| e['code'] }
      raise "Expected SUMMARY_MISMATCH" unless error_codes.include?('SUMMARY_MISMATCH')
    end

    # 11. Not Found Article (404 mapping)
    def self.test_not_found_article
      adapter = BlogVerification::Adapters::DevtoAdapter.new
      api_url = adapter.build_api_url('https://dev.to/janedoe/non-existent-123')
      expected = 'https://dev.to/api/articles/janedoe/non-existent-123'
      raise "Expected #{expected}, got #{api_url}" unless api_url == expected
    end

    # 12. SSRF Protection
    def self.test_ssrf_protection
      raise "127.0.0.1 should not be safe" if BlogVerification::Utils::UrlSecurity.ip_address_safe?('127.0.0.1')
      raise "10.0.0.1 should not be safe" if BlogVerification::Utils::UrlSecurity.ip_address_safe?('10.0.0.1')
      raise "192.168.1.1 should not be safe" if BlogVerification::Utils::UrlSecurity.ip_address_safe?('192.168.1.1')
      raise "169.254.169.254 should not be safe" if BlogVerification::Utils::UrlSecurity.ip_address_safe?('169.254.169.254')
      raise "8.8.8.8 should be safe" unless BlogVerification::Utils::UrlSecurity.ip_address_safe?('8.8.8.8')
    end

    # 13. Input Validation Errors
    def self.test_input_validation_errors
      result = BlogVerification.verify({})
      raise "Expected failure on empty input" if result['success']
      raise "Expected error status" unless result['status'] == 'error'
      codes = result['errors'].map { |e| e['code'] }
      raise "Expected MISSING_REQUIRED_FIELD" unless codes.include?('MISSING_REQUIRED_FIELD')
    end
  end

  class Server
    def self.start(port = 4567)
      server = WEBrick::HTTPServer.new(Port: port, Logger: WEBrick::Log.new($stdout, WEBrick::Log::INFO))

      server.mount_proc '/api/v1/blogs/verify' do |req, res|
        if req.request_method != 'POST'
          res.status = 405
          res['Content-Type'] = 'application/json'
          res.body = { error: 'Method Not Allowed' }.to_json
          next
        end

        begin
          body = req.body ? JSON.parse(req.body) : {}
          verification_result = BlogVerification.verify(body)

          res.status = 200
          res['Content-Type'] = 'application/json'
          res.body = JSON.pretty_generate(verification_result)
        rescue JSON::ParserError
          res.status = 400
          res['Content-Type'] = 'application/json'
          res.body = { error: 'Invalid JSON body' }.to_json
        rescue StandardError => e
          res.status = 500
          res['Content-Type'] = 'application/json'
          res.body = { error: e.message }.to_json
        end
      end

      server.mount_proc '/health' do |_req, res|
        res.status = 200
        res['Content-Type'] = 'application/json'
        res.body = { status: 'healthy', gem_version: BlogVerification::VERSION }.to_json
      end

      trap('INT') { server.shutdown }
      trap('TERM') { server.shutdown }

      puts Color.bold(Color.green("Verification API Server running on http://localhost:#{port}"))
      puts "Endpoints:"
      puts "  POST /api/v1/blogs/verify"
      puts "  GET  /health"
      puts "Press Ctrl+C to stop."
      server.start
    end
  end
end

if __FILE__ == $PROGRAM_NAME
  options = {}
  opt_parser = OptionParser.new do |opts|
    opts.banner = "Usage: ruby app.rb [options]"

    opts.on('-s', '--suite', 'Run comprehensive verification test suite') do
      options[:mode] = :suite
    end

    opts.on('--server [PORT]', 'Start verification HTTP server (default: 4567)') do |port|
      options[:mode] = :server
      options[:port] = port ? port.to_i : 4567
    end

    opts.on('--verify-devto URL', 'Verify a live DEV.to URL') do |url|
      options[:mode] = :verify_devto
      options[:url] = url
    end

    opts.on('-h', '--help', 'Show help') do
      puts opts
      exit
    end
  end

  opt_parser.parse!

  case options[:mode]
  when :server
    BlogVerificationApp::Server.start(options[:port] || 4567)
  when :verify_devto
    puts "Verifying DEV.to blog: #{options[:url]}..."
    result = BlogVerification.verify(
      platform: 'devto',
      url: options[:url],
      username: ARGV[0] || 'testuser',
      published_at: ARGV[1] || '2026-10-11',
      topic: ARGV[2] || 'Backend Development',
      summary: ARGV[3] || 'A summary'
    )
    puts JSON.pretty_generate(result)
  else
    # Default: Run the full test and verification suite
    success = BlogVerificationApp::Runner.run_suite
    exit(success ? 0 : 1)
  end
end

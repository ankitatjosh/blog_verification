# frozen_string_literal: true

require_relative '../lib/blog_verification'
require 'json'

puts '=================================================='
puts "BlogVerification Gem Local Test (v#{BlogVerification::VERSION})"
puts '=================================================='

# 1. Test invalid inputs (missing required fields)
puts "\n--- 1. Testing Input Validation ---"
result = BlogVerification.verify({})
puts "Status: #{result['status']}"
puts "Errors: #{JSON.pretty_generate(result['errors'])}"

# 2. Test mock / local evaluation
puts "\n--- 2. Testing Quarter & Word Count Logic ---"
current_q = BlogVerification::Utils::DateHelper.get_quarter_info(Time.now.utc)
puts "Current Quarter: #{current_q[:label]} (#{current_q[:start_date]} to #{current_q[:end_date]})"

# Simulate a blog from last quarter
past_date = '2026-05-15'
past_q_check = BlogVerification::Utils::DateHelper.date_in_current_quarter?(past_date)
puts "Blog date #{past_date} in current quarter? #{past_q_check[:in_current_quarter]}"
puts "Blog Quarter: #{past_q_check[:blog_quarter][:label]}"

# 3. Test Medium username extractor
puts "\n--- 3. Testing Medium Author Extraction ---"
medium_adapter = BlogVerification::Adapters::MediumAdapter.new
test_identifiers = [
  'thedevankit',
  '@thedevankit',
  'https://medium.com/@thedevankit',
  'https://thedevankit.medium.com/clean-architecture-123'
]
test_identifiers.each do |input|
  puts "Input: #{input.ljust(55)} -> Extracted: #{medium_adapter.extract_username(input)}"
end

puts "\n=================================================="
puts 'All local checks executed successfully!'
puts '=================================================='

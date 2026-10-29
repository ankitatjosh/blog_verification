# frozen_string_literal: true

require 'spec_helper'

RSpec.describe BlogVerification::Services::ValidationService do
  let(:service) { described_class.new }
  let(:base_request) do
    {
      'platform' => 'devto',
      'url' => 'https://dev.to/janedoe/building-a-rest-api-with-nodejs-123',
      'username' => 'janedoe',
      'publishedAt' => '2026-10-11',
      'tags' => %w[nodejs api express],
      'topic' => 'Backend Development',
      'summary' => 'A comprehensive guide to building clean, maintainable REST APIs with Node.js and Express.',
      'minWordCount' => 500,
      'referenceDate' => '2026-10-15'
    }
  end

  let(:base_metadata) do
    {
      'canonical_url' => 'https://dev.to/janedoe/building-a-rest-api-with-nodejs-123',
      'platform' => 'devto',
      'author' => { 'username' => 'janedoe', 'display_name' => 'Jane Doe' },
      'published_at' => '2026-10-11T18:30:00Z',
      'tags' => %w[nodejs api express],
      'description' => 'A comprehensive guide to building clean, maintainable REST APIs with Node.js and Express.',
      'word_count' => 840
    }
  end

  it 'AC-01: verifies a completely valid blog successfully' do
    res = service.evaluate(base_request, base_metadata)
    expect(res['status']).to eq('valid')
    expect(res['data']['checks']['url']['status']).to eq('passed')
    expect(res['data']['checks']['username']['status']).to eq('passed')
    expect(res['data']['checks']['publishedAt']['status']).to eq('passed')
    expect(res['data']['checks']['quarter']['status']).to eq('passed')
    expect(res['data']['checks']['tags']['status']).to eq('passed')
    expect(res['data']['checks']['topic']['status']).to eq('passed')
    expect(res['data']['checks']['summary']['status']).to eq('passed')
    expect(res['data']['checks']['contentLength']['status']).to eq('passed')
  end

  it 'AC-02: returns status invalid and AUTHOR_MISMATCH when author differs' do
    req = base_request.merge('username' => 'differentuser')
    res = service.evaluate(req, base_metadata)
    expect(res['status']).to eq('invalid')
    expect(res['data']['checks']['username']['status']).to eq('failed')
    expect(res['errors'].map { |e| e['code'] }).to include('AUTHOR_MISMATCH')
  end

  it 'AC-03: returns status invalid and PUBLICATION_DATE_MISMATCH when date differs' do
    req = base_request.merge('publishedAt' => '2026-10-12')
    res = service.evaluate(req, base_metadata)
    expect(res['status']).to eq('invalid')
    expect(res['data']['checks']['publishedAt']['status']).to eq('failed')
    expect(res['errors'].map { |e| e['code'] }).to include('PUBLICATION_DATE_MISMATCH')
  end

  it 'Quarter Check: fails when blog date is from another quarter' do
    # Blog published in Q1 (May 2026), current reference is Q3 (October 2026)
    req = base_request.merge('publishedAt' => '2026-05-15', 'referenceDate' => '2026-10-15')
    meta = base_metadata.merge('published_at' => '2026-05-15T12:00:00Z')
    res = service.evaluate(req, meta)
    expect(res['status']).to eq('invalid')
    expect(res['data']['checks']['quarter']['status']).to eq('failed')
    expect(res['data']['checks']['quarter']['blogQuarter']).to eq('April - June 2026')
    expect(res['data']['checks']['quarter']['currentQuarter']).to eq('October - December 2026')
    expect(res['errors'].map { |e| e['code'] }).to include('NOT_IN_CURRENT_QUARTER')
  end

  it 'Content Length Check: fails when blog word count is under 500' do
    meta = base_metadata.merge('word_count' => 120)
    res = service.evaluate(base_request, meta)
    expect(res['status']).to eq('invalid')
    expect(res['data']['checks']['contentLength']['status']).to eq('failed')
    expect(res['errors'].map { |e| e['code'] }).to include('INSUFFICIENT_CONTENT_LENGTH')
  end

  it 'AC-04: skips tag validation when tags omitted' do
    req = base_request.reject { |k| k == 'tags' }
    res = service.evaluate(req, base_metadata)
    expect(res['status']).to eq('valid')
    expect(res['data']['checks']['tags']['status']).to eq('skipped')
  end

  it 'AC-06: returns TAGS_MISMATCH when tags differ' do
    req = base_request.merge('tags' => %w[python django])
    res = service.evaluate(req, base_metadata)
    expect(res['status']).to eq('invalid')
    expect(res['data']['checks']['tags']['status']).to eq('failed')
    expect(res['errors'].map { |e| e['code'] }).to include('TAGS_MISMATCH')
  end

  it 'AC-08: returns TOPIC_MISMATCH when topic differs' do
    req = base_request.merge('topic' => 'Mobile Development')
    res = service.evaluate(req, base_metadata)
    expect(res['status']).to eq('invalid')
    expect(res['data']['checks']['topic']['status']).to eq('failed')
    expect(res['errors'].map { |e| e['code'] }).to include('TOPIC_MISMATCH')
  end

  it 'AC-09: returns SUMMARY_MISMATCH when summary differs' do
    req = base_request.merge('summary' => 'Incorrect and fabricated summary.')
    res = service.evaluate(req, base_metadata)
    expect(res['status']).to eq('invalid')
    expect(res['data']['checks']['summary']['status']).to eq('failed')
    expect(res['errors'].map { |e| e['code'] }).to include('SUMMARY_MISMATCH')
  end
end

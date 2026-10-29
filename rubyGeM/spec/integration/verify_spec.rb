# frozen_string_literal: true

require 'spec_helper'

RSpec.describe 'BlogVerification.verify End-to-End Integration' do
  let(:devto_fixture) { File.read(File.join(__dir__, '../fixtures/devto_article.json')) }
  let(:medium_fixture) { File.read(File.join(__dir__, '../fixtures/medium_html.html')) }

  describe 'DEV.to verification' do
    let(:url) { 'https://dev.to/janedoe/building-a-rest-api-with-nodejs-123' }

    before do
      stub_request(:get, 'https://dev.to/api/articles/janedoe/building-a-rest-api-with-nodejs-123')
        .to_return(status: 200, body: devto_fixture, headers: { 'Content-Type' => 'application/json' })
    end

    it 'verifies a valid DEV.to blog successfully' do
      result = BlogVerification.verify(
        platform: 'devto',
        url: url,
        username: 'janedoe',
        published_at: '2026-10-11',
        tags: %w[nodejs api express],
        topic: 'Backend Development',
        summary: 'A comprehensive guide to building clean, maintainable REST APIs with Node.js and Express.',
        min_word_count: 500,
        reference_date: '2026-10-15'
      )

      expect(result['success']).to be true
      expect(result['status']).to eq('valid')
      expect(result['data']['checks']['url']['status']).to eq('passed')
      expect(result['data']['checks']['username']['status']).to eq('passed')
      expect(result['data']['checks']['publishedAt']['status']).to eq('passed')
      expect(result['data']['checks']['quarter']['status']).to eq('passed')
      expect(result['data']['checks']['tags']['status']).to eq('passed')
      expect(result['data']['checks']['topic']['status']).to eq('passed')
      expect(result['data']['checks']['summary']['status']).to eq('passed')
      expect(result['data']['checks']['contentLength']['status']).to eq('passed')
      expect(result['data']['checks']['contentLength']['wordCount']).to be >= 500
    end

    it 'returns invalid when username does not match' do
      result = BlogVerification.verify(
        platform: 'devto',
        url: url,
        username: 'wrongauthor',
        published_at: '2026-10-11',
        topic: 'Backend Development',
        summary: 'A comprehensive guide to building clean, maintainable REST APIs with Node.js and Express.',
        reference_date: '2026-10-15'
      )

      expect(result['status']).to eq('invalid')
      expect(result['data']['checks']['username']['status']).to eq('failed')
      expect(result['errors'][0]['code']).to eq('AUTHOR_MISMATCH')
    end
  end

  describe 'Medium verification' do
    let(:url) { 'https://medium.com/@janedoe/building-a-rest-api-with-nodejs-7ca392289650' }

    before do
      stub_request(:get, url)
        .to_return(status: 200, body: medium_fixture, headers: { 'Content-Type' => 'text/html' })
    end

    it 'verifies a valid Medium blog successfully using JSON-LD author' do
      result = BlogVerification.verify(
        platform: 'medium',
        url: url,
        username: 'janedoe',
        published_at: '2026-10-11',
        tags: %w[nodejs api express],
        topic: 'Backend Development',
        summary: 'A comprehensive guide to building clean, maintainable REST APIs with Node.js and Express.',
        reference_date: '2026-10-15'
      )

      expect(result['success']).to be true
      expect(result['status']).to eq('valid')
      expect(result['data']['checks']['username']['status']).to eq('passed')
      expect(result['data']['checks']['quarter']['status']).to eq('passed')
    end
  end

  describe 'Input validation & error handling' do
    it 'returns error status when missing required fields' do
      result = BlogVerification.verify({})
      expect(result['success']).to be false
      expect(result['status']).to eq('error')
      codes = result['errors'].map { |e| e['code'] }
      expect(codes).to include('MISSING_REQUIRED_FIELD')
    end

    it 'returns error status for invalid platform' do
      result = BlogVerification.verify(
        platform: 'wordpress',
        url: 'https://dev.to/janedoe/article-123',
        username: 'janedoe',
        published_at: '2026-10-11',
        topic: 'Backend Development',
        summary: 'Summary'
      )
      expect(result['status']).to eq('error')
      expect(result['errors'][0]['code']).to eq('INVALID_PLATFORM')
    end

    it 'returns invalid status when article is 404 not found' do
      stub_request(:get, 'https://dev.to/api/articles/janedoe/not-found-123')
        .to_return(status: 404, body: 'Not Found')

      result = BlogVerification.verify(
        platform: 'devto',
        url: 'https://dev.to/janedoe/not-found-123',
        username: 'janedoe',
        published_at: '2026-10-11',
        topic: 'Backend Development',
        summary: 'Summary',
        reference_date: '2026-10-15'
      )

      expect(result['status']).to eq('invalid')
      expect(result['data']['checks']['url']['status']).to eq('failed')
      expect(result['errors'][0]['code']).to eq('ARTICLE_NOT_FOUND')
    end
  end
end

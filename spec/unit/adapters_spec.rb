# frozen_string_literal: true

require 'spec_helper'

RSpec.describe 'Platform Adapters' do
  let(:devto_fixture) { JSON.parse(File.read(File.join(__dir__, '../fixtures/devto_article.json'))) }
  let(:medium_fixture) { File.read(File.join(__dir__, '../fixtures/medium_html.html')) }

  describe BlogVerification::Adapters::DevtoAdapter do
    let(:adapter) { described_class.new }

    it 'builds the Forem API URL correctly' do
      url = 'https://dev.to/janedoe/building-a-rest-api-with-nodejs-123'
      expect(adapter.build_api_url(url)).to eq('https://dev.to/api/articles/janedoe/building-a-rest-api-with-nodejs-123')
    end

    it 'normalizes DEV.to API fixture correctly' do
      stub_request(:get, 'https://dev.to/api/articles/janedoe/building-a-rest-api-with-nodejs-123')
        .to_return(status: 200, body: devto_fixture.to_json, headers: { 'Content-Type' => 'application/json' })

      meta = adapter.get_article_metadata('https://dev.to/janedoe/building-a-rest-api-with-nodejs-123')
      expect(meta[:author][:username]).to eq('janedoe')
      expect(meta[:published_at]).to eq('2026-10-11T18:30:00Z')
      expect(meta[:tags]).to eq(%w[nodejs api express])
      expect(meta[:word_count]).to be >= 500
    end

    it 'maps 404 response to ARTICLE_NOT_FOUND' do
      stub_request(:get, 'https://dev.to/api/articles/janedoe/non-existent-123')
        .to_return(status: 404, body: '{"error": "not found"}')

      expect do
        adapter.get_article_metadata('https://dev.to/janedoe/non-existent-123')
      end.to raise_error do |err|
        expect(err.error_code).to eq(BlogVerification::ErrorCodes::ARTICLE_NOT_FOUND)
      end
    end
  end

  describe BlogVerification::Adapters::MediumAdapter do
    let(:adapter) { described_class.new }

    it 'extracts username from bare identifier, @username, and subdomain' do
      expect(adapter.extract_username('thedevankit')).to eq('thedevankit')
      expect(adapter.extract_username('@thedevankit')).to eq('thedevankit')
      expect(adapter.extract_username('https://medium.com/@thedevankit')).to eq('thedevankit')
      expect(adapter.extract_username('https://thedevankit.medium.com/some-post-123')).to eq('thedevankit')
    end

    it 'normalizes Medium HTML fixture with JSON-LD author correctly' do
      url = 'https://medium.com/@janedoe/building-a-rest-api-with-nodejs-7ca392289650'
      stub_request(:get, url)
        .to_return(status: 200, body: medium_fixture, headers: { 'Content-Type' => 'text/html' })

      meta = adapter.get_article_metadata(url)
      expect(meta[:author][:username]).to eq('janedoe')
      expect(meta[:published_at]).to eq('2026-10-11T23:45:00.000Z')
      expect(meta[:tags]).to eq(%w[nodejs api express])
      expect(meta[:word_count]).to be >= 500
    end
  end
end

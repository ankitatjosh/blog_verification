# frozen_string_literal: true

require 'spec_helper'

RSpec.describe BlogVerification::Utils::Normalizer do
  describe '.normalize_username' do
    it 'trims whitespace and converts to lowercase' do
      expect(described_class.normalize_username('  JaneDoe  ')).to eq('janedoe')
    end

    it 'removes leading @ prefix' do
      expect(described_class.normalize_username('@thedevankit')).to eq('thedevankit')
      expect(described_class.normalize_username('  @TheDevAnkit  ')).to eq('thedevankit')
    end
  end

  describe '.normalize_tags' do
    it 'lowercases, strips whitespace, removes duplicates, and sorts' do
      raw = ['  NodeJS ', 'api', 'NodeJs', 'Express', '   ']
      expect(described_class.normalize_tags(raw)).to eq(%w[api express nodejs])
    end
  end

  describe '.compare_tag_sets' do
    it 'returns match: true regardless of order or case' do
      res = described_class.compare_tag_sets(%w[nodejs express api], %w[API NodeJs Express])
      expect(res[:match]).to be true
    end

    it 'returns match: false when tags differ' do
      res = described_class.compare_tag_sets(%w[nodejs express], %w[nodejs fastify])
      expect(res[:match]).to be false
    end
  end

  describe '.normalize_summary' do
    it 'strips HTML tags, decodes entities, collapses whitespace, and lowercases' do
      html = '<p>A <strong>guide</strong> &amp; tutorial to building APIs&#39;.</p>'
      expect(described_class.normalize_summary(html)).to eq("a guide & tutorial to building apis'.")
    end
  end

  describe '.count_words' do
    it 'accurately counts words after stripping HTML and decoding entities' do
      html = '<article><h1>Title Here</h1><p>Hello &amp; welcome to the <strong>blog post</strong></p></article>'
      expect(described_class.count_words(html)).to eq(9)
    end

    it 'returns 0 for empty or nil text' do
      expect(described_class.count_words('')).to eq(0)
      expect(described_class.count_words(nil)).to eq(0)
    end
  end
end

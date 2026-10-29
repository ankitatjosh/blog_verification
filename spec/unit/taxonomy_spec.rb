# frozen_string_literal: true

require 'spec_helper'

RSpec.describe BlogVerification::Taxonomy do
  describe '.resolve_canonical_topic' do
    it 'maps synonyms and aliases to canonical taxonomy' do
      expect(described_class.resolve_canonical_topic('backend')).to eq('Backend Development')
      expect(described_class.resolve_canonical_topic('frontend')).to eq('Frontend Development')
      expect(described_class.resolve_canonical_topic('ai')).to eq('Artificial Intelligence & Machine Learning')
      expect(described_class.resolve_canonical_topic('devops & cloud')).to eq('DevOps & Cloud')
    end
  end

  describe '.derive_topic_from_metadata' do
    it 'derives topic from tags mapping' do
      meta = { 'tags' => %w[nodejs express api] }
      expect(described_class.derive_topic_from_metadata(meta)).to eq('Backend Development')
    end

    it 'derives topic from authoritative topic field' do
      meta = { 'topic' => 'frontend' }
      expect(described_class.derive_topic_from_metadata(meta)).to eq('Frontend Development')
    end
  end

  describe '.compare_topics' do
    it 'matches equal canonical topics' do
      expect(described_class.compare_topics('Backend Development', 'Backend Development')).to be true
    end

    it 'matches alias with canonical topic' do
      expect(described_class.compare_topics('backend', 'Backend Development')).to be true
      expect(described_class.compare_topics('Backend Development', 'backend')).to be true
    end

    it 'returns false for mismatched topics' do
      expect(described_class.compare_topics('Mobile Development', 'Backend Development')).to be false
    end
  end
end

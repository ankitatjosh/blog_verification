# frozen_string_literal: true

require 'spec_helper'

RSpec.describe BlogVerification::Utils::UrlSecurity do
  describe '.ip_address_safe?' do
    it 'identifies public unicast IP addresses as safe' do
      expect(described_class.ip_address_safe?('8.8.8.8')).to be true
      expect(described_class.ip_address_safe?('1.1.1.1')).to be true
      expect(described_class.ip_address_safe?('151.101.1.67')).to be true
    end

    it 'identifies private, loopback, and restricted IPv4 addresses as prohibited' do
      expect(described_class.ip_address_safe?('127.0.0.1')).to be false
      expect(described_class.ip_address_safe?('10.0.0.1')).to be false
      expect(described_class.ip_address_safe?('172.16.0.1')).to be false
      expect(described_class.ip_address_safe?('192.168.1.1')).to be false
      expect(described_class.ip_address_safe?('169.254.169.254')).to be false
      expect(described_class.ip_address_safe?('0.0.0.0')).to be false
    end

    it 'identifies loopback and local IPv6 addresses as prohibited' do
      expect(described_class.ip_address_safe?('::1')).to be false
      expect(described_class.ip_address_safe?('fe80::1')).to be false
      expect(described_class.ip_address_safe?('fc00::1')).to be false
    end
  end

  describe '.host_allowed_for_platform?' do
    it 'allows official dev.to domains' do
      expect(described_class.host_allowed_for_platform?('dev.to', 'devto')).to be true
      expect(described_class.host_allowed_for_platform?('www.dev.to', 'devto')).to be true
      expect(described_class.host_allowed_for_platform?('evil.com', 'devto')).to be false
    end

    it 'allows medium.com and user subdomains' do
      expect(described_class.host_allowed_for_platform?('medium.com', 'medium')).to be true
      expect(described_class.host_allowed_for_platform?('thedevankit.medium.com', 'medium')).to be true
      expect(described_class.host_allowed_for_platform?('evil.com', 'medium')).to be false
    end
  end

  describe '.validate_article_url' do
    it 'accepts valid DEV.to article URLs' do
      uri = described_class.validate_article_url('https://dev.to/janedoe/building-a-rest-api-123', 'devto')
      expect(uri.host).to eq('dev.to')
    end

    it 'accepts valid Medium article URLs' do
      uri = described_class.validate_article_url('https://medium.com/@janedoe/building-a-rest-api-123', 'medium')
      expect(uri.host).to eq('medium.com')
    end

    it 'rejects a bare homepage URL' do
      expect do
        described_class.validate_article_url('https://dev.to', 'devto')
      end.to raise_error(BlogVerification::ValidationError)
    end

    it 'rejects a DEV.to profile-only URL (no article slug)' do
      expect do
        described_class.validate_article_url('https://dev.to/janedoe', 'devto')
      end.to raise_error(BlogVerification::ValidationError)
    end

    it 'rejects a Medium profile-only URL (no article slug)' do
      expect do
        described_class.validate_article_url('https://medium.com/@janedoe', 'medium')
      end.to raise_error(BlogVerification::ValidationError)
    end
  end
end

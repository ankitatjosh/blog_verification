# frozen_string_literal: true

require 'spec_helper'

RSpec.describe BlogVerification::Utils::DateHelper do
  describe '.valid_calendar_date?' do
    it 'accepts valid calendar dates' do
      expect(described_class.valid_calendar_date?('2026-09-15')).to be true
      expect(described_class.valid_calendar_date?('2024-02-29')).to be true # Leap year
      expect(described_class.valid_calendar_date?('2026-12-31')).to be true
      expect(described_class.valid_calendar_date?('2026-04-30')).to be true
    end

    it 'rejects impossible or non-calendar dates' do
      expect(described_class.valid_calendar_date?('2026-02-29')).to be false # Not leap year
      expect(described_class.valid_calendar_date?('2026-04-31')).to be false # April has 30 days
      expect(described_class.valid_calendar_date?('2026-13-01')).to be false # Month 13
      expect(described_class.valid_calendar_date?('2026-00-10')).to be false
      expect(described_class.valid_calendar_date?('2026-01-32')).to be false
      expect(described_class.valid_calendar_date?('invalid-date')).to be false
      expect(described_class.valid_calendar_date?(nil)).to be false
    end
  end

  describe '.normalize_utc_date' do
    it 'normalizes valid YYYY-MM-DD directly' do
      expect(described_class.normalize_utc_date('2026-09-15')).to eq('2026-09-15')
    end

    it 'normalizes ISO-8601 UTC timestamp to UTC calendar date' do
      expect(described_class.normalize_utc_date('2026-09-15T18:30:00Z')).to eq('2026-09-15')
      expect(described_class.normalize_utc_date('2026-09-15T23:59:59Z')).to eq('2026-09-15')
    end

    it 'correctly converts offset timestamp across UTC midnight boundary' do
      # 2026-09-16 01:30:00 at UTC+2 is 2026-09-15 23:30:00 UTC
      expect(described_class.normalize_utc_date('2026-09-16T01:30:00+02:00')).to eq('2026-09-15')
    end
  end

  describe '.compare_calendar_dates' do
    it 'returns match: true when dates match in UTC' do
      res = described_class.compare_calendar_dates('2026-10-11', '2026-10-11T12:00:00Z')
      expect(res[:match]).to be true
      expect(res[:normalized_actual]).to eq('2026-10-11')
    end

    it 'returns match: false when dates differ' do
      res = described_class.compare_calendar_dates('2026-10-11', '2026-10-12T12:00:00Z')
      expect(res[:match]).to be false
      expect(res[:normalized_actual]).to eq('2026-10-12')
    end
  end

  describe '.get_quarter_info' do
    it 'maps April-June to Quarter 1' do
      q = described_class.get_quarter_info('2026-05-15')
      expect(q[:quarter_number]).to eq(1)
      expect(q[:quarter_name]).to eq('April - June')
      expect(q[:year]).to eq(2026)
      expect(q[:label]).to eq('April - June 2026')
      expect(q[:start_date]).to eq('2026-04-01')
      expect(q[:end_date]).to eq('2026-06-30')
    end

    it 'maps July-September to Quarter 2' do
      q = described_class.get_quarter_info('2026-08-10')
      expect(q[:quarter_number]).to eq(2)
      expect(q[:quarter_name]).to eq('July - September')
      expect(q[:year]).to eq(2026)
      expect(q[:label]).to eq('July - September 2026')
    end

    it 'maps October-December to Quarter 3' do
      q = described_class.get_quarter_info('2026-10-15')
      expect(q[:quarter_number]).to eq(3)
      expect(q[:quarter_name]).to eq('October - December')
      expect(q[:year]).to eq(2026)
      expect(q[:label]).to eq('October - December 2026')
    end

    it 'maps January-March to Quarter 4' do
      q = described_class.get_quarter_info('2026-02-20')
      expect(q[:quarter_number]).to eq(4)
      expect(q[:quarter_name]).to eq('January - March')
      expect(q[:year]).to eq(2026)
      expect(q[:label]).to eq('January - March 2026')
    end
  end

  describe '.date_in_current_quarter?' do
    it 'returns in_current_quarter: true when blog date is in reference quarter' do
      res = described_class.date_in_current_quarter?('2026-10-11', '2026-11-01')
      expect(res[:in_current_quarter]).to be true
      expect(res[:blog_quarter][:label]).to eq('October - December 2026')
      expect(res[:current_quarter][:label]).to eq('October - December 2026')
    end

    it 'returns in_current_quarter: false when blog date is in an earlier quarter' do
      res = described_class.date_in_current_quarter?('2026-05-15', '2026-10-15')
      expect(res[:in_current_quarter]).to be false
      expect(res[:blog_quarter][:quarter_number]).to eq(1)
      expect(res[:current_quarter][:quarter_number]).to eq(3)
    end
  end
end

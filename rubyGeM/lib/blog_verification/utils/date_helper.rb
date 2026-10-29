# frozen_string_literal: true

require 'date'
require 'time'

module BlogVerification
  module Utils
    module DateHelper
      DATE_REGEX = /\A\d{4}-\d{2}-\d{2}\z/.freeze

      class << self
        # Validates that a string is strictly in YYYY-MM-DD format and represents a valid calendar day
        def valid_calendar_date?(str)
          return false unless str.is_a?(String)
          return false unless str.match?(DATE_REGEX)

          parts = str.split('-').map(&:to_i)
          year, month, day = parts[0], parts[1], parts[2]

          return false if year < 1000 || year > 9999
          return false if month < 1 || month > 12

          days_in_month = days_in_month_for(year, month)
          day >= 1 && day <= days_in_month
        end

        def days_in_month_for(year, month)
          case month
          when 1, 3, 5, 7, 8, 10, 12 then 31
          when 4, 6, 9, 11 then 30
          when 2
            leap_year?(year) ? 29 : 28
          else
            0
          end
        end

        def leap_year?(year)
          (year % 4).zero? && ((year % 100) != 0 || (year % 400).zero?)
        end

        # Normalizes any date input into a YYYY-MM-DD UTC calendar date string
        def normalize_utc_date(date_input)
          return nil if date_input.nil?

          if date_input.is_a?(String)
            # If already YYYY-MM-DD and valid, return as is
            return date_input if valid_calendar_date?(date_input)

            # Try parsing ISO 8601 or RFC timestamps
            begin
              parsed_time = Time.parse(date_input).utc
              return parsed_time.strftime('%Y-%m-%d')
            rescue ArgumentError
              return nil
            end
          elsif date_input.is_a?(Time)
            date_input.utc.strftime('%Y-%m-%d')
          elsif date_input.is_a?(Date)
            date_input.strftime('%Y-%m-%d')
          elsif date_input.is_a?(Numeric)
            # Handle milliseconds vs seconds
            sec = date_input < 1e11 ? date_input : (date_input / 1000.0)
            Time.at(sec).utc.strftime('%Y-%m-%d')
          end
        end

        # Compares expected YYYY-MM-DD calendar date with actual date input
        def compare_calendar_dates(expected_date, actual_date_input)
          normalized_actual = normalize_utc_date(actual_date_input)
          return { match: false, normalized_actual: nil } if normalized_actual.nil?

          {
            match: expected_date == normalized_actual,
            normalized_actual: normalized_actual
          }
        end

        # Returns quarter details for any date or timestamp in UTC
        # Schedule:
        # - Quarter 1: 1st April to June (months 4, 5, 6)
        # - Quarter 2: 1st July to September (months 7, 8, 9)
        # - Quarter 3: 1st October to December (months 10, 11, 12)
        # - Quarter 4: 1st January to March (months 1, 2, 3)
        def get_quarter_info(date_input)
          return nil if date_input.nil?

          parsed_time = nil
          if date_input.is_a?(Time)
            parsed_time = date_input.utc
          elsif date_input.is_a?(Date)
            parsed_time = Time.utc(date_input.year, date_input.month, date_input.day)
          elsif date_input.is_a?(String)
            if valid_calendar_date?(date_input)
              parts = date_input.split('-').map(&:to_i)
              parsed_time = Time.utc(parts[0], parts[1], parts[2])
            else
              begin
                parsed_time = Time.parse(date_input).utc
              rescue ArgumentError
                return nil
              end
            end
          elsif date_input.is_a?(Numeric)
            sec = date_input < 1e11 ? date_input : (date_input / 1000.0)
            parsed_time = Time.at(sec).utc
          else
            return nil
          end

          y = parsed_time.year
          m = parsed_time.month

          case m
          when 4..6
            q_num = 1
            q_name = 'April - June'
            s_date = format('%04d-04-01', y)
            e_date = format('%04d-06-30', y)
          when 7..9
            q_num = 2
            q_name = 'July - September'
            s_date = format('%04d-07-01', y)
            e_date = format('%04d-09-30', y)
          when 10..12
            q_num = 3
            q_name = 'October - December'
            s_date = format('%04d-10-01', y)
            e_date = format('%04d-12-31', y)
          when 1..3
            q_num = 4
            q_name = 'January - March'
            s_date = format('%04d-01-01', y)
            e_date = format('%04d-03-31', y)
          end

          {
            quarter_number: q_num,
            quarter_name: q_name,
            year: y,
            label: "#{q_name} #{y}",
            start_date: s_date,
            end_date: e_date
          }
        end

        # Verifies whether blog creation date falls in the current quarter
        def date_in_current_quarter?(blog_date, reference_date = nil)
          blog_quarter = get_quarter_info(blog_date)
          current_quarter = get_quarter_info(reference_date || Time.now.utc)

          return { in_current_quarter: false, blog_quarter: nil, current_quarter: current_quarter } if blog_quarter.nil?
          return { in_current_quarter: false, blog_quarter: blog_quarter, current_quarter: nil } if current_quarter.nil?

          in_current = (blog_quarter[:quarter_number] == current_quarter[:quarter_number]) &&
                       (blog_quarter[:year] == current_quarter[:year])

          {
            in_current_quarter: in_current,
            blog_quarter: blog_quarter,
            current_quarter: current_quarter
          }
        end
      end
    end
  end
end

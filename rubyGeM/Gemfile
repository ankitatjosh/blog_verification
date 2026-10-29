# frozen_string_literal: true

source 'https://rubygems.org'

# Pin default pre-installed gem versions to avoid needing MSYS2 C compiler on Windows
gem 'bigdecimal', '3.1.3'
gem 'racc', '1.6.2'
gem 'nokogiri', '1.19.4'

gemspec

# Local development dependencies
group :development, :test do
  gem 'rake', '~> 13.0'
  gem 'rspec', '~> 3.12'
  gem 'webmock', '~> 3.18'
end

# frozen_string_literal: true

require 'blog_verification'
require 'webmock/rspec'
require 'json'

WebMock.disable_net_connect!(allow_localhost: true)

RSpec.configure do |config|
  config.example_status_persistence_file_path = '.rspec_status'
  config.disable_monkey_patching!

  config.expect_with :rspec do |c|
    c.syntax = :expect
  end

  config.before(:each) do
    BlogVerification.reset_configuration!
    BlogVerification.configuration.skip_dns_check = true
  end
end

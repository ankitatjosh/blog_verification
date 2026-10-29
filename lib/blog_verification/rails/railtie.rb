# frozen_string_literal: true

module BlogVerification
  module Rails
    class Railtie < ::Rails::Railtie
      initializer 'blog_verification.active_model_validator' do
        ::ActiveSupport.on_load(:active_record) do
          require_relative 'validator'
        end
      end
    end
  end
end

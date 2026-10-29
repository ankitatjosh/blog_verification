# frozen_string_literal: true

require_relative 'lib/blog_verification/version'

Gem::Specification.new do |spec|
  spec.name          = 'blog_verification'
  spec.version       = BlogVerification::VERSION
  spec.authors       = ['Ankitkumar Singh (thedevankit)']
  spec.email         = ['thedevankit@gmail.com']

  spec.summary       = 'Lightweight blog verification library for Medium and DEV Community'
  spec.description   = 'Verifies whether a submitted blog URL belongs to the claimed author, matches publication date and quarter, meets minimum word length, and matches expected topic and summary metadata.'
  spec.homepage      = 'https://github.com/thedevankit/blog_verification'
  spec.license       = 'MIT'
  spec.required_ruby_version = '>= 2.7.8'

  spec.metadata['homepage_uri'] = spec.homepage
  spec.metadata['source_code_uri'] = spec.homepage
  spec.metadata['changelog_uri'] = "#{spec.homepage}/blob/main/CHANGELOG.md"

  # Specify which files should be added to the gem when it is released.
  spec.files = Dir.chdir(File.expand_path(__dir__)) do
    Dir.glob('lib/**/*', File::FNM_DOTMATCH).reject { |f| File.directory?(f) } +
      %w[LICENSE.txt README.md blog_verification.gemspec]
  end

  spec.bindir        = 'exe'
  spec.executables   = spec.files.grep(%r{\Aexe/}) { |f| File.basename(f) }
  spec.require_paths = ['lib']

  # Runtime dependencies
  # nokogiri is used for robust HTML / JSON-LD parsing; supported on Ruby >= 2.7.8
  spec.add_dependency 'nokogiri', '>= 1.13.0', '< 2.0'

  # Development dependencies
  spec.add_development_dependency 'bundler', '~> 2.1'
  spec.add_development_dependency 'rake', '~> 13.0'
  spec.add_development_dependency 'rspec', '~> 3.12'
  spec.add_development_dependency 'webmock', '~> 3.18'
end

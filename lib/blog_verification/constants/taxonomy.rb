# frozen_string_literal: true

module BlogVerification
  module Taxonomy
    CANONICAL_TOPICS = {
      BACKEND_DEVELOPMENT: 'Backend Development',
      FRONTEND_DEVELOPMENT: 'Frontend Development',
      FULL_STACK_DEVELOPMENT: 'Full Stack Development',
      DEVOPS_CLOUD: 'DevOps & Cloud',
      AI_MACHINE_LEARNING: 'Artificial Intelligence & Machine Learning',
      MOBILE_DEVELOPMENT: 'Mobile Development',
      CYBERSECURITY: 'Cybersecurity',
      DATABASE_DATA_ENGINEERING: 'Database & Data Engineering',
      SOFTWARE_ARCHITECTURE: 'Software Architecture & Design',
      PROGRAMMING_LANGUAGES: 'Programming Languages',
      TESTING_QA: 'Testing & Quality Assurance',
      WEB_DEVELOPMENT: 'Web Development'
    }.freeze

    # Aliases and tag keywords mapped deterministically to canonical topics
    TAG_TO_TOPIC_MAP = {
      # Backend Development
      'nodejs' => CANONICAL_TOPICS[:BACKEND_DEVELOPMENT],
      'node' => CANONICAL_TOPICS[:BACKEND_DEVELOPMENT],
      'express' => CANONICAL_TOPICS[:BACKEND_DEVELOPMENT],
      'expressjs' => CANONICAL_TOPICS[:BACKEND_DEVELOPMENT],
      'api' => CANONICAL_TOPICS[:BACKEND_DEVELOPMENT],
      'rest-api' => CANONICAL_TOPICS[:BACKEND_DEVELOPMENT],
      'rest' => CANONICAL_TOPICS[:BACKEND_DEVELOPMENT],
      'backend' => CANONICAL_TOPICS[:BACKEND_DEVELOPMENT],
      'fastapi' => CANONICAL_TOPICS[:BACKEND_DEVELOPMENT],
      'django' => CANONICAL_TOPICS[:BACKEND_DEVELOPMENT],
      'flask' => CANONICAL_TOPICS[:BACKEND_DEVELOPMENT],
      'spring' => CANONICAL_TOPICS[:BACKEND_DEVELOPMENT],
      'springboot' => CANONICAL_TOPICS[:BACKEND_DEVELOPMENT],
      'nestjs' => CANONICAL_TOPICS[:BACKEND_DEVELOPMENT],
      'graphql' => CANONICAL_TOPICS[:BACKEND_DEVELOPMENT],
      'microservices' => CANONICAL_TOPICS[:BACKEND_DEVELOPMENT],
      'rails' => CANONICAL_TOPICS[:BACKEND_DEVELOPMENT],
      'ruby-on-rails' => CANONICAL_TOPICS[:BACKEND_DEVELOPMENT],

      # Frontend Development
      'frontend' => CANONICAL_TOPICS[:FRONTEND_DEVELOPMENT],
      'react' => CANONICAL_TOPICS[:FRONTEND_DEVELOPMENT],
      'reactjs' => CANONICAL_TOPICS[:FRONTEND_DEVELOPMENT],
      'vue' => CANONICAL_TOPICS[:FRONTEND_DEVELOPMENT],
      'vuejs' => CANONICAL_TOPICS[:FRONTEND_DEVELOPMENT],
      'angular' => CANONICAL_TOPICS[:FRONTEND_DEVELOPMENT],
      'svelte' => CANONICAL_TOPICS[:FRONTEND_DEVELOPMENT],
      'css' => CANONICAL_TOPICS[:FRONTEND_DEVELOPMENT],
      'html' => CANONICAL_TOPICS[:FRONTEND_DEVELOPMENT],
      'tailwind' => CANONICAL_TOPICS[:FRONTEND_DEVELOPMENT],
      'nextjs' => CANONICAL_TOPICS[:FRONTEND_DEVELOPMENT],

      # DevOps & Cloud
      'devops' => CANONICAL_TOPICS[:DEVOPS_CLOUD],
      'cloud' => CANONICAL_TOPICS[:DEVOPS_CLOUD],
      'aws' => CANONICAL_TOPICS[:DEVOPS_CLOUD],
      'gcp' => CANONICAL_TOPICS[:DEVOPS_CLOUD],
      'azure' => CANONICAL_TOPICS[:DEVOPS_CLOUD],
      'docker' => CANONICAL_TOPICS[:DEVOPS_CLOUD],
      'kubernetes' => CANONICAL_TOPICS[:DEVOPS_CLOUD],
      'k8s' => CANONICAL_TOPICS[:DEVOPS_CLOUD],
      'ci-cd' => CANONICAL_TOPICS[:DEVOPS_CLOUD],
      'cicd' => CANONICAL_TOPICS[:DEVOPS_CLOUD],
      'terraform' => CANONICAL_TOPICS[:DEVOPS_CLOUD],

      # AI & Machine Learning
      'ai' => CANONICAL_TOPICS[:AI_MACHINE_LEARNING],
      'artificial-intelligence' => CANONICAL_TOPICS[:AI_MACHINE_LEARNING],
      'machine-learning' => CANONICAL_TOPICS[:AI_MACHINE_LEARNING],
      'ml' => CANONICAL_TOPICS[:AI_MACHINE_LEARNING],
      'deep-learning' => CANONICAL_TOPICS[:AI_MACHINE_LEARNING],
      'llm' => CANONICAL_TOPICS[:AI_MACHINE_LEARNING],
      'datascience' => CANONICAL_TOPICS[:AI_MACHINE_LEARNING],
      'data-science' => CANONICAL_TOPICS[:AI_MACHINE_LEARNING],
      'nlp' => CANONICAL_TOPICS[:AI_MACHINE_LEARNING],
      'prompt-engineering' => CANONICAL_TOPICS[:AI_MACHINE_LEARNING],

      # Mobile Development
      'mobile' => CANONICAL_TOPICS[:MOBILE_DEVELOPMENT],
      'android' => CANONICAL_TOPICS[:MOBILE_DEVELOPMENT],
      'ios' => CANONICAL_TOPICS[:MOBILE_DEVELOPMENT],
      'flutter' => CANONICAL_TOPICS[:MOBILE_DEVELOPMENT],
      'react-native' => CANONICAL_TOPICS[:MOBILE_DEVELOPMENT],
      'swift' => CANONICAL_TOPICS[:MOBILE_DEVELOPMENT],
      'kotlin' => CANONICAL_TOPICS[:MOBILE_DEVELOPMENT],

      # Cybersecurity
      'security' => CANONICAL_TOPICS[:CYBERSECURITY],
      'cybersecurity' => CANONICAL_TOPICS[:CYBERSECURITY],
      'infosec' => CANONICAL_TOPICS[:CYBERSECURITY],
      'auth' => CANONICAL_TOPICS[:CYBERSECURITY],
      'authentication' => CANONICAL_TOPICS[:CYBERSECURITY],
      'oauth' => CANONICAL_TOPICS[:CYBERSECURITY],
      'jwt' => CANONICAL_TOPICS[:CYBERSECURITY],
      'cryptography' => CANONICAL_TOPICS[:CYBERSECURITY],

      # Database & Data Engineering
      'database' => CANONICAL_TOPICS[:DATABASE_DATA_ENGINEERING],
      'databases' => CANONICAL_TOPICS[:DATABASE_DATA_ENGINEERING],
      'sql' => CANONICAL_TOPICS[:DATABASE_DATA_ENGINEERING],
      'postgresql' => CANONICAL_TOPICS[:DATABASE_DATA_ENGINEERING],
      'postgres' => CANONICAL_TOPICS[:DATABASE_DATA_ENGINEERING],
      'mysql' => CANONICAL_TOPICS[:DATABASE_DATA_ENGINEERING],
      'mongodb' => CANONICAL_TOPICS[:DATABASE_DATA_ENGINEERING],
      'nosql' => CANONICAL_TOPICS[:DATABASE_DATA_ENGINEERING],
      'redis' => CANONICAL_TOPICS[:DATABASE_DATA_ENGINEERING],

      # Software Architecture & Design
      'architecture' => CANONICAL_TOPICS[:SOFTWARE_ARCHITECTURE],
      'system-design' => CANONICAL_TOPICS[:SOFTWARE_ARCHITECTURE],
      'design-patterns' => CANONICAL_TOPICS[:SOFTWARE_ARCHITECTURE],
      'software-architecture' => CANONICAL_TOPICS[:SOFTWARE_ARCHITECTURE],
      'unix' => CANONICAL_TOPICS[:SOFTWARE_ARCHITECTURE],

      # Programming Languages
      'programming' => CANONICAL_TOPICS[:PROGRAMMING_LANGUAGES],
      'javascript' => CANONICAL_TOPICS[:PROGRAMMING_LANGUAGES],
      'typescript' => CANONICAL_TOPICS[:PROGRAMMING_LANGUAGES],
      'python' => CANONICAL_TOPICS[:PROGRAMMING_LANGUAGES],
      'ruby' => CANONICAL_TOPICS[:PROGRAMMING_LANGUAGES],
      'rust' => CANONICAL_TOPICS[:PROGRAMMING_LANGUAGES],
      'golang' => CANONICAL_TOPICS[:PROGRAMMING_LANGUAGES],
      'go' => CANONICAL_TOPICS[:PROGRAMMING_LANGUAGES],
      'java' => CANONICAL_TOPICS[:PROGRAMMING_LANGUAGES],
      'csharp' => CANONICAL_TOPICS[:PROGRAMMING_LANGUAGES],
      'cpp' => CANONICAL_TOPICS[:PROGRAMMING_LANGUAGES],

      # Testing & QA
      'testing' => CANONICAL_TOPICS[:TESTING_QA],
      'qa' => CANONICAL_TOPICS[:TESTING_QA],
      'unit-testing' => CANONICAL_TOPICS[:TESTING_QA],
      'jest' => CANONICAL_TOPICS[:TESTING_QA],
      'cypress' => CANONICAL_TOPICS[:TESTING_QA],
      'rspec' => CANONICAL_TOPICS[:TESTING_QA],

      # Web Development
      'webdev' => CANONICAL_TOPICS[:WEB_DEVELOPMENT],
      'web-development' => CANONICAL_TOPICS[:WEB_DEVELOPMENT]
    }.freeze

    # Aliases for topic names to canonical names
    TOPIC_SYNONYMS = {
      'backend' => CANONICAL_TOPICS[:BACKEND_DEVELOPMENT],
      'backend development' => CANONICAL_TOPICS[:BACKEND_DEVELOPMENT],
      'frontend' => CANONICAL_TOPICS[:FRONTEND_DEVELOPMENT],
      'frontend development' => CANONICAL_TOPICS[:FRONTEND_DEVELOPMENT],
      'fullstack' => CANONICAL_TOPICS[:FULL_STACK_DEVELOPMENT],
      'full stack' => CANONICAL_TOPICS[:FULL_STACK_DEVELOPMENT],
      'full stack development' => CANONICAL_TOPICS[:FULL_STACK_DEVELOPMENT],
      'devops' => CANONICAL_TOPICS[:DEVOPS_CLOUD],
      'devops & cloud' => CANONICAL_TOPICS[:DEVOPS_CLOUD],
      'cloud' => CANONICAL_TOPICS[:DEVOPS_CLOUD],
      'ai' => CANONICAL_TOPICS[:AI_MACHINE_LEARNING],
      'machine learning' => CANONICAL_TOPICS[:AI_MACHINE_LEARNING],
      'ai & machine learning' => CANONICAL_TOPICS[:AI_MACHINE_LEARNING],
      'artificial intelligence' => CANONICAL_TOPICS[:AI_MACHINE_LEARNING],
      'artificial intelligence & machine learning' => CANONICAL_TOPICS[:AI_MACHINE_LEARNING],
      'data science & ai' => CANONICAL_TOPICS[:AI_MACHINE_LEARNING],
      'mobile' => CANONICAL_TOPICS[:MOBILE_DEVELOPMENT],
      'mobile development' => CANONICAL_TOPICS[:MOBILE_DEVELOPMENT],
      'security' => CANONICAL_TOPICS[:CYBERSECURITY],
      'cybersecurity' => CANONICAL_TOPICS[:CYBERSECURITY],
      'database' => CANONICAL_TOPICS[:DATABASE_DATA_ENGINEERING],
      'database & data engineering' => CANONICAL_TOPICS[:DATABASE_DATA_ENGINEERING],
      'architecture' => CANONICAL_TOPICS[:SOFTWARE_ARCHITECTURE],
      'software architecture' => CANONICAL_TOPICS[:SOFTWARE_ARCHITECTURE],
      'software architecture & design' => CANONICAL_TOPICS[:SOFTWARE_ARCHITECTURE],
      'programming' => CANONICAL_TOPICS[:PROGRAMMING_LANGUAGES],
      'programming languages' => CANONICAL_TOPICS[:PROGRAMMING_LANGUAGES],
      'testing' => CANONICAL_TOPICS[:TESTING_QA],
      'testing & qa' => CANONICAL_TOPICS[:TESTING_QA],
      'testing & quality assurance' => CANONICAL_TOPICS[:TESTING_QA],
      'webdev' => CANONICAL_TOPICS[:WEB_DEVELOPMENT],
      'web development' => CANONICAL_TOPICS[:WEB_DEVELOPMENT]
    }.freeze

    class << self
      def normalize_topic_string(str)
        return '' unless str.is_a?(String)

        str.strip.downcase.gsub(/\s+/, ' ')
      end

      def resolve_canonical_topic(topic_str)
        normalized = normalize_topic_string(topic_str)
        return nil if normalized.empty?

        TOPIC_SYNONYMS[normalized]
      end

      def derive_topic_from_metadata(metadata)
        return nil unless metadata.is_a?(Hash)

        # 1. Authoritative topic/category if present
        topic_val = metadata[:topic] || metadata['topic']
        if topic_val && !topic_val.to_s.strip.empty?
          canonical = resolve_canonical_topic(topic_val.to_s)
          return canonical || topic_val.to_s.strip
        end

        # 2. Derive from tags
        tags = metadata[:tags] || metadata['tags']
        return nil unless tags.is_a?(Array) && !tags.empty?

        topic_counts = Hash.new(0)
        tags.each do |tag|
          norm_tag = tag.to_s.strip.downcase
          mapped = TAG_TO_TOPIC_MAP[norm_tag]
          topic_counts[mapped] += 1 if mapped
        end

        return nil if topic_counts.empty?

        # Pick topic with most occurrences (or first on tie)
        sorted = topic_counts.sort_by { |_topic, count| -count }
        sorted.first[0]
      end

      def compare_topics(expected_topic, verified_topic)
        return false if expected_topic.nil? || verified_topic.nil?

        norm_expected = normalize_topic_string(expected_topic.to_s)
        norm_verified = normalize_topic_string(verified_topic.to_s)

        return true if norm_expected == norm_verified

        canonical_expected = resolve_canonical_topic(expected_topic.to_s)
        canonical_verified = resolve_canonical_topic(verified_topic.to_s)

        if canonical_expected && canonical_verified && canonical_expected == canonical_verified
          return true
        end

        if canonical_expected && normalize_topic_string(canonical_expected) == norm_verified
          return true
        end

        if canonical_verified && normalize_topic_string(canonical_verified) == norm_expected
          return true
        end

        false
      end
    end
  end
end

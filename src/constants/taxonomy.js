/**
 * Predefined Topic Taxonomy and Deterministic Mapping System
 * Implements FR-07 deterministic topic strategy for MVP.
 */

const CANONICAL_TOPICS = {
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
};

// Aliases and tag keywords mapped deterministically to canonical topics
const TAG_TO_TOPIC_MAP = {
  // Backend Development
  'nodejs': CANONICAL_TOPICS.BACKEND_DEVELOPMENT,
  'node': CANONICAL_TOPICS.BACKEND_DEVELOPMENT,
  'express': CANONICAL_TOPICS.BACKEND_DEVELOPMENT,
  'expressjs': CANONICAL_TOPICS.BACKEND_DEVELOPMENT,
  'api': CANONICAL_TOPICS.BACKEND_DEVELOPMENT,
  'rest-api': CANONICAL_TOPICS.BACKEND_DEVELOPMENT,
  'rest': CANONICAL_TOPICS.BACKEND_DEVELOPMENT,
  'backend': CANONICAL_TOPICS.BACKEND_DEVELOPMENT,
  'fastapi': CANONICAL_TOPICS.BACKEND_DEVELOPMENT,
  'django': CANONICAL_TOPICS.BACKEND_DEVELOPMENT,
  'flask': CANONICAL_TOPICS.BACKEND_DEVELOPMENT,
  'spring': CANONICAL_TOPICS.BACKEND_DEVELOPMENT,
  'springboot': CANONICAL_TOPICS.BACKEND_DEVELOPMENT,
  'nestjs': CANONICAL_TOPICS.BACKEND_DEVELOPMENT,
  'graphql': CANONICAL_TOPICS.BACKEND_DEVELOPMENT,
  'microservices': CANONICAL_TOPICS.BACKEND_DEVELOPMENT,
  'rails': CANONICAL_TOPICS.BACKEND_DEVELOPMENT,
  'ruby-on-rails': CANONICAL_TOPICS.BACKEND_DEVELOPMENT,

  // Frontend Development
  'frontend': CANONICAL_TOPICS.FRONTEND_DEVELOPMENT,
  'react': CANONICAL_TOPICS.FRONTEND_DEVELOPMENT,
  'reactjs': CANONICAL_TOPICS.FRONTEND_DEVELOPMENT,
  'vue': CANONICAL_TOPICS.FRONTEND_DEVELOPMENT,
  'vuejs': CANONICAL_TOPICS.FRONTEND_DEVELOPMENT,
  'angular': CANONICAL_TOPICS.FRONTEND_DEVELOPMENT,
  'svelte': CANONICAL_TOPICS.FRONTEND_DEVELOPMENT,
  'css': CANONICAL_TOPICS.FRONTEND_DEVELOPMENT,
  'html': CANONICAL_TOPICS.FRONTEND_DEVELOPMENT,
  'tailwind': CANONICAL_TOPICS.FRONTEND_DEVELOPMENT,
  'nextjs': CANONICAL_TOPICS.FRONTEND_DEVELOPMENT,

  // DevOps & Cloud
  'devops': CANONICAL_TOPICS.DEVOPS_CLOUD,
  'cloud': CANONICAL_TOPICS.DEVOPS_CLOUD,
  'aws': CANONICAL_TOPICS.DEVOPS_CLOUD,
  'gcp': CANONICAL_TOPICS.DEVOPS_CLOUD,
  'azure': CANONICAL_TOPICS.DEVOPS_CLOUD,
  'docker': CANONICAL_TOPICS.DEVOPS_CLOUD,
  'kubernetes': CANONICAL_TOPICS.DEVOPS_CLOUD,
  'k8s': CANONICAL_TOPICS.DEVOPS_CLOUD,
  'ci-cd': CANONICAL_TOPICS.DEVOPS_CLOUD,
  'cicd': CANONICAL_TOPICS.DEVOPS_CLOUD,
  'terraform': CANONICAL_TOPICS.DEVOPS_CLOUD,

  // AI & Machine Learning
  'ai': CANONICAL_TOPICS.AI_MACHINE_LEARNING,
  'artificial-intelligence': CANONICAL_TOPICS.AI_MACHINE_LEARNING,
  'machine-learning': CANONICAL_TOPICS.AI_MACHINE_LEARNING,
  'ml': CANONICAL_TOPICS.AI_MACHINE_LEARNING,
  'deep-learning': CANONICAL_TOPICS.AI_MACHINE_LEARNING,
  'llm': CANONICAL_TOPICS.AI_MACHINE_LEARNING,
  'datascience': CANONICAL_TOPICS.AI_MACHINE_LEARNING,
  'data-science': CANONICAL_TOPICS.AI_MACHINE_LEARNING,
  'nlp': CANONICAL_TOPICS.AI_MACHINE_LEARNING,
  'prompt-engineering': CANONICAL_TOPICS.AI_MACHINE_LEARNING,

  // Mobile Development
  'mobile': CANONICAL_TOPICS.MOBILE_DEVELOPMENT,
  'android': CANONICAL_TOPICS.MOBILE_DEVELOPMENT,
  'ios': CANONICAL_TOPICS.MOBILE_DEVELOPMENT,
  'flutter': CANONICAL_TOPICS.MOBILE_DEVELOPMENT,
  'react-native': CANONICAL_TOPICS.MOBILE_DEVELOPMENT,
  'swift': CANONICAL_TOPICS.MOBILE_DEVELOPMENT,
  'kotlin': CANONICAL_TOPICS.MOBILE_DEVELOPMENT,

  // Cybersecurity
  'security': CANONICAL_TOPICS.CYBERSECURITY,
  'cybersecurity': CANONICAL_TOPICS.CYBERSECURITY,
  'infosec': CANONICAL_TOPICS.CYBERSECURITY,
  'auth': CANONICAL_TOPICS.CYBERSECURITY,
  'authentication': CANONICAL_TOPICS.CYBERSECURITY,
  'oauth': CANONICAL_TOPICS.CYBERSECURITY,
  'jwt': CANONICAL_TOPICS.CYBERSECURITY,
  'cryptography': CANONICAL_TOPICS.CYBERSECURITY,

  // Database & Data Engineering
  'database': CANONICAL_TOPICS.DATABASE_DATA_ENGINEERING,
  'databases': CANONICAL_TOPICS.DATABASE_DATA_ENGINEERING,
  'sql': CANONICAL_TOPICS.DATABASE_DATA_ENGINEERING,
  'postgresql': CANONICAL_TOPICS.DATABASE_DATA_ENGINEERING,
  'postgres': CANONICAL_TOPICS.DATABASE_DATA_ENGINEERING,
  'mysql': CANONICAL_TOPICS.DATABASE_DATA_ENGINEERING,
  'mongodb': CANONICAL_TOPICS.DATABASE_DATA_ENGINEERING,
  'nosql': CANONICAL_TOPICS.DATABASE_DATA_ENGINEERING,
  'redis': CANONICAL_TOPICS.DATABASE_DATA_ENGINEERING,

  // Software Architecture & Design
  'architecture': CANONICAL_TOPICS.SOFTWARE_ARCHITECTURE,
  'system-design': CANONICAL_TOPICS.SOFTWARE_ARCHITECTURE,
  'design-patterns': CANONICAL_TOPICS.SOFTWARE_ARCHITECTURE,
  'software-architecture': CANONICAL_TOPICS.SOFTWARE_ARCHITECTURE,
  'unix': CANONICAL_TOPICS.SOFTWARE_ARCHITECTURE,

  // Programming Languages
  'programming': CANONICAL_TOPICS.PROGRAMMING_LANGUAGES,
  'javascript': CANONICAL_TOPICS.PROGRAMMING_LANGUAGES,
  'typescript': CANONICAL_TOPICS.PROGRAMMING_LANGUAGES,
  'python': CANONICAL_TOPICS.PROGRAMMING_LANGUAGES,
  'ruby': CANONICAL_TOPICS.PROGRAMMING_LANGUAGES,
  'rust': CANONICAL_TOPICS.PROGRAMMING_LANGUAGES,
  'golang': CANONICAL_TOPICS.PROGRAMMING_LANGUAGES,
  'go': CANONICAL_TOPICS.PROGRAMMING_LANGUAGES,
  'java': CANONICAL_TOPICS.PROGRAMMING_LANGUAGES,
  'csharp': CANONICAL_TOPICS.PROGRAMMING_LANGUAGES,
  'cpp': CANONICAL_TOPICS.PROGRAMMING_LANGUAGES,

  // Testing & QA
  'testing': CANONICAL_TOPICS.TESTING_QA,
  'qa': CANONICAL_TOPICS.TESTING_QA,
  'unit-testing': CANONICAL_TOPICS.TESTING_QA,
  'jest': CANONICAL_TOPICS.TESTING_QA,
  'cypress': CANONICAL_TOPICS.TESTING_QA,

  // Web Development
  'webdev': CANONICAL_TOPICS.WEB_DEVELOPMENT,
  'web-development': CANONICAL_TOPICS.WEB_DEVELOPMENT
};

// Aliases for topic names to canonical names
const TOPIC_SYNONYMS = {
  'backend': CANONICAL_TOPICS.BACKEND_DEVELOPMENT,
  'backend development': CANONICAL_TOPICS.BACKEND_DEVELOPMENT,
  'frontend': CANONICAL_TOPICS.FRONTEND_DEVELOPMENT,
  'frontend development': CANONICAL_TOPICS.FRONTEND_DEVELOPMENT,
  'fullstack': CANONICAL_TOPICS.FULL_STACK_DEVELOPMENT,
  'full stack': CANONICAL_TOPICS.FULL_STACK_DEVELOPMENT,
  'full stack development': CANONICAL_TOPICS.FULL_STACK_DEVELOPMENT,
  'devops': CANONICAL_TOPICS.DEVOPS_CLOUD,
  'devops & cloud': CANONICAL_TOPICS.DEVOPS_CLOUD,
  'cloud': CANONICAL_TOPICS.DEVOPS_CLOUD,
  'ai': CANONICAL_TOPICS.AI_MACHINE_LEARNING,
  'machine learning': CANONICAL_TOPICS.AI_MACHINE_LEARNING,
  'ai & machine learning': CANONICAL_TOPICS.AI_MACHINE_LEARNING,
  'artificial intelligence': CANONICAL_TOPICS.AI_MACHINE_LEARNING,
  'artificial intelligence & machine learning': CANONICAL_TOPICS.AI_MACHINE_LEARNING,
  'data science & ai': CANONICAL_TOPICS.AI_MACHINE_LEARNING,
  'mobile': CANONICAL_TOPICS.MOBILE_DEVELOPMENT,
  'mobile development': CANONICAL_TOPICS.MOBILE_DEVELOPMENT,
  'security': CANONICAL_TOPICS.CYBERSECURITY,
  'cybersecurity': CANONICAL_TOPICS.CYBERSECURITY,
  'database': CANONICAL_TOPICS.DATABASE_DATA_ENGINEERING,
  'database & data engineering': CANONICAL_TOPICS.DATABASE_DATA_ENGINEERING,
  'architecture': CANONICAL_TOPICS.SOFTWARE_ARCHITECTURE,
  'software architecture': CANONICAL_TOPICS.SOFTWARE_ARCHITECTURE,
  'software architecture & design': CANONICAL_TOPICS.SOFTWARE_ARCHITECTURE,
  'programming': CANONICAL_TOPICS.PROGRAMMING_LANGUAGES,
  'programming languages': CANONICAL_TOPICS.PROGRAMMING_LANGUAGES,
  'testing': CANONICAL_TOPICS.TESTING_QA,
  'testing & qa': CANONICAL_TOPICS.TESTING_QA,
  'testing & quality assurance': CANONICAL_TOPICS.TESTING_QA,
  'webdev': CANONICAL_TOPICS.WEB_DEVELOPMENT,
  'web development': CANONICAL_TOPICS.WEB_DEVELOPMENT
};

/**
 * Normalize topic string for comparison (trim, lowercase, collapse whitespace)
 */
function normalizeTopicString(str) {
  if (!str || typeof str !== 'string') return '';
  return str.trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * Resolves a topic string to its canonical taxonomy name, if known
 */
function resolveCanonicalTopic(topicStr) {
  const normalized = normalizeTopicString(topicStr);
  if (!normalized) return null;
  return TOPIC_SYNONYMS[normalized] || null;
}

/**
 * Deterministically derives a topic from source article metadata.
 * Uses authoritative article category/topic if available,
 * or maps the article's tags/keywords to the taxonomy.
 * 
 * Returns canonical topic string, or null if it cannot be reliably established.
 */
function deriveTopicFromMetadata(metadata) {
  if (!metadata) return null;

  // 1. If source article exposes an authoritative topic or category
  if (metadata.topic) {
    const canonical = resolveCanonicalTopic(metadata.topic);
    if (canonical) return canonical;
    // If not in taxonomy, return normalized topic string
    return metadata.topic.trim();
  }

  // 2. Map from authoritative tags
  const tags = Array.isArray(metadata.tags) ? metadata.tags : [];
  if (tags.length === 0) {
    return null; // Cannot establish reliably without source metadata
  }

  // Count topic occurrences among matched tags
  const topicCounts = {};
  for (const tag of tags) {
    const normalizedTag = tag.trim().toLowerCase();
    const mappedTopic = TAG_TO_TOPIC_MAP[normalizedTag];
    if (mappedTopic) {
      topicCounts[mappedTopic] = (topicCounts[mappedTopic] || 0) + 1;
    }
  }

  const entries = Object.entries(topicCounts);
  if (entries.length === 0) {
    return null; // Tags did not match any known topic in taxonomy
  }

  // Pick the topic with the most tag hits (or first on tie)
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}

/**
 * Compares expected topic and verified topic.
 * Checks direct normalized match or taxonomy alias match.
 */
function compareTopics(expectedTopic, verifiedTopic) {
  if (!expectedTopic || !verifiedTopic) return false;

  const normExpected = normalizeTopicString(expectedTopic);
  const normVerified = normalizeTopicString(verifiedTopic);

  if (normExpected === normVerified) return true;

  // Compare canonical mapped versions
  const canonicalExpected = resolveCanonicalTopic(expectedTopic);
  const canonicalVerified = resolveCanonicalTopic(verifiedTopic);

  if (canonicalExpected && canonicalVerified && canonicalExpected === canonicalVerified) {
    return true;
  }

  // If one resolved to canonical and other matched canonical normalized
  if (canonicalExpected && normalizeTopicString(canonicalExpected) === normVerified) {
    return true;
  }
  if (canonicalVerified && normalizeTopicString(canonicalVerified) === normExpected) {
    return true;
  }

  return false;
}

module.exports = {
  CANONICAL_TOPICS,
  TAG_TO_TOPIC_MAP,
  TOPIC_SYNONYMS,
  normalizeTopicString,
  resolveCanonicalTopic,
  deriveTopicFromMetadata,
  compareTopics
};

const {
  CANONICAL_TOPICS,
  deriveTopicFromMetadata,
  compareTopics,
  resolveCanonicalTopic
} = require('../../src/constants/taxonomy');

describe('Topic Taxonomy and Mapping', () => {
  test('resolves direct canonical topic aliases', () => {
    expect(resolveCanonicalTopic('backend')).toBe(CANONICAL_TOPICS.BACKEND_DEVELOPMENT);
    expect(resolveCanonicalTopic('backend development')).toBe(CANONICAL_TOPICS.BACKEND_DEVELOPMENT);
    expect(resolveCanonicalTopic('ai')).toBe(CANONICAL_TOPICS.AI_MACHINE_LEARNING);
    expect(resolveCanonicalTopic('devops & cloud')).toBe(CANONICAL_TOPICS.DEVOPS_CLOUD);
  });

  test('derives topic from authoritative tags', () => {
    const metadata = {
      tags: ['nodejs', 'express', 'api']
    };
    const derived = deriveTopicFromMetadata(metadata);
    expect(derived).toBe(CANONICAL_TOPICS.BACKEND_DEVELOPMENT);
  });

  test('derives AI topic from machine-learning tags', () => {
    const metadata = {
      tags: ['machine-learning', 'python', 'llm']
    };
    const derived = deriveTopicFromMetadata(metadata);
    expect(derived).toBe(CANONICAL_TOPICS.AI_MACHINE_LEARNING);
  });

  test('returns null when tags do not map to any taxonomy topic', () => {
    const metadata = {
      tags: ['random-tag-123', 'unrelated']
    };
    expect(deriveTopicFromMetadata(metadata)).toBeNull();
  });

  test('returns null when no tags or topic in metadata', () => {
    expect(deriveTopicFromMetadata({})).toBeNull();
    expect(deriveTopicFromMetadata({ tags: [] })).toBeNull();
  });

  test('compares matching topics ignoring case and synonyms', () => {
    expect(compareTopics('Backend Development', 'Backend Development')).toBe(true);
    expect(compareTopics('backend', 'Backend Development')).toBe(true);
    expect(compareTopics('Backend Development', 'backend')).toBe(true);
    expect(compareTopics('AI & Machine Learning', 'Artificial Intelligence & Machine Learning')).toBe(true);
  });

  test('detects mismatching topics', () => {
    expect(compareTopics('Frontend Development', 'Backend Development')).toBe(false);
  });
});

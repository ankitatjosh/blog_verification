const validationService = require('../../src/services/validation.service');
const { ERROR_CODES, CHECK_STATUS, VERIFICATION_STATUS } = require('../../src/constants/errorCodes');

describe('ValidationService Unit Tests', () => {
  const baseRequest = {
    platform: 'devto',
    url: 'https://dev.to/janedoe/building-a-node-api-123',
    username: 'janedoe',
    publishedAt: '2026-10-11',
    tags: ['nodejs', 'api'],
    topic: 'Backend Development',
    summary: 'A guide to building APIs using Node.js'
  };

  const baseMetadata = {
    canonicalUrl: 'https://dev.to/janedoe/building-a-node-api-123',
    platform: 'devto',
    author: {
      username: 'janedoe',
      displayName: 'Jane Doe'
    },
    publishedAt: '2026-10-11T10:00:00Z',
    updatedAt: '2026-10-12T10:00:00Z',
    tags: ['nodejs', 'api'],
    topic: null, // derived via taxonomy from tags
    description: 'A guide to building APIs using Node.js',
    wordCount: 650
  };

  test('AC-01: returns status valid when all required and optional checks pass', () => {
    const result = validationService.evaluate(baseRequest, baseMetadata);
    expect(result.status).toBe(VERIFICATION_STATUS.VALID);
    expect(result.success).toBe(true);
    expect(result.errors).toBeUndefined();
    expect(result.data.checks.url.status).toBe(CHECK_STATUS.PASSED);
    expect(result.data.checks.username.status).toBe(CHECK_STATUS.PASSED);
    expect(result.data.checks.publishedAt.status).toBe(CHECK_STATUS.PASSED);
    expect(result.data.checks.quarter.status).toBe(CHECK_STATUS.PASSED);
    expect(result.data.checks.tags.status).toBe(CHECK_STATUS.PASSED);
    expect(result.data.checks.topic.status).toBe(CHECK_STATUS.PASSED);
    expect(result.data.checks.summary.status).toBe(CHECK_STATUS.PASSED);
  });

  test('AC-02: returns status invalid and AUTHOR_MISMATCH when username does not match', () => {
    const metadata = {
      ...baseMetadata,
      author: { username: 'otheruser', displayName: 'Jane Doe' }
    };
    const result = validationService.evaluate(baseRequest, metadata);
    expect(result.status).toBe(VERIFICATION_STATUS.INVALID);
    expect(result.data.checks.username.status).toBe(CHECK_STATUS.FAILED);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: ERROR_CODES.AUTHOR_MISMATCH,
          field: 'username',
          expected: 'janedoe',
          actual: 'otheruser'
        })
      ])
    );
  });

  test('AC-03: returns status invalid and PUBLICATION_DATE_MISMATCH when publication date differs', () => {
    const metadata = {
      ...baseMetadata,
      publishedAt: '2026-10-12T10:00:00Z'
    };
    const result = validationService.evaluate(baseRequest, metadata);
    expect(result.status).toBe(VERIFICATION_STATUS.INVALID);
    expect(result.data.checks.publishedAt.status).toBe(CHECK_STATUS.FAILED);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: ERROR_CODES.PUBLICATION_DATE_MISMATCH,
          field: 'publishedAt',
          expected: '2026-10-11',
          actual: '2026-10-12'
        })
      ])
    );
  });

  test('AC-04: tag validation skipped when tags omitted, does not cause failure', () => {
    const { tags, ...reqWithoutTags } = baseRequest;
    const result = validationService.evaluate(reqWithoutTags, baseMetadata);
    expect(result.status).toBe(VERIFICATION_STATUS.VALID);
    expect(result.data.checks.tags.status).toBe(CHECK_STATUS.SKIPPED);
    expect(result.data.checks.tags.message).toContain('skipped');
  });

  test('AC-05: tag validation skipped when tags is empty array []', () => {
    const reqEmptyTags = { ...baseRequest, tags: [] };
    const result = validationService.evaluate(reqEmptyTags, baseMetadata);
    expect(result.status).toBe(VERIFICATION_STATUS.VALID);
    expect(result.data.checks.tags.status).toBe(CHECK_STATUS.SKIPPED);
  });

  test('AC-06: returns TAGS_MISMATCH when supplied tags differ', () => {
    const reqDifferentTags = { ...baseRequest, tags: ['python', 'django'] };
    const result = validationService.evaluate(reqDifferentTags, baseMetadata);
    expect(result.status).toBe(VERIFICATION_STATUS.INVALID);
    expect(result.data.checks.tags.status).toBe(CHECK_STATUS.FAILED);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: ERROR_CODES.TAGS_MISMATCH,
          field: 'tags'
        })
      ])
    );
  });

  test('AC-07: marks tag check as unverified when tags supplied but source has no tags', () => {
    const metadataNoTags = { ...baseMetadata, tags: null };
    const result = validationService.evaluate(baseRequest, metadataNoTags);
    expect(result.status).toBe(VERIFICATION_STATUS.UNVERIFIED);
    expect(result.data.checks.tags.status).toBe(CHECK_STATUS.UNVERIFIED);
  });

  test('AC-08: returns TOPIC_MISMATCH when topic differs', () => {
    const reqWrongTopic = { ...baseRequest, topic: 'Mobile Development' };
    const result = validationService.evaluate(reqWrongTopic, baseMetadata);
    expect(result.status).toBe(VERIFICATION_STATUS.INVALID);
    expect(result.data.checks.topic.status).toBe(CHECK_STATUS.FAILED);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: ERROR_CODES.TOPIC_MISMATCH,
          field: 'topic'
        })
      ])
    );
  });

  test('AC-09: returns SUMMARY_MISMATCH when summary differs from normalized description', () => {
    const reqWrongSummary = { ...baseRequest, summary: 'An unrelated summary text.' };
    const result = validationService.evaluate(reqWrongSummary, baseMetadata);
    expect(result.status).toBe(VERIFICATION_STATUS.INVALID);
    expect(result.data.checks.summary.status).toBe(CHECK_STATUS.FAILED);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: ERROR_CODES.SUMMARY_MISMATCH,
          field: 'summary'
        })
      ])
    );
  });

  test('Blog length check passes when word count is 500 or more', () => {
    const metadata = { ...baseMetadata, wordCount: 500 };
    const result = validationService.evaluate(baseRequest, metadata);
    expect(result.data.checks.contentLength.status).toBe(CHECK_STATUS.PASSED);
    expect(result.data.checks.contentLength.wordCount).toBe(500);
    expect(result.data.checks.contentLength.message).toContain('Blog length passed');
  });

  test('Blog length check fails when word count is under 500 words', () => {
    const metadata = { ...baseMetadata, wordCount: 350 };
    const result = validationService.evaluate(baseRequest, metadata);
    expect(result.status).toBe(VERIFICATION_STATUS.INVALID);
    expect(result.data.checks.contentLength.status).toBe(CHECK_STATUS.FAILED);
    expect(result.data.checks.contentLength.wordCount).toBe(350);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: ERROR_CODES.INSUFFICIENT_CONTENT_LENGTH,
          field: 'contentLength',
          actual: 350,
          expected: 500
        })
      ])
    );
  });

  test('Blog length check honors custom minWordCount requirement', () => {
    const reqCustom = { ...baseRequest, minWordCount: 1000 };
    const metadata = { ...baseMetadata, wordCount: 650 }; // 650 < 1000
    const result = validationService.evaluate(reqCustom, metadata);
    expect(result.status).toBe(VERIFICATION_STATUS.INVALID);
    expect(result.data.checks.contentLength.status).toBe(CHECK_STATUS.FAILED);
    expect(result.data.checks.contentLength.minRequired).toBe(1000);
  });

  test('Blog length check returns unverified when content wordCount is unavailable', () => {
    const metadataNoContent = { ...baseMetadata, wordCount: null };
    const result = validationService.evaluate(baseRequest, metadataNoContent);
    expect(result.status).toBe(VERIFICATION_STATUS.UNVERIFIED);
    expect(result.data.checks.contentLength.status).toBe(CHECK_STATUS.UNVERIFIED);
  });

  test('AC-10: buildSourceFailureResponse returns status invalid for ARTICLE_NOT_FOUND', () => {
    const upstreamError = {
      errorCode: ERROR_CODES.ARTICLE_NOT_FOUND,
      message: 'Article not found.'
    };
    const result = validationService.buildSourceFailureResponse(baseRequest, upstreamError);
    expect(result.status).toBe(VERIFICATION_STATUS.INVALID);
    expect(result.data.checks.url.status).toBe(CHECK_STATUS.FAILED);
    expect(result.errors[0].code).toBe(ERROR_CODES.ARTICLE_NOT_FOUND);
  });

  test('AC-11: buildSourceFailureResponse returns status unverified for SOURCE_TIMEOUT', () => {
    const upstreamError = {
      errorCode: ERROR_CODES.SOURCE_TIMEOUT,
      message: 'Source timeout.'
    };
    const result = validationService.buildSourceFailureResponse(baseRequest, upstreamError);
    expect(result.status).toBe(VERIFICATION_STATUS.UNVERIFIED);
    expect(result.data.checks.url.status).toBe(CHECK_STATUS.UNVERIFIED);
    expect(result.errors[0].code).toBe(ERROR_CODES.SOURCE_TIMEOUT);
  });

  test('AC-12: returns all detected mismatches when multiple fields differ', () => {
    const badMetadata = {
      ...baseMetadata,
      author: { username: 'wrongauthor' },
      publishedAt: '2026-01-01T00:00:00Z',
      description: 'Different description.',
      tags: ['ruby']
    };
    const req = {
      ...baseRequest,
      topic: 'Mobile Development'
    };
    const result = validationService.evaluate(req, badMetadata);
    expect(result.status).toBe(VERIFICATION_STATUS.INVALID);
    const errorCodes = result.errors.map((e) => e.code);
    expect(errorCodes).toContain(ERROR_CODES.AUTHOR_MISMATCH);
    expect(errorCodes).toContain(ERROR_CODES.PUBLICATION_DATE_MISMATCH);
    expect(errorCodes).toContain(ERROR_CODES.TAGS_MISMATCH);
    expect(errorCodes).toContain(ERROR_CODES.TOPIC_MISMATCH);
    expect(errorCodes).toContain(ERROR_CODES.SUMMARY_MISMATCH);
    expect(errorCodes).toContain(ERROR_CODES.NOT_IN_CURRENT_QUARTER);
  });

  describe('Quarter Verification Tests', () => {
    test('passes quarter check when blog creation date is in current quarter', () => {
      const metadata = {
        ...baseMetadata,
        publishedAt: '2026-10-11T12:00:00Z'
      };
      const result = validationService.evaluate(baseRequest, metadata);
      expect(result.data.checks.quarter.status).toBe(CHECK_STATUS.PASSED);
      expect(result.data.checks.quarter.currentQuarter).toBe('October - December 2026');
      expect(result.data.checks.quarter.blogQuarter).toBe('October - December 2026');
    });

    test('fails quarter check and returns NOT_IN_CURRENT_QUARTER when blog date is from another quarter', () => {
      const metadata = {
        ...baseMetadata,
        publishedAt: '2026-06-15T12:00:00Z' // April - June 2026 (not current)
      };
      const req = {
        ...baseRequest,
        publishedAt: '2026-06-15'
      };
      const result = validationService.evaluate(req, metadata);
      expect(result.status).toBe(VERIFICATION_STATUS.INVALID);
      expect(result.data.checks.quarter.status).toBe(CHECK_STATUS.FAILED);
      expect(result.data.checks.quarter.blogQuarter).toBe('April - June 2026');
      expect(result.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: ERROR_CODES.NOT_IN_CURRENT_QUARTER,
            field: 'publishedAt'
          })
        ])
      );
    });

    test('returns unverified quarter when publication date is missing', () => {
      const metadata = {
        ...baseMetadata,
        publishedAt: null
      };
      const result = validationService.evaluate(baseRequest, metadata);
      expect(result.data.checks.quarter.status).toBe(CHECK_STATUS.UNVERIFIED);
    });
  });
});

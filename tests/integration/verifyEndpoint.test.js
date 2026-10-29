const request = require('supertest');
const fs = require('fs');
const path = require('path');
const app = require('../../src/app');
const urlSecurity = require('../../src/utils/urlSecurity');
const { ERROR_CODES, CHECK_STATUS, VERIFICATION_STATUS } = require('../../src/constants/errorCodes');
const { UpstreamError } = require('../../src/utils/errors');

describe('Blog Verification API Integration Tests — POST /api/v1/blogs/verify', () => {
  const devtoFixture = JSON.parse(
    fs.readFileSync(path.join(__dirname, '../fixtures/devtoArticle.json'), 'utf8')
  );
  const mediumFixture = fs.readFileSync(path.join(__dirname, '../fixtures/mediumHtml.html'), 'utf8');

  beforeEach(() => {
    jest.restoreAllMocks();
  });

  describe('AC-01: Valid blog verification', () => {
    test('verifies a valid DEV.to blog successfully', async () => {
      jest.spyOn(urlSecurity, 'safeFetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => devtoFixture
      });

      const res = await request(app)
        .post('/api/v1/blogs/verify')
        .set('Content-Type', 'application/json')
        .send({
          platform: 'devto',
          url: 'https://dev.to/janedoe/building-a-rest-api-with-nodejs-123',
          username: 'janedoe',
          publishedAt: '2026-10-11',
          tags: ['nodejs', 'api', 'express'],
          topic: 'Backend Development',
          summary: 'A comprehensive guide to building clean, maintainable REST APIs with Node.js and Express.'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe(VERIFICATION_STATUS.VALID);
      expect(res.body.data.checks.url.status).toBe(CHECK_STATUS.PASSED);
      expect(res.body.data.checks.username.status).toBe(CHECK_STATUS.PASSED);
      expect(res.body.data.checks.publishedAt.status).toBe(CHECK_STATUS.PASSED);
      expect(res.body.data.checks.quarter.status).toBe(CHECK_STATUS.PASSED);
      expect(res.body.data.checks.tags.status).toBe(CHECK_STATUS.PASSED);
      expect(res.body.data.checks.topic.status).toBe(CHECK_STATUS.PASSED);
      expect(res.body.data.checks.summary.status).toBe(CHECK_STATUS.PASSED);
      expect(res.body.data.checks.contentLength.status).toBe(CHECK_STATUS.PASSED);
      expect(res.body.data.checks.contentLength.wordCount).toBeGreaterThanOrEqual(500);
      expect(res.body.errors).toBeUndefined();
    });

    test('verifies a valid Medium blog successfully', async () => {
      jest.spyOn(urlSecurity, 'safeFetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => mediumFixture
      });

      const res = await request(app)
        .post('/api/v1/blogs/verify')
        .set('Content-Type', 'application/json')
        .send({
          platform: 'medium',
          url: 'https://medium.com/@janedoe/building-a-rest-api-with-nodejs-7ca392289650',
          username: 'janedoe',
          publishedAt: '2026-10-11',
          tags: ['nodejs', 'api', 'express'],
          topic: 'Backend Development',
          summary: 'A comprehensive guide to building clean, maintainable REST APIs with Node.js and Express.'
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.status).toBe(VERIFICATION_STATUS.VALID);
      expect(res.body.data.checks.username.status).toBe(CHECK_STATUS.PASSED);
      expect(res.body.data.checks.quarter.status).toBe(CHECK_STATUS.PASSED);
    });
  });

  describe('AC-02: Incorrect author', () => {
    test('returns status invalid and AUTHOR_MISMATCH when author differs', async () => {
      jest.spyOn(urlSecurity, 'safeFetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => devtoFixture
      });

      const res = await request(app)
        .post('/api/v1/blogs/verify')
        .send({
          platform: 'devto',
          url: 'https://dev.to/janedoe/building-a-rest-api-with-nodejs-123',
          username: 'differentuser',
          publishedAt: '2026-10-11',
          tags: ['nodejs', 'api', 'express'],
          topic: 'Backend Development',
          summary: 'A comprehensive guide to building clean, maintainable REST APIs with Node.js and Express.'
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(VERIFICATION_STATUS.INVALID);
      expect(res.body.data.checks.username.status).toBe(CHECK_STATUS.FAILED);
      expect(res.body.errors[0].code).toBe(ERROR_CODES.AUTHOR_MISMATCH);
      expect(res.body.errors[0].expected).toBe('differentuser');
      expect(res.body.errors[0].actual).toBe('janedoe');
    });
  });

  describe('AC-03: Incorrect publication date', () => {
    test('returns status invalid and PUBLICATION_DATE_MISMATCH', async () => {
      jest.spyOn(urlSecurity, 'safeFetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => devtoFixture
      });

      const res = await request(app)
        .post('/api/v1/blogs/verify')
        .send({
          platform: 'devto',
          url: 'https://dev.to/janedoe/building-a-rest-api-with-nodejs-123',
          username: 'janedoe',
          publishedAt: '2026-10-12', // fixture is 2026-10-11
          tags: ['nodejs', 'api', 'express'],
          topic: 'Backend Development',
          summary: 'A comprehensive guide to building clean, maintainable REST APIs with Node.js and Express.'
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(VERIFICATION_STATUS.INVALID);
      expect(res.body.data.checks.publishedAt.status).toBe(CHECK_STATUS.FAILED);
      expect(res.body.errors[0].code).toBe(ERROR_CODES.PUBLICATION_DATE_MISMATCH);
    });
  });

  describe('AC-04 & AC-05: Tags omitted or empty', () => {
    test('AC-04: tag validation skipped when omitted and verification succeeds', async () => {
      jest.spyOn(urlSecurity, 'safeFetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => devtoFixture
      });

      const res = await request(app)
        .post('/api/v1/blogs/verify')
        .send({
          platform: 'devto',
          url: 'https://dev.to/janedoe/building-a-rest-api-with-nodejs-123',
          username: 'janedoe',
          publishedAt: '2026-10-11',
          topic: 'Backend Development',
          summary: 'A comprehensive guide to building clean, maintainable REST APIs with Node.js and Express.'
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(VERIFICATION_STATUS.VALID);
      expect(res.body.data.checks.tags.status).toBe(CHECK_STATUS.SKIPPED);
    });

    test('AC-05: tag validation skipped when tags is empty array []', async () => {
      jest.spyOn(urlSecurity, 'safeFetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => devtoFixture
      });

      const res = await request(app)
        .post('/api/v1/blogs/verify')
        .send({
          platform: 'devto',
          url: 'https://dev.to/janedoe/building-a-rest-api-with-nodejs-123',
          username: 'janedoe',
          publishedAt: '2026-10-11',
          tags: [],
          topic: 'Backend Development',
          summary: 'A comprehensive guide to building clean, maintainable REST APIs with Node.js and Express.'
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(VERIFICATION_STATUS.VALID);
      expect(res.body.data.checks.tags.status).toBe(CHECK_STATUS.SKIPPED);
    });
  });

  describe('AC-06: Incorrect tags', () => {
    test('returns status invalid and TAGS_MISMATCH', async () => {
      jest.spyOn(urlSecurity, 'safeFetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => devtoFixture
      });

      const res = await request(app)
        .post('/api/v1/blogs/verify')
        .send({
          platform: 'devto',
          url: 'https://dev.to/janedoe/building-a-rest-api-with-nodejs-123',
          username: 'janedoe',
          publishedAt: '2026-10-11',
          tags: ['python', 'fastapi'],
          topic: 'Backend Development',
          summary: 'A comprehensive guide to building clean, maintainable REST APIs with Node.js and Express.'
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(VERIFICATION_STATUS.INVALID);
      expect(res.body.data.checks.tags.status).toBe(CHECK_STATUS.FAILED);
      expect(res.body.errors[0].code).toBe(ERROR_CODES.TAGS_MISMATCH);
    });
  });

  describe('AC-07: Tags unavailable from source', () => {
    test('returns unverified for tags when source provides no tag metadata', async () => {
      const fixtureNoTags = { ...devtoFixture, tag_list: null, tags: null };
      jest.spyOn(urlSecurity, 'safeFetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => fixtureNoTags
      });

      const res = await request(app)
        .post('/api/v1/blogs/verify')
        .send({
          platform: 'devto',
          url: 'https://dev.to/janedoe/building-a-rest-api-with-nodejs-123',
          username: 'janedoe',
          publishedAt: '2026-10-11',
          tags: ['nodejs'],
          topic: 'Backend Development',
          summary: 'A comprehensive guide to building clean, maintainable REST APIs with Node.js and Express.'
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(VERIFICATION_STATUS.UNVERIFIED);
      expect(res.body.data.checks.tags.status).toBe(CHECK_STATUS.UNVERIFIED);
    });
  });

  describe('AC-08: Incorrect topic', () => {
    test('returns status invalid and TOPIC_MISMATCH', async () => {
      jest.spyOn(urlSecurity, 'safeFetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => devtoFixture
      });

      const res = await request(app)
        .post('/api/v1/blogs/verify')
        .send({
          platform: 'devto',
          url: 'https://dev.to/janedoe/building-a-rest-api-with-nodejs-123',
          username: 'janedoe',
          publishedAt: '2026-10-11',
          tags: ['nodejs', 'api', 'express'],
          topic: 'Mobile Development',
          summary: 'A comprehensive guide to building clean, maintainable REST APIs with Node.js and Express.'
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(VERIFICATION_STATUS.INVALID);
      expect(res.body.data.checks.topic.status).toBe(CHECK_STATUS.FAILED);
      expect(res.body.errors[0].code).toBe(ERROR_CODES.TOPIC_MISMATCH);
    });
  });

  describe('AC-09: Incorrect summary', () => {
    test('returns status invalid and SUMMARY_MISMATCH', async () => {
      jest.spyOn(urlSecurity, 'safeFetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => devtoFixture
      });

      const res = await request(app)
        .post('/api/v1/blogs/verify')
        .send({
          platform: 'devto',
          url: 'https://dev.to/janedoe/building-a-rest-api-with-nodejs-123',
          username: 'janedoe',
          publishedAt: '2026-10-11',
          tags: ['nodejs', 'api', 'express'],
          topic: 'Backend Development',
          summary: 'This summary is completely fabricated and incorrect.'
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(VERIFICATION_STATUS.INVALID);
      expect(res.body.data.checks.summary.status).toBe(CHECK_STATUS.FAILED);
      expect(res.body.errors[0].code).toBe(ERROR_CODES.SUMMARY_MISMATCH);
    });
  });

  describe('Blog Content Length Validation (500 words)', () => {
    test('returns status invalid and INSUFFICIENT_CONTENT_LENGTH when article has less than 500 words', async () => {
      const shortArticleFixture = {
        ...devtoFixture,
        body_markdown: 'This is a short post with only nine words total.'
      };

      jest.spyOn(urlSecurity, 'safeFetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => shortArticleFixture
      });

      const res = await request(app)
        .post('/api/v1/blogs/verify')
        .send({
          platform: 'devto',
          url: 'https://dev.to/janedoe/building-a-rest-api-with-nodejs-123',
          username: 'janedoe',
          publishedAt: '2026-10-11',
          tags: ['nodejs', 'api', 'express'],
          topic: 'Backend Development',
          summary: 'A comprehensive guide to building clean, maintainable REST APIs with Node.js and Express.'
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(VERIFICATION_STATUS.INVALID);
      expect(res.body.data.checks.contentLength.status).toBe(CHECK_STATUS.FAILED);
      expect(res.body.data.checks.contentLength.wordCount).toBe(10);
      expect(res.body.data.checks.contentLength.minRequired).toBe(500);
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: ERROR_CODES.INSUFFICIENT_CONTENT_LENGTH,
            field: 'contentLength'
          })
        ])
      );
    });
  });

  describe('AC-10: Article not found', () => {
    test('returns 200 with status invalid and ARTICLE_NOT_FOUND', async () => {
      jest.spyOn(urlSecurity, 'safeFetch').mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      const res = await request(app)
        .post('/api/v1/blogs/verify')
        .send({
          platform: 'devto',
          url: 'https://dev.to/janedoe/non-existent-article-123',
          username: 'janedoe',
          publishedAt: '2026-09-15',
          topic: 'Backend Development',
          summary: 'Guide'
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(VERIFICATION_STATUS.INVALID);
      expect(res.body.data.checks.url.status).toBe(CHECK_STATUS.FAILED);
      expect(res.body.errors[0].code).toBe(ERROR_CODES.ARTICLE_NOT_FOUND);
    });
  });

  describe('AC-11: Source timeout', () => {
    test('returns 200 with status unverified and SOURCE_TIMEOUT', async () => {
      jest.spyOn(urlSecurity, 'safeFetch').mockRejectedValueOnce(
        new UpstreamError(ERROR_CODES.SOURCE_TIMEOUT, 'The source platform did not respond within the allowed time.')
      );

      const res = await request(app)
        .post('/api/v1/blogs/verify')
        .send({
          platform: 'devto',
          url: 'https://dev.to/janedoe/slow-article-123',
          username: 'janedoe',
          publishedAt: '2026-09-15',
          topic: 'Backend Development',
          summary: 'Guide'
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(VERIFICATION_STATUS.UNVERIFIED);
      expect(res.body.errors[0].code).toBe(ERROR_CODES.SOURCE_TIMEOUT);
      expect(res.body.data.checks.url.status).toBe(CHECK_STATUS.UNVERIFIED);
    });
  });

  describe('AC-12: Multiple mismatches', () => {
    test('returns all detected mismatches in errors array', async () => {
      jest.spyOn(urlSecurity, 'safeFetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => devtoFixture
      });

      const res = await request(app)
        .post('/api/v1/blogs/verify')
        .send({
          platform: 'devto',
          url: 'https://dev.to/janedoe/building-a-rest-api-with-nodejs-123',
          username: 'wrongauthor',
          publishedAt: '2026-01-01',
          tags: ['golang'],
          topic: 'Mobile Development',
          summary: 'Wrong summary'
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(VERIFICATION_STATUS.INVALID);
      const codes = res.body.errors.map((e) => e.code);
      expect(codes).toContain(ERROR_CODES.AUTHOR_MISMATCH);
      expect(codes).toContain(ERROR_CODES.PUBLICATION_DATE_MISMATCH);
      expect(codes).toContain(ERROR_CODES.TAGS_MISMATCH);
      expect(codes).toContain(ERROR_CODES.TOPIC_MISMATCH);
      expect(codes).toContain(ERROR_CODES.SUMMARY_MISMATCH);
    });
  });

  describe('AC-13: Unsafe URL / SSRF Prevention', () => {
    test('rejects private and loopback IPs with 422', async () => {
      const res = await request(app)
        .post('/api/v1/blogs/verify')
        .send({
          platform: 'devto',
          url: 'https://localhost/admin',
          username: 'admin',
          publishedAt: '2026-09-15',
          topic: 'Backend Development',
          summary: 'Guide'
        });

      expect(res.status).toBe(422);
      expect(res.body.errors[0].code).toBe(ERROR_CODES.INVALID_URL);
    });
  });

  describe('AC-14: Date boundary close to midnight UTC', () => {
    test('correctly evaluates timestamp at 23:59:59Z against UTC calendar date', async () => {
      const midnightFixture = {
        ...devtoFixture,
        published_at: '2026-10-11T23:59:59Z'
      };

      jest.spyOn(urlSecurity, 'safeFetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => midnightFixture
      });

      const res = await request(app)
        .post('/api/v1/blogs/verify')
        .send({
          platform: 'devto',
          url: 'https://dev.to/janedoe/building-a-rest-api-with-nodejs-123',
          username: 'janedoe',
          publishedAt: '2026-10-11',
          topic: 'Backend Development',
          summary: 'A comprehensive guide to building clean, maintainable REST APIs with Node.js and Express.'
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(VERIFICATION_STATUS.VALID);
      expect(res.body.data.checks.publishedAt.status).toBe(CHECK_STATUS.PASSED);
      expect(res.body.data.checks.quarter.status).toBe(CHECK_STATUS.PASSED);
    });
  });

  describe('Quarter Verification (Current Quarter Check)', () => {
    test('fails verification when blog creation date is not in current quarter', async () => {
      const oldQuarterFixture = {
        ...devtoFixture,
        published_at: '2026-05-15T10:00:00Z' // April-June quarter (Q1)
      };

      jest.spyOn(urlSecurity, 'safeFetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => oldQuarterFixture
      });

      const res = await request(app)
        .post('/api/v1/blogs/verify')
        .send({
          platform: 'devto',
          url: 'https://dev.to/janedoe/building-a-rest-api-with-nodejs-123',
          username: 'janedoe',
          publishedAt: '2026-05-15',
          tags: ['nodejs', 'api', 'express'],
          topic: 'Backend Development',
          summary: 'A comprehensive guide to building clean, maintainable REST APIs with Node.js and Express.'
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(VERIFICATION_STATUS.INVALID);
      expect(res.body.data.checks.publishedAt.status).toBe(CHECK_STATUS.PASSED);
      expect(res.body.data.checks.quarter.status).toBe(CHECK_STATUS.FAILED);
      expect(res.body.data.checks.quarter.blogQuarter).toBe('April - June 2026');
      expect(res.body.data.checks.quarter.currentQuarter).toBe('October - December 2026');
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            code: ERROR_CODES.NOT_IN_CURRENT_QUARTER,
            field: 'publishedAt'
          })
        ])
      );
    });

    test('passes quarter check when blog is in reference quarter', async () => {
      const q2Fixture = {
        ...devtoFixture,
        published_at: '2026-08-20T10:00:00Z'
      };

      jest.spyOn(urlSecurity, 'safeFetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => q2Fixture
      });

      const res = await request(app)
        .post('/api/v1/blogs/verify')
        .send({
          platform: 'devto',
          url: 'https://dev.to/janedoe/building-a-rest-api-with-nodejs-123',
          username: 'janedoe',
          publishedAt: '2026-08-20',
          referenceDate: '2026-09-01', // reference date in Q2
          tags: ['nodejs', 'api', 'express'],
          topic: 'Backend Development',
          summary: 'A comprehensive guide to building clean, maintainable REST APIs with Node.js and Express.'
        });

      expect(res.status).toBe(200);
      expect(res.body.status).toBe(VERIFICATION_STATUS.VALID);
      expect(res.body.data.checks.quarter.status).toBe(CHECK_STATUS.PASSED);
      expect(res.body.data.checks.quarter.blogQuarter).toBe('July - September 2026');
      expect(res.body.data.checks.quarter.currentQuarter).toBe('July - September 2026');
    });
  });

  describe('HTTP Contract Status Codes', () => {
    test('returns 400 for malformed JSON or missing required fields', async () => {
      const res = await request(app)
        .post('/api/v1/blogs/verify')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.status).toBe('error');
    });

    test('returns 415 for unsupported Content-Type', async () => {
      const res = await request(app)
        .post('/api/v1/blogs/verify')
        .set('Content-Type', 'text/plain')
        .send('plain text');

      expect(res.status).toBe(415);
      expect(res.body.success).toBe(false);
    });

    test('returns 422 for unsupported platform', async () => {
      const res = await request(app)
        .post('/api/v1/blogs/verify')
        .send({
          platform: 'substack',
          url: 'https://dev.to/janedoe/building-a-rest-api-with-nodejs-123',
          username: 'janedoe',
          publishedAt: '2026-09-15',
          topic: 'Backend Development',
          summary: 'Guide'
        });

      expect(res.status).toBe(422);
      expect(res.body.errors[0].code).toBe(ERROR_CODES.INVALID_PLATFORM);
    });

    test('returns 404 for nonexistent route', async () => {
      const res = await request(app).get('/api/v1/nonexistent');
      expect(res.status).toBe(404);
      expect(res.body.errors[0].code).toBe('ROUTE_NOT_FOUND');
    });
  });
});

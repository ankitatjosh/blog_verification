const fs = require('fs');
const path = require('path');
const DevToAdapter = require('../../src/adapters/devto.adapter');
const MediumAdapter = require('../../src/adapters/medium.adapter');
const { ERROR_CODES } = require('../../src/constants/errorCodes');

describe('Platform Adapters Unit Tests', () => {
  describe('DevToAdapter', () => {
    let adapter;

    beforeEach(() => {
      adapter = new DevToAdapter();
    });

    test('buildApiUrl creates correct endpoint for dev.to article', () => {
      const url = 'https://dev.to/janedoe/building-a-node-api-123';
      const apiUrl = adapter.buildApiUrl(url);
      expect(apiUrl).toBe('https://dev.to/api/articles/janedoe/building-a-node-api-123');
    });

    test('normalizes DEV.to API fixture correctly', async () => {
      const fixturePath = path.join(__dirname, '../fixtures/devtoArticle.json');
      const fixtureData = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

      // Mock safeFetch by spying on safeFetch in urlSecurity
      const urlSecurity = require('../../src/utils/urlSecurity');
      jest.spyOn(urlSecurity, 'safeFetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => fixtureData
      });

      const metadata = await adapter.getArticleMetadata('https://dev.to/janedoe/building-a-rest-api-with-nodejs-123');
      expect(metadata.canonicalUrl).toBe(fixtureData.canonical_url);
      expect(metadata.author.username).toBe('janedoe');
      expect(metadata.publishedAt).toBe('2026-10-11T18:30:00Z');
      expect(metadata.tags).toEqual(['nodejs', 'api', 'express']);
      expect(metadata.description).toBe(fixtureData.description);
    });

    test('maps 404 response to ARTICLE_NOT_FOUND', async () => {
      const urlSecurity = require('../../src/utils/urlSecurity');
      jest.spyOn(urlSecurity, 'safeFetch').mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      await expect(
        adapter.getArticleMetadata('https://dev.to/janedoe/non-existent-article-123')
      ).rejects.toMatchObject({
        errorCode: ERROR_CODES.ARTICLE_NOT_FOUND
      });
    });

    test('maps 403 response to ARTICLE_ACCESS_DENIED', async () => {
      const urlSecurity = require('../../src/utils/urlSecurity');
      jest.spyOn(urlSecurity, 'safeFetch').mockResolvedValueOnce({
        ok: false,
        status: 403
      });

      await expect(
        adapter.getArticleMetadata('https://dev.to/janedoe/restricted-article-123')
      ).rejects.toMatchObject({
        errorCode: ERROR_CODES.ARTICLE_ACCESS_DENIED
      });
    });

    test('maps 429 response to SOURCE_RATE_LIMITED', async () => {
      const urlSecurity = require('../../src/utils/urlSecurity');
      jest.spyOn(urlSecurity, 'safeFetch').mockResolvedValueOnce({
        ok: false,
        status: 429
      });

      await expect(
        adapter.getArticleMetadata('https://dev.to/janedoe/article-123')
      ).rejects.toMatchObject({
        errorCode: ERROR_CODES.SOURCE_RATE_LIMITED
      });
    });
  });

  describe('MediumAdapter', () => {
    let adapter;

    beforeEach(() => {
      adapter = new MediumAdapter();
    });

    test('extracts username from @username URLs, bare identifiers, and subdomains', () => {
      expect(adapter.extractUsernameFromUrl('https://medium.com/@janedoe')).toBe('janedoe');
      expect(adapter.extractUsernameFromUrl('https://medium.com/@janedoe/my-post-123')).toBe('janedoe');
      expect(adapter.extractUsernameFromUrl('@janedoe')).toBe('janedoe');
      expect(adapter.extractUsername('thedevankit')).toBe('thedevankit');
      expect(adapter.extractUsername('https://thedevankit.medium.com')).toBe('thedevankit');
      expect(adapter.extractUsernameFromUrl('https://medium.com/topic/node')).toBeNull();
    });

    test('extracts author username and display name from JSON-LD author.identifier', async () => {
      const htmlWithIdentifier = `
        <!DOCTYPE html>
        <html>
        <head>
          <script type="application/ld+json">
          {
            "@context": "https://schema.org",
            "@type": "NewsArticle",
            "headline": "Testing Medium Identifier",
            "author": {
              "@context": "https://schema.org",
              "@id": "https://medium.com/@thedevankit",
              "@type": "Person",
              "identifier": "thedevankit",
              "name": "Ankitkumar Singh",
              "url": "https://medium.com/@thedevankit"
            },
            "datePublished": "2026-09-15T10:00:00.000Z",
            "description": "Article summary"
          }
          </script>
        </head>
        <body>
          <article><p>${'word '.repeat(510)}</p></article>
        </body>
        </html>
      `;

      const urlSecurity = require('../../src/utils/urlSecurity');
      jest.spyOn(urlSecurity, 'safeFetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => htmlWithIdentifier
      });

      const metadata = await adapter.getArticleMetadata('https://medium.com/@thedevankit/my-test-post-123');
      expect(metadata.author.username).toBe('thedevankit');
      expect(metadata.author.displayName).toBe('Ankitkumar Singh');
    });

    test('normalizes Medium HTML fixture with JSON-LD correctly', async () => {
      const fixturePath = path.join(__dirname, '../fixtures/mediumHtml.html');
      const fixtureHtml = fs.readFileSync(fixturePath, 'utf8');

      const urlSecurity = require('../../src/utils/urlSecurity');
      jest.spyOn(urlSecurity, 'safeFetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => fixtureHtml
      });

      const metadata = await adapter.getArticleMetadata('https://medium.com/@janedoe/building-a-rest-api-with-nodejs-7ca392289650');
      expect(metadata.author.username).toBe('janedoe');
      expect(metadata.publishedAt).toBe('2026-10-11T23:45:00.000Z');
      expect(metadata.tags).toEqual(['nodejs', 'api', 'express']);
      expect(metadata.description).toContain('guide to building clean');
    });

    test('maps 404 response to ARTICLE_NOT_FOUND', async () => {
      const urlSecurity = require('../../src/utils/urlSecurity');
      jest.spyOn(urlSecurity, 'safeFetch').mockResolvedValueOnce({
        ok: false,
        status: 404
      });

      await expect(
        adapter.getArticleMetadata('https://medium.com/@janedoe/non-existent-article-7ca392289650')
      ).rejects.toMatchObject({
        errorCode: ERROR_CODES.ARTICLE_NOT_FOUND
      });
    });
  });
});

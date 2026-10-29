const {
  validateArticleUrl,
  isIpAddressSafe,
  isHostAllowedForPlatform
} = require('../../src/utils/urlSecurity');
const { ERROR_CODES } = require('../../src/constants/errorCodes');

describe('URL Security and Validation', () => {
  describe('isIpAddressSafe', () => {
    test('returns true for public IP addresses', () => {
      expect(isIpAddressSafe('8.8.8.8')).toBe(true);
      expect(isIpAddressSafe('151.101.1.67')).toBe(true);
      expect(isIpAddressSafe('2606:4700::6811:d209')).toBe(true);
    });

    test('returns false for loopback addresses', () => {
      expect(isIpAddressSafe('127.0.0.1')).toBe(false);
      expect(isIpAddressSafe('127.0.1.1')).toBe(false);
      expect(isIpAddressSafe('::1')).toBe(false);
    });

    test('returns false for private network ranges', () => {
      expect(isIpAddressSafe('10.0.0.1')).toBe(false);
      expect(isIpAddressSafe('172.16.0.1')).toBe(false);
      expect(isIpAddressSafe('172.31.255.254')).toBe(false);
      expect(isIpAddressSafe('192.168.1.1')).toBe(false);
      expect(isIpAddressSafe('fc00::1')).toBe(false);
    });

    test('returns false for link-local and cloud metadata addresses', () => {
      expect(isIpAddressSafe('169.254.169.254')).toBe(false);
      expect(isIpAddressSafe('fe80::1')).toBe(false);
    });
  });

  describe('isHostAllowedForPlatform', () => {
    test('allows dev.to and www.dev.to for devto', () => {
      expect(isHostAllowedForPlatform('dev.to', 'devto')).toBe(true);
      expect(isHostAllowedForPlatform('www.dev.to', 'devto')).toBe(true);
      expect(isHostAllowedForPlatform('evil-dev.to', 'devto')).toBe(false);
      expect(isHostAllowedForPlatform('medium.com', 'devto')).toBe(false);
    });

    test('allows medium.com, www.medium.com, and valid subdomains for medium', () => {
      expect(isHostAllowedForPlatform('medium.com', 'medium')).toBe(true);
      expect(isHostAllowedForPlatform('www.medium.com', 'medium')).toBe(true);
      expect(isHostAllowedForPlatform('janedoe.medium.com', 'medium')).toBe(true);
      expect(isHostAllowedForPlatform('notmedium.com', 'medium')).toBe(false);
    });
  });

  describe('validateArticleUrl', () => {
    test('accepts valid dev.to article URL', () => {
      const url = 'https://dev.to/janedoe/building-a-node-api-123';
      const parsed = validateArticleUrl(url, 'devto');
      expect(parsed.hostname).toBe('dev.to');
    });

    test('accepts valid Medium article URL', () => {
      const url = 'https://medium.com/@janedoe/building-a-node-api-123';
      const parsed = validateArticleUrl(url, 'medium');
      expect(parsed.hostname).toBe('medium.com');
    });

    test('rejects dev.to homepage', () => {
      expect(() => validateArticleUrl('https://dev.to/', 'devto')).toThrow(
        expect.objectContaining({ errorCode: ERROR_CODES.INVALID_URL })
      );
    });

    test('rejects dev.to profile URLs', () => {
      expect(() => validateArticleUrl('https://dev.to/janedoe', 'devto')).toThrow(
        expect.objectContaining({ errorCode: ERROR_CODES.INVALID_URL })
      );
    });

    test('rejects Medium profile URLs', () => {
      expect(() => validateArticleUrl('https://medium.com/@janedoe', 'medium')).toThrow(
        expect.objectContaining({ errorCode: ERROR_CODES.INVALID_URL })
      );
    });

    test('rejects mismatched host for platform', () => {
      expect(() => validateArticleUrl('https://dev.to/janedoe/article-1', 'medium')).toThrow(
        expect.objectContaining({ errorCode: ERROR_CODES.INVALID_URL })
      );
    });

    test('rejects HTTP in production mode', () => {
      const origEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      try {
        expect(() => validateArticleUrl('http://dev.to/janedoe/article-1', 'devto')).toThrow(
          expect.objectContaining({ errorCode: ERROR_CODES.INVALID_URL })
        );
      } finally {
        process.env.NODE_ENV = origEnv;
      }
    });

    test('accepts valid Medium subdomain article URL', () => {
      const parsed = validateArticleUrl('https://janedoe.medium.com/my-awesome-post-123', 'medium');
      expect(parsed.hostname).toBe('janedoe.medium.com');
    });

    test('rejects Medium subdomain homepage without article', () => {
      expect(() => validateArticleUrl('https://janedoe.medium.com/', 'medium')).toThrow(
        expect.objectContaining({ errorCode: ERROR_CODES.INVALID_URL })
      );
    });
  });

  describe('assertSafeDestination', () => {
    const { assertSafeDestination } = require('../../src/utils/urlSecurity');

    test('rejects localhost explicitly', async () => {
      await expect(assertSafeDestination('localhost')).rejects.toMatchObject({
        errorCode: ERROR_CODES.UNSAFE_URL
      });
    });

    test('rejects loopback IP literals', async () => {
      await expect(assertSafeDestination('127.0.0.1')).rejects.toMatchObject({
        errorCode: ERROR_CODES.UNSAFE_URL
      });
    });
  });

  describe('safeFetch', () => {
    const { safeFetch } = require('../../src/utils/urlSecurity');

    test('rejects redirect to unapproved platform host', async () => {
      const mockFetch = jest.fn()
        .mockResolvedValueOnce({
          status: 302,
          headers: new Map([['location', 'https://evil-attacker.com/steal']])
        });
      global.fetch = mockFetch;

      await expect(
        safeFetch('https://dev.to/janedoe/redirect', {}, 'devto')
      ).rejects.toMatchObject({
        errorCode: ERROR_CODES.UNSAFE_URL
      });
    });
  });
});

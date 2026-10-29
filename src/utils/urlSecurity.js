const dns = require('dns').promises;
const ipaddr = require('ipaddr.js');
const { AppError, UpstreamError } = require('./errors');
const { ERROR_CODES } = require('../constants/errorCodes');

const ALLOWED_HOSTS = {
  devto: [
    'dev.to',
    'www.dev.to'
  ],
  medium: [
    'medium.com',
    'www.medium.com'
  ]
};

// Prohibited IP ranges according to SSRF mitigation guidelines
const PROHIBITED_IP_RANGES = [
  'unspecified',
  'broadcast',
  'multicast',
  'linkLocal',
  'loopback',
  'private',
  'carrierGradeNat',
  'reserved',
  'uniqueLocal'
];

/**
 * Checks if an IP address belongs to any private/internal/reserved range.
 * 
 * @param {string} ipString 
 * @returns {boolean} true if safe (public unicast), false if prohibited
 */
function isIpAddressSafe(ipString) {
  try {
    let addr = ipaddr.parse(ipString);
    if (addr.kind() === 'ipv6' && addr.isIPv4MappedAddress()) {
      addr = addr.toIPv4Address();
    }
    const range = addr.range();
    if (PROHIBITED_IP_RANGES.includes(range)) {
      return false;
    }
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Checks if a hostname is allowed for a given platform.
 * 
 * @param {string} hostname 
 * @param {'medium'|'devto'} platform 
 * @returns {boolean}
 */
function isHostAllowedForPlatform(hostname, platform) {
  if (!hostname || typeof hostname !== 'string') return false;
  const lowerHost = hostname.toLowerCase();

  if (platform === 'devto') {
    return ALLOWED_HOSTS.devto.includes(lowerHost);
  }

  if (platform === 'medium') {
    if (ALLOWED_HOSTS.medium.includes(lowerHost)) {
      return true;
    }
    // Medium also supports subdomain user blogs, e.g. username.medium.com
    if (lowerHost.endsWith('.medium.com')) {
      const subdomain = lowerHost.slice(0, -'.medium.com'.length);
      // Valid subdomain alphanumeric or hyphens
      return /^[a-z0-9-]+$/.test(subdomain);
    }
    return false;
  }

  return false;
}

/**
 * Validates URL format, platform host matching, and path pattern.
 * Rejects profile URLs and homepages per FR-03.
 * 
 * @param {string} urlString 
 * @param {'medium'|'devto'} platform 
 * @returns {URL} parsed URL object
 */
function validateArticleUrl(urlString, platform) {
  let parsedUrl;
  try {
    parsedUrl = new URL(urlString);
  } catch (err) {
    throw new AppError(ERROR_CODES.INVALID_URL, 'Malformed URL provided.', 422, 'url');
  }

  // Protocol check
  const isProd = process.env.NODE_ENV === 'production';
  if (parsedUrl.protocol !== 'https:' && (isProd || parsedUrl.protocol !== 'http:')) {
    throw new AppError(
      ERROR_CODES.INVALID_URL,
      'URL must use HTTPS protocol.',
      422,
      'url'
    );
  }

  // Host validation
  if (!isHostAllowedForPlatform(parsedUrl.hostname, platform)) {
    throw new AppError(
      ERROR_CODES.INVALID_URL,
      `URL host '${parsedUrl.hostname}' is not supported for platform '${platform}'.`,
      422,
      'url'
    );
  }

  const pathname = parsedUrl.pathname.replace(/\/+$/, ''); // strip trailing slashes
  const segments = pathname.split('/').filter(Boolean);

  // Reject homepages
  if (segments.length === 0) {
    throw new AppError(
      ERROR_CODES.INVALID_URL,
      'Homepage URLs are not allowed. Provide a specific article URL.',
      422,
      'url'
    );
  }

  // Platform-specific path checks
  if (platform === 'devto') {
    // Valid DEV.to article paths:
    // /username/slug (e.g. /janedoe/building-a-node-api-123)
    // /organization/slug
    // Reserved non-article paths on DEV.to: t, tags, top, search, listings, podcast, videos, enter, admin
    const reservedDevPaths = ['t', 'tags', 'top', 'latest', 'search', 'listings', 'podcasts', 'videos', 'enter', 'admin', 'about', 'privacy', 'terms'];
    if (segments.length < 2 || reservedDevPaths.includes(segments[0].toLowerCase())) {
      throw new AppError(
        ERROR_CODES.INVALID_URL,
        'Profile or index DEV.to URLs are not allowed. An article slug is required.',
        422,
        'url'
      );
    }
  }

  if (platform === 'medium') {
    // Valid Medium article paths:
    // /@username/slug-id (2 segments, starts with @)
    // /p/id (2 segments, starts with p)
    // /publication-name/slug-id (2 segments)
    // Or on subdomain: username.medium.com/slug-id (1 segment)
    const isSubdomain = parsedUrl.hostname.toLowerCase().endsWith('.medium.com') &&
      !['medium.com', 'www.medium.com'].includes(parsedUrl.hostname.toLowerCase());

    const reservedMediumPaths = ['tag', 'topics', 'm', 'search', 'plans', 'creators', 'about', 'policy'];

    if (isSubdomain) {
      if (segments.length < 1 || reservedMediumPaths.includes(segments[0].toLowerCase())) {
        throw new AppError(
          ERROR_CODES.INVALID_URL,
          'Subdomain index URLs are not allowed. An article slug is required.',
          422,
          'url'
        );
      }
    } else {
      // If it's just /@username, it's a profile URL
      if (segments.length === 1 && segments[0].startsWith('@')) {
        throw new AppError(
          ERROR_CODES.INVALID_URL,
          'Profile URLs are not allowed. An article slug is required.',
          422,
          'url'
        );
      }
      if (segments.length < 2 || reservedMediumPaths.includes(segments[0].toLowerCase())) {
        throw new AppError(
          ERROR_CODES.INVALID_URL,
          'Invalid Medium article URL format.',
          422,
          'url'
        );
      }
    }
  }

  return parsedUrl;
}

/**
 * Resolves hostname via DNS and checks for SSRF risks.
 * 
 * @param {string} hostname 
 */
async function assertSafeDestination(hostname) {
  // Disallow explicit IP literals or localhost
  if (hostname === 'localhost' || /^127\./.test(hostname) || hostname === '::1' || hostname === '0.0.0.0') {
    throw new AppError(ERROR_CODES.UNSAFE_URL, 'URL targets a loopback or internal address.', 422, 'url');
  }

  let addresses;
  try {
    addresses = await dns.lookup(hostname, { all: true });
  } catch (err) {
    throw new AppError(ERROR_CODES.INVALID_URL, `Unable to resolve host: ${hostname}`, 422, 'url');
  }

  if (!addresses || addresses.length === 0) {
    throw new AppError(ERROR_CODES.INVALID_URL, `No DNS records found for host: ${hostname}`, 422, 'url');
  }

  for (const { address } of addresses) {
    if (!isIpAddressSafe(address)) {
      throw new AppError(
        ERROR_CODES.UNSAFE_URL,
        `Resolved destination IP '${address}' violates outbound request security policy.`,
        422,
        'url'
      );
    }
  }
}

/**
 * Safe outbound fetch wrapper that prevents SSRF, enforces timeouts,
 * limits redirects, and validates every redirect destination.
 * 
 * @param {string} urlString 
 * @param {object} options 
 * @param {'medium'|'devto'} platform 
 * @returns {Promise<Response>}
 */
async function safeFetch(urlString, options = {}, platform = null) {
  const maxRedirects = 5;
  const timeoutMs = parseInt(process.env.REQUEST_TIMEOUT_MS, 10) || 5000;
  let currentUrl = urlString;
  let redirectCount = 0;

  while (redirectCount <= maxRedirects) {
    const parsed = new URL(currentUrl);

    // Verify platform host if platform specified
    if (platform && !isHostAllowedForPlatform(parsed.hostname, platform)) {
      throw new AppError(
        ERROR_CODES.UNSAFE_URL,
        `Redirect to unapproved host '${parsed.hostname}' is not permitted.`,
        422,
        'url'
      );
    }

    // SSRF verification (unless skipped in local mock testing if explicitly configured)
    if (process.env.SKIP_DNS_CHECK !== 'true') {
      await assertSafeDestination(parsed.hostname);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(currentUrl, {
        ...options,
        redirect: 'manual',
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Handle redirects manually
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location');
        if (!location) {
          throw new UpstreamError(ERROR_CODES.SOURCE_RESPONSE_INVALID, 'Redirect response missing Location header.');
        }

        const nextUrl = new URL(location, currentUrl).href;
        redirectCount++;
        if (redirectCount > maxRedirects) {
          throw new UpstreamError(ERROR_CODES.SOURCE_RESPONSE_INVALID, 'Too many redirects encountered.');
        }

        currentUrl = nextUrl;
        continue;
      }

      return response;
    } catch (err) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new UpstreamError(ERROR_CODES.SOURCE_TIMEOUT, 'The source platform did not respond within the allowed time.');
      }
      if (err instanceof AppError || err instanceof UpstreamError) {
        throw err;
      }
      throw new UpstreamError(ERROR_CODES.SOURCE_UNAVAILABLE, `Upstream network error: ${err.message}`);
    }
  }

  throw new UpstreamError(ERROR_CODES.SOURCE_RESPONSE_INVALID, 'Exceeded maximum redirect depth.');
}

module.exports = {
  ALLOWED_HOSTS,
  PROHIBITED_IP_RANGES,
  isIpAddressSafe,
  isHostAllowedForPlatform,
  validateArticleUrl,
  assertSafeDestination,
  safeFetch
};

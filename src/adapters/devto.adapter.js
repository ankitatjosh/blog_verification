const BaseAdapter = require('./base.adapter');
const urlSecurity = require('../utils/urlSecurity');
const { countWords } = require('../utils/normalize');
const { UpstreamError } = require('../utils/errors');
const { ERROR_CODES } = require('../constants/errorCodes');

class DevToAdapter extends BaseAdapter {
  constructor() {
    super('devto');
  }

  /**
   * Builds the official Forem / DEV.to API endpoint URL for an article URL.
   * 
   * @param {string} urlString 
   * @returns {string} API endpoint URL
   */
  buildApiUrl(urlString) {
    const parsed = urlSecurity.validateArticleUrl(urlString, 'devto');
    const segments = parsed.pathname.replace(/\/+$/, '').split('/').filter(Boolean);

    // dev.to/{username_or_org}/{slug}
    if (segments.length >= 2) {
      return `https://dev.to/api/articles/${segments[0]}/${segments[1]}`;
    }

    throw new UpstreamError(ERROR_CODES.INVALID_URL, 'Could not determine DEV.to article path.');
  }

  /**
   * Retrieves metadata for a DEV.to article using the official Forem API.
   * 
   * @param {string} url 
   * @param {object} [options] 
   * @returns {Promise<object>}
   */
  async getArticleMetadata(url, options = {}) {
    const apiUrl = this.buildApiUrl(url);

    const response = await urlSecurity.safeFetch(
      apiUrl,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'BlogVerificationAPI/1.0 (+https://github.com/blog-verification)'
        }
      },
      'devto'
    );

    if (response.status === 404) {
      throw new UpstreamError(ERROR_CODES.ARTICLE_NOT_FOUND, 'The specified article does not exist on DEV Community.');
    }

    if (response.status === 401 || response.status === 403) {
      throw new UpstreamError(ERROR_CODES.ARTICLE_ACCESS_DENIED, 'Access to the DEV Community article is restricted.');
    }

    if (response.status === 429) {
      throw new UpstreamError(ERROR_CODES.SOURCE_RATE_LIMITED, 'DEV Community API rate limit exceeded.');
    }

    if (response.status >= 500) {
      throw new UpstreamError(ERROR_CODES.SOURCE_UNAVAILABLE, `DEV Community returned HTTP ${response.status}.`);
    }

    if (!response.ok) {
      throw new UpstreamError(
        ERROR_CODES.SOURCE_RESPONSE_INVALID,
        `DEV Community returned unexpected status ${response.status}.`
      );
    }

    let data;
    try {
      data = await response.json();
    } catch (err) {
      throw new UpstreamError(ERROR_CODES.SOURCE_RESPONSE_INVALID, 'Failed to parse DEV Community response JSON.');
    }

    if (!data || typeof data !== 'object') {
      throw new UpstreamError(ERROR_CODES.SOURCE_RESPONSE_INVALID, 'Malformed JSON payload from DEV Community.');
    }

    // Extract tags
    let tags = null;
    if (Array.isArray(data.tag_list)) {
      tags = data.tag_list;
    } else if (Array.isArray(data.tags)) {
      tags = data.tags;
    } else if (typeof data.tags === 'string') {
      tags = data.tags.split(',').map((t) => t.trim()).filter(Boolean);
    }

    // Extract body content and word count
    const content = data.body_markdown || data.body_html || null;
    const wordCount = content ? countWords(content) : null;

    return {
      canonicalUrl: data.canonical_url || data.url || url,
      platform: 'devto',
      author: {
        username: data.user?.username || null,
        displayName: data.user?.name || null
      },
      publishedAt: data.published_at || null,
      updatedAt: data.edited_at || null,
      tags,
      topic: null, // No native topic field on dev.to; resolved via taxonomy mapper
      description: data.description || null,
      content,
      wordCount,
      rawMetadata: data
    };
  }
}

module.exports = DevToAdapter;

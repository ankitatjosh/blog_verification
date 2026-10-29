const BaseAdapter = require('./base.adapter');
const urlSecurity = require('../utils/urlSecurity');
const { countWords } = require('../utils/normalize');
const { UpstreamError } = require('../utils/errors');
const { ERROR_CODES } = require('../constants/errorCodes');

class MediumAdapter extends BaseAdapter {
  constructor() {
    super('medium');
  }

  /**
   * Extracts canonical username from a username string, identifier, or Medium author URL.
   * Medium canonical usernames are formatted as @username or bare username identifiers.
   * 
   * @param {string} input 
   * @returns {string|null}
   */
  extractUsername(input) {
    if (!input || typeof input !== 'string') return null;
    const trimmed = input.trim();

    // 1. If it has @username in URL or path (e.g. https://medium.com/@thedevankit or @thedevankit)
    const atMatch = trimmed.match(/@([a-zA-Z0-9_.-]+)/);
    if (atMatch && atMatch[1]) {
      return atMatch[1];
    }

    // 2. If it's a subdomain URL (e.g. https://thedevankit.medium.com)
    const subMatch = trimmed.match(/^https?:\/\/([a-zA-Z0-9_-]+)\.medium\.com/i);
    if (subMatch && subMatch[1] && !['www', 'api', 'cdn-images-1'].includes(subMatch[1].toLowerCase())) {
      return subMatch[1];
    }

    // 3. If it's already a clean username / identifier string (e.g. "thedevankit")
    if (!trimmed.includes('/') && !trimmed.includes(':') && /^[a-zA-Z0-9_.-]+$/.test(trimmed)) {
      return trimmed.replace(/^@/, '');
    }

    return null;
  }

  /**
   * Alias for backwards compatibility
   */
  extractUsernameFromUrl(urlString) {
    return this.extractUsername(urlString);
  }

  /**
   * Extracts article body HTML/text content from Medium page.
   * 
   * @param {string} html 
   * @returns {string|null}
   */
  extractArticleContent(html) {
    if (!html || typeof html !== 'string') return null;
    const articleMatch = html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i);
    if (articleMatch) {
      return articleMatch[1];
    }
    const pMatches = [...html.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map((m) => m[1]);
    if (pMatches.length > 0) {
      return pMatches.join(' ');
    }
    return null;
  }

  /**
   * Parses JSON-LD script blocks from HTML string.
   * 
   * @param {string} html 
   * @returns {object[]}
   */
  parseJsonLd(html) {
    const jsonLdBlocks = [];
    const regex = /<script\b[^>]*\btype=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
    let match;
    while ((match = regex.exec(html)) !== null) {
      try {
        const parsed = JSON.parse(match[1]);
        if (Array.isArray(parsed)) {
          jsonLdBlocks.push(...parsed);
        } else if (parsed && typeof parsed === 'object') {
          if (Array.isArray(parsed['@graph'])) {
            jsonLdBlocks.push(...parsed['@graph']);
          } else {
            jsonLdBlocks.push(parsed);
          }
        }
      } catch (err) {
        // Skip unparseable JSON-LD blocks
      }
    }
    return jsonLdBlocks;
  }

  /**
   * Extracts meta tag attributes from HTML.
   * 
   * @param {string} html 
   * @returns {object}
   */
  parseMetaTags(html) {
    const meta = {
      publishedTime: null,
      authorUrl: null,
      authorName: null,
      description: null,
      canonicalUrl: null,
      tags: []
    };

    // Extract meta tags
    const metaRegex = /<meta\s+([^>]+)>/gi;
    let match;
    while ((match = metaRegex.exec(html)) !== null) {
      const tagContent = match[1];

      const getAttr = (name) => {
        const attrMatch = tagContent.match(new RegExp(`${name}=["']([^"']*)["']`, 'i'));
        return attrMatch ? attrMatch[1] : null;
      };

      const prop = getAttr('property') || getAttr('name');
      const content = getAttr('content');

      if (!prop || !content) continue;

      const lowerProp = prop.toLowerCase();
      if (lowerProp === 'article:published_time') {
        meta.publishedTime = content;
      } else if (lowerProp === 'article:author') {
        meta.authorUrl = content;
      } else if (lowerProp === 'author') {
        meta.authorName = content;
      } else if (lowerProp === 'description' && !meta.description) {
        meta.description = content;
      } else if (lowerProp === 'og:description' && !meta.description) {
        meta.description = content;
      } else if (lowerProp === 'article:tag') {
        meta.tags.push(content);
      }
    }

    // Canonical link
    const canonicalMatch = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/i);
    if (canonicalMatch) {
      meta.canonicalUrl = canonicalMatch[1];
    }

    return meta;
  }

  /**
   * Retrieves and normalizes metadata for a Medium article.
   * 
   * @param {string} url 
   * @param {object} [options] 
   * @returns {Promise<object>}
   */
  async getArticleMetadata(url, options = {}) {
    urlSecurity.validateArticleUrl(url, 'medium');

    const response = await urlSecurity.safeFetch(
      url,
      {
        headers: {
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 BlogVerificationAPI/1.0'
        }
      },
      'medium'
    );

    if (response.status === 404) {
      throw new UpstreamError(ERROR_CODES.ARTICLE_NOT_FOUND, 'The specified article does not exist on Medium.');
    }

    if (response.status === 401 || response.status === 403) {
      throw new UpstreamError(ERROR_CODES.ARTICLE_ACCESS_DENIED, 'Access to Medium article is restricted.');
    }

    if (response.status === 429) {
      throw new UpstreamError(ERROR_CODES.SOURCE_RATE_LIMITED, 'Medium rate limit exceeded.');
    }

    if (response.status >= 500) {
      throw new UpstreamError(ERROR_CODES.SOURCE_UNAVAILABLE, `Medium returned HTTP ${response.status}.`);
    }

    if (!response.ok) {
      throw new UpstreamError(ERROR_CODES.SOURCE_RESPONSE_INVALID, `Medium returned HTTP ${response.status}.`);
    }

    let html;
    try {
      html = await response.text();
    } catch (err) {
      throw new UpstreamError(ERROR_CODES.SOURCE_RESPONSE_INVALID, 'Failed to read response body from Medium.');
    }

    const metaTags = this.parseMetaTags(html);
    const jsonLdBlocks = this.parseJsonLd(html);

    // 1. Locate article JSON-LD block and author block
    let authorObj = null;
    let articleBlock = jsonLdBlocks.find(
      (b) => ['NewsArticle', 'BlogPosting', 'Article', 'TechArticle'].includes(b['@type'])
    );

    if (articleBlock && articleBlock.author) {
      authorObj = Array.isArray(articleBlock.author) ? articleBlock.author[0] : articleBlock.author;
    }

    // If author not found in specific article block, inspect all JSON-LD blocks
    if (!authorObj) {
      for (const block of jsonLdBlocks) {
        if (block && block.author) {
          authorObj = Array.isArray(block.author) ? block.author[0] : block.author;
          if (!articleBlock) articleBlock = block;
          break;
        }
        if (block && block['@type'] === 'Person') {
          authorObj = block;
          break;
        }
      }
    }

    articleBlock = articleBlock || jsonLdBlocks[0] || {};

    // Canonical URL
    const canonicalUrl = metaTags.canonicalUrl || articleBlock.mainEntityOfPage || articleBlock.url || url;

    // Canonical Author Extraction:
    // Prioritize JSON-LD author object: identifier, @id, url, and name
    let canonicalUsername = null;
    let displayName = null;

    if (authorObj) {
      if (typeof authorObj === 'object' && authorObj !== null) {
        displayName = authorObj.name || null;

        if (authorObj.identifier) {
          canonicalUsername = this.extractUsername(authorObj.identifier);
        }

        if (!canonicalUsername && authorObj['@id']) {
          canonicalUsername = this.extractUsername(authorObj['@id']);
        }

        if (!canonicalUsername && authorObj.url) {
          canonicalUsername = this.extractUsername(authorObj.url);
        }
      } else if (typeof authorObj === 'string') {
        canonicalUsername = this.extractUsername(authorObj);
      }
    }

    // Fallbacks to meta tags or article URL if still not resolved
    if (!canonicalUsername && metaTags.authorUrl) {
      canonicalUsername = this.extractUsername(metaTags.authorUrl);
    }

    if (!canonicalUsername) {
      canonicalUsername = this.extractUsername(canonicalUrl) || this.extractUsername(url);
    }

    if (!displayName && metaTags.authorName) {
      displayName = metaTags.authorName;
    }

    // Original publication date:
    const publishedAt = articleBlock.datePublished || jsonLdBlocks[0]?.datePublished || metaTags.publishedTime || null;
    const updatedAt = articleBlock.dateModified || jsonLdBlocks[0]?.dateModified || null;

    // Description/Summary:
    const description = articleBlock.description || jsonLdBlocks[0]?.description || metaTags.description || null;

    // Tags/Keywords:
    let tags = [];
    const rawKeywords = articleBlock.keywords || jsonLdBlocks[0]?.keywords;
    if (Array.isArray(rawKeywords)) {
      tags = rawKeywords;
    } else if (typeof rawKeywords === 'string') {
      tags = rawKeywords.split(',').map((k) => k.trim()).filter(Boolean);
    } else if (metaTags.tags.length > 0) {
      tags = metaTags.tags;
    } else {
      tags = null;
    }

    // Extract article content and word count
    const content = this.extractArticleContent(html);
    const wordCount = content ? countWords(content) : null;

    return {
      canonicalUrl,
      platform: 'medium',
      author: {
        username: canonicalUsername,
        displayName
      },
      publishedAt,
      updatedAt,
      tags,
      topic: null,
      description,
      content,
      wordCount,
      rawMetadata: {
        metaTags,
        articleBlock
      }
    };
  }
}

module.exports = MediumAdapter;

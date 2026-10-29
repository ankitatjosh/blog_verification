const he = require('he');

/**
 * Normalizes a username:
 * - Trims whitespace
 * - Removes leading '@' if present
 * - Lowercases for case-insensitive platform comparison
 * 
 * @param {string} username 
 * @returns {string}
 */
function normalizeUsername(username) {
  if (!username || typeof username !== 'string') return '';
  let cleaned = username.trim();
  if (cleaned.startsWith('@')) {
    cleaned = cleaned.slice(1).trim();
  }
  return cleaned.toLowerCase();
}

/**
 * Normalizes an array of tags:
 * - Trims whitespace
 * - Lowercases
 * - Removes duplicates
 * - Filters out empty strings
 * - Sorts for deterministic representation
 * 
 * @param {string[]} tags 
 * @returns {string[]}
 */
function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  const set = new Set();
  for (const tag of tags) {
    if (typeof tag === 'string') {
      const trimmed = tag.trim().toLowerCase();
      if (trimmed.length > 0) {
        set.add(trimmed);
      }
    }
  }
  return Array.from(set).sort();
}

/**
 * Compares two sets of tags for equality, ignoring order.
 * 
 * @param {string[]} expectedTags 
 * @param {string[]} sourceTags 
 * @returns {{ match: boolean, normalizedExpected: string[], normalizedActual: string[] }}
 */
function compareTagSets(expectedTags, sourceTags) {
  const normExpected = normalizeTags(expectedTags);
  const normActual = normalizeTags(sourceTags);

  if (normExpected.length !== normActual.length) {
    return { match: false, normalizedExpected: normExpected, normalizedActual: normActual };
  }

  const expectedSet = new Set(normExpected);
  for (const tag of normActual) {
    if (!expectedSet.has(tag)) {
      return { match: false, normalizedExpected: normExpected, normalizedActual: normActual };
    }
  }

  return { match: true, normalizedExpected: normExpected, normalizedActual: normActual };
}

/**
 * Normalizes article summary/description according to FR-08:
 * - Removes HTML tags
 * - Decodes HTML entities (e.g. &amp;, &quot;, &#39;, &lt;, &gt;)
 * - Trims leading and trailing whitespace
 * - Collapses repeated whitespace
 * - Lowercases for case-insensitive comparison policy
 * 
 * @param {string} text 
 * @returns {string}
 */
function normalizeSummary(text) {
  if (!text || typeof text !== 'string') return '';
  // 1. Remove HTML tags
  let stripped = text.replace(/<[^>]*>/g, ' ');
  // 2. Decode HTML entities
  let decoded = he.decode(stripped);
  // 3. Collapse whitespace and trim
  let collapsed = decoded.replace(/\s+/g, ' ').trim();
  // 4. Case-normalization policy (lowercase)
  return collapsed.toLowerCase();
}

/**
 * Compares expected summary and actual source description.
 * 
 * @param {string} expectedSummary 
 * @param {string} sourceDescription 
 * @returns {{ match: boolean, normalizedExpected: string, normalizedActual: string }}
 */
function compareSummaries(expectedSummary, sourceDescription) {
  const normExpected = normalizeSummary(expectedSummary);
  const normActual = normalizeSummary(sourceDescription);

  return {
    match: normExpected.length > 0 && normActual.length > 0 && normExpected === normActual,
    normalizedExpected: normExpected,
    normalizedActual: normActual
  };
}

/**
 * Calculates the number of words in an article or text.
 * - Strips HTML tags
 * - Decodes HTML entities
 * - Splits on whitespace and counts non-empty word tokens
 * 
 * @param {string} text 
 * @returns {number}
 */
function countWords(text) {
  if (!text || typeof text !== 'string') return 0;
  const stripped = text.replace(/<[^>]*>/g, ' ');
  const decoded = he.decode(stripped);
  const words = decoded.trim().split(/\s+/).filter(Boolean);
  return words.length;
}

module.exports = {
  normalizeUsername,
  normalizeTags,
  compareTagSets,
  normalizeSummary,
  compareSummaries,
  countWords
};

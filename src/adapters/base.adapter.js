/**
 * Base adapter class defining the contract for platform adapters.
 */
class BaseAdapter {
  constructor(platformName) {
    this.platform = platformName;
  }

  /**
   * Retrieves and normalizes article metadata from the source platform.
   * 
   * @param {string} url 
   * @param {object} [options]
   * @returns {Promise<{
   *   canonicalUrl: string,
   *   platform: string,
   *   author: { username: string|null, displayName: string|null },
   *   publishedAt: string|null,
   *   updatedAt: string|null,
   *   tags: string[]|null,
   *   topic: string|null,
   *   description: string|null,
   *   rawMetadata?: any
   * }>}
   */
  async getArticleMetadata(url, options = {}) {
    throw new Error(`getArticleMetadata not implemented for adapter ${this.platform}`);
  }
}

module.exports = BaseAdapter;

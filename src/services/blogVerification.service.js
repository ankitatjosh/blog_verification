const DevToAdapter = require('../adapters/devto.adapter');
const MediumAdapter = require('../adapters/medium.adapter');
const validationService = require('./validation.service');
const urlSecurity = require('../utils/urlSecurity');
const { AppError, UpstreamError } = require('../utils/errors');
const { ERROR_CODES } = require('../constants/errorCodes');

class BlogVerificationService {
  constructor() {
    this.adapters = {
      devto: new DevToAdapter(),
      medium: new MediumAdapter()
    };
  }

  /**
   * Retrieves adapter for the requested platform.
   * 
   * @param {'medium'|'devto'} platform 
   * @returns {BaseAdapter}
   */
  getAdapter(platform) {
    const adapter = this.adapters[platform];
    if (!adapter) {
      throw new AppError(ERROR_CODES.INVALID_PLATFORM, `Unsupported platform: '${platform}'.`, 422, 'platform');
    }
    return adapter;
  }

  /**
   * Orchestrates the blog verification flow.
   * 
   * @param {object} requestData Validated request body
   * @returns {Promise<object>} Verification response payload
   */
  async verifyBlog(requestData) {
    const adapter = this.getAdapter(requestData.platform);

    // Validate URL syntax, host, and path format before contacting platform
    urlSecurity.validateArticleUrl(requestData.url, requestData.platform);

    let metadata;
    try {
      metadata = await adapter.getArticleMetadata(requestData.url);
    } catch (err) {
      if (err instanceof UpstreamError) {
        return validationService.buildSourceFailureResponse(requestData, err);
      }
      throw err;
    }

    return validationService.evaluate(requestData, metadata);
  }
}

module.exports = new BlogVerificationService();

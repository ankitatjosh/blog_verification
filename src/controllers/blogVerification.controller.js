const blogVerificationService = require('../services/blogVerification.service');
const { validateVerificationRequest } = require('../validators/blogVerification.schema');
const { ERROR_CODES } = require('../constants/errorCodes');

class BlogVerificationController {
  /**
   * Handles POST /api/v1/blogs/verify
   * 
   * @param {import('express').Request} req 
   * @param {import('express').Response} res 
   * @param {import('express').NextFunction} next 
   */
  async verify(req, res, next) {
    try {
      // 1. Validate request body schema
      const validationResult = validateVerificationRequest(req.body);
      if (!validationResult.success) {
        const hasMissing = validationResult.errors.some(
          (e) => e.code === ERROR_CODES.MISSING_REQUIRED_FIELD || e.code === ERROR_CODES.INVALID_REQUEST
        );
        const hasUnprocessable = validationResult.errors.some(
          (e) => e.code === ERROR_CODES.INVALID_PLATFORM || e.code === ERROR_CODES.INVALID_URL
        );
        const statusCode = hasMissing ? 400 : (hasUnprocessable ? 422 : 400);

        return res.status(statusCode).json({
          success: false,
          status: 'error',
          message: 'Request validation failed.',
          errors: validationResult.errors
        });
      }

      // 2. Perform verification
      const verificationResponse = await blogVerificationService.verifyBlog(validationResult.data);

      // Verification completed outcomes (valid, invalid, unverified) return 200 OK
      return res.status(200).json(verificationResponse);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = new BlogVerificationController();

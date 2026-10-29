const { z } = require('zod');
const { isValidCalendarDate } = require('../utils/date');
const { ERROR_CODES } = require('../constants/errorCodes');

const blogVerificationSchema = z.object({
  platform: z.enum(['medium', 'devto'], {
    errorMap: (issue) => {
      if (issue.code === z.ZodIssueCode.invalid_enum_value || issue.code === z.ZodIssueCode.invalid_type) {
        return { message: "Platform must be either 'medium' or 'devto'." };
      }
      return { message: 'Invalid platform.' };
    }
  }),
  url: z.string({
    required_error: 'URL is required.',
    invalid_type_error: 'URL must be a string.'
  })
    .trim()
    .min(1, 'URL cannot be empty.')
    .max(2048, 'URL must not exceed 2048 characters.')
    .url('Invalid URL format.'),

  username: z.string({
    required_error: 'Username is required.',
    invalid_type_error: 'Username must be a string.'
  })
    .trim()
    .min(1, 'Username cannot be empty.')
    .max(100, 'Username must not exceed 100 characters.'),

  publishedAt: z.string({
    required_error: 'publishedAt date is required.',
    invalid_type_error: 'publishedAt must be a string.'
  })
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'publishedAt must be in YYYY-MM-DD format.')
    .refine((val) => isValidCalendarDate(val), {
      message: 'publishedAt must be a valid calendar date.'
    }),

  tags: z.array(
    z.string({
      invalid_type_error: 'Each tag must be a string.'
    })
      .trim()
      .min(1, 'Tag item cannot be empty.')
      .max(50, 'Tag item must not exceed 50 characters.')
  )
    .max(50, 'Cannot provide more than 50 tags.')
    .optional(),

  topic: z.string({
    required_error: 'Topic is required.',
    invalid_type_error: 'Topic must be a string.'
  })
    .trim()
    .min(1, 'Topic cannot be empty.')
    .max(100, 'Topic must not exceed 100 characters.'),

  summary: z.string({
    required_error: 'Summary is required.',
    invalid_type_error: 'Summary must be a string.'
  })
    .trim()
    .min(1, 'Summary cannot be empty.')
    .max(5000, 'Summary must not exceed 5000 characters.'),

  minWordCount: z.number({
    invalid_type_error: 'minWordCount must be a number.'
  })
    .int('minWordCount must be an integer.')
    .min(1, 'minWordCount must be at least 1.')
    .max(100000, 'minWordCount cannot exceed 100000.')
    .optional(),

  referenceDate: z.string({
    invalid_type_error: 'referenceDate must be a string.'
  })
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'referenceDate must be in YYYY-MM-DD format.')
    .refine((val) => isValidCalendarDate(val), {
      message: 'referenceDate must be a valid calendar date.'
    })
    .optional()
}).strict(); // reject unexpected top-level fields

/**
 * Validates request body and maps Zod errors to application error format.
 * 
 * @param {object} body 
 * @returns {{ success: boolean, data?: object, errors?: Array<{ code: string, field: string, message: string }> }}
 */
function validateVerificationRequest(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {
      success: false,
      errors: [
        {
          code: ERROR_CODES.INVALID_REQUEST,
          field: null,
          message: 'Request body must be a JSON object.'
        }
      ]
    };
  }

  const result = blogVerificationSchema.safeParse(body);
  if (result.success) {
    return { success: true, data: result.data };
  }

  const errors = result.error.issues.map((issue) => {
    const field = issue.path.join('.') || null;
    let code = ERROR_CODES.INVALID_REQUEST;

    if (issue.code === z.ZodIssueCode.invalid_type && issue.received === 'undefined') {
      code = ERROR_CODES.MISSING_REQUIRED_FIELD;
    } else if (field === 'platform' && (issue.code === z.ZodIssueCode.invalid_enum_value || issue.code === z.ZodIssueCode.invalid_type)) {
      code = ERROR_CODES.INVALID_PLATFORM;
    } else if (field === 'url' && issue.code === z.ZodIssueCode.invalid_string) {
      code = ERROR_CODES.INVALID_URL;
    } else if (issue.message && issue.message.includes('required')) {
      code = ERROR_CODES.MISSING_REQUIRED_FIELD;
    }

    return {
      code,
      field,
      message: issue.message
    };
  });

  return { success: false, errors };
}

module.exports = {
  blogVerificationSchema,
  validateVerificationRequest
};

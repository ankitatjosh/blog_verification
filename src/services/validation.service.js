const { ERROR_CODES, CHECK_STATUS, VERIFICATION_STATUS, ERROR_MESSAGES } = require('../constants/errorCodes');
const { normalizeUsername, compareTagSets, compareSummaries } = require('../utils/normalize');
const { comparePublicationDates, normalizeToUtcDateString, isDateInCurrentQuarter } = require('../utils/date');
const { deriveTopicFromMetadata, compareTopics } = require('../constants/taxonomy');

class ValidationService {
  /**
   * Evaluates all validation checks against retrieved source metadata.
   * 
   * @param {object} requestData Validated request body
   * @param {object} sourceMetadata Normalized metadata from platform adapter
   * @returns {object} Validation result with overall status, field checks, and errors
   */
  evaluate(requestData, sourceMetadata) {
    const checks = {};
    const errors = [];

    // 1. URL check
    // If metadata was retrieved, URL is confirmed to exist and resolve to an article
    checks.url = { status: CHECK_STATUS.PASSED };

    // 2. Author username check (FR-04)
    if (sourceMetadata && sourceMetadata.author && sourceMetadata.author.username) {
      const normExpected = normalizeUsername(requestData.username);
      const normActual = normalizeUsername(sourceMetadata.author.username);

      if (normExpected === normActual) {
        checks.username = {
          status: CHECK_STATUS.PASSED,
          expected: requestData.username,
          actual: sourceMetadata.author.username
        };
      } else {
        checks.username = {
          status: CHECK_STATUS.FAILED,
          expected: requestData.username,
          actual: sourceMetadata.author.username
        };
        errors.push({
          code: ERROR_CODES.AUTHOR_MISMATCH,
          field: 'username',
          message: ERROR_MESSAGES[ERROR_CODES.AUTHOR_MISMATCH],
          expected: requestData.username,
          actual: sourceMetadata.author.username
        });
      }
    } else {
      checks.username = {
        status: CHECK_STATUS.UNVERIFIED,
        message: 'Author username could not be established from source metadata.'
      };
      errors.push({
        code: ERROR_CODES.SOURCE_METADATA_UNAVAILABLE,
        field: 'username',
        message: 'Author username could not be established from source metadata.'
      });
    }

    // 3. Publication date check (FR-05)
    if (sourceMetadata && sourceMetadata.publishedAt) {
      const { match, normalizedActual } = comparePublicationDates(
        requestData.publishedAt,
        sourceMetadata.publishedAt
      );

      if (normalizedActual) {
        if (match) {
          checks.publishedAt = {
            status: CHECK_STATUS.PASSED,
            expected: requestData.publishedAt,
            actual: normalizedActual
          };
        } else {
          checks.publishedAt = {
            status: CHECK_STATUS.FAILED,
            expected: requestData.publishedAt,
            actual: normalizedActual
          };
          errors.push({
            code: ERROR_CODES.PUBLICATION_DATE_MISMATCH,
            field: 'publishedAt',
            message: ERROR_MESSAGES[ERROR_CODES.PUBLICATION_DATE_MISMATCH],
            expected: requestData.publishedAt,
            actual: normalizedActual
          });
        }
      } else {
        checks.publishedAt = {
          status: CHECK_STATUS.UNVERIFIED,
          message: 'Source publication date could not be parsed to a valid UTC date.'
        };
        errors.push({
          code: ERROR_CODES.SOURCE_METADATA_UNAVAILABLE,
          field: 'publishedAt',
          message: 'Source publication date could not be parsed to a valid UTC date.'
        });
      }
    } else {
      checks.publishedAt = {
        status: CHECK_STATUS.UNVERIFIED,
        message: 'Original publication date could not be established from source metadata.'
      };
      errors.push({
        code: ERROR_CODES.SOURCE_METADATA_UNAVAILABLE,
        field: 'publishedAt',
        message: 'Original publication date could not be established from source metadata.'
      });
    }

    // 4. Quarter verification: Verify that blog was published in the current quarter
    if (sourceMetadata && sourceMetadata.publishedAt) {
      const quarterResult = isDateInCurrentQuarter(sourceMetadata.publishedAt, requestData.referenceDate);
      if (quarterResult.inCurrentQuarter) {
        checks.quarter = {
          status: CHECK_STATUS.PASSED,
          currentQuarter: quarterResult.currentQuarter.label,
          blogQuarter: quarterResult.blogQuarter.label,
          message: `Blog publication date is in the current quarter (${quarterResult.currentQuarter.label}).`
        };
      } else if (quarterResult.blogQuarter && quarterResult.currentQuarter) {
        checks.quarter = {
          status: CHECK_STATUS.FAILED,
          currentQuarter: quarterResult.currentQuarter.label,
          blogQuarter: quarterResult.blogQuarter.label,
          message: `Blog publication date is not in the current quarter. Expected ${quarterResult.currentQuarter.label}, but blog was published in ${quarterResult.blogQuarter.label}.`
        };
        errors.push({
          code: ERROR_CODES.NOT_IN_CURRENT_QUARTER,
          field: 'publishedAt',
          message: `Blog publication date is not in the current quarter. Expected ${quarterResult.currentQuarter.label}, but blog was published in ${quarterResult.blogQuarter.label}.`,
          expected: quarterResult.currentQuarter.label,
          actual: quarterResult.blogQuarter.label
        });
      } else {
        checks.quarter = {
          status: CHECK_STATUS.UNVERIFIED,
          message: 'Quarter could not be established from source publication date.'
        };
        errors.push({
          code: ERROR_CODES.SOURCE_METADATA_UNAVAILABLE,
          field: 'quarter',
          message: 'Quarter could not be established from source publication date.'
        });
      }
    } else {
      checks.quarter = {
        status: CHECK_STATUS.UNVERIFIED,
        message: 'Quarter could not be verified because source publication date is unavailable.'
      };
      errors.push({
        code: ERROR_CODES.SOURCE_METADATA_UNAVAILABLE,
        field: 'quarter',
        message: 'Quarter could not be verified because source publication date is unavailable.'
      });
    }

    // 5. Tags check (FR-06 - Optional)
    const hasSuppliedTags = Array.isArray(requestData.tags) && requestData.tags.length > 0;
    if (!hasSuppliedTags) {
      // Tags omitted or explicitly empty array []
      checks.tags = {
        status: CHECK_STATUS.SKIPPED,
        message: 'Tag validation was skipped because tags were not provided.'
      };
    } else {
      // Tags were supplied
      if (sourceMetadata && Array.isArray(sourceMetadata.tags) && sourceMetadata.tags.length >= 0) {
        const { match, normalizedExpected, normalizedActual } = compareTagSets(
          requestData.tags,
          sourceMetadata.tags
        );

        if (match) {
          checks.tags = {
            status: CHECK_STATUS.PASSED,
            expected: normalizedExpected,
            actual: normalizedActual
          };
        } else {
          checks.tags = {
            status: CHECK_STATUS.FAILED,
            expected: normalizedExpected,
            actual: normalizedActual
          };
          errors.push({
            code: ERROR_CODES.TAGS_MISMATCH,
            field: 'tags',
            message: ERROR_MESSAGES[ERROR_CODES.TAGS_MISMATCH],
            expected: normalizedExpected,
            actual: normalizedActual
          });
        }
      } else {
        // Platform does not expose reliable tag metadata
        checks.tags = {
          status: CHECK_STATUS.UNVERIFIED,
          message: 'Source platform does not expose reliable tag metadata.'
        };
        errors.push({
          code: ERROR_CODES.SOURCE_METADATA_UNAVAILABLE,
          field: 'tags',
          message: 'Source platform does not expose reliable tag metadata.'
        });
      }
    }

    // 5. Topic check (FR-07)
    const verifiedTopic = deriveTopicFromMetadata(sourceMetadata);
    if (verifiedTopic) {
      const match = compareTopics(requestData.topic, verifiedTopic);
      if (match) {
        checks.topic = {
          status: CHECK_STATUS.PASSED,
          expected: requestData.topic,
          actual: verifiedTopic
        };
      } else {
        checks.topic = {
          status: CHECK_STATUS.FAILED,
          expected: requestData.topic,
          actual: verifiedTopic
        };
        errors.push({
          code: ERROR_CODES.TOPIC_MISMATCH,
          field: 'topic',
          message: ERROR_MESSAGES[ERROR_CODES.TOPIC_MISMATCH],
          expected: requestData.topic,
          actual: verifiedTopic
        });
      }
    } else {
      checks.topic = {
        status: CHECK_STATUS.UNVERIFIED,
        message: 'Article topic could not be established reliably from source metadata.'
      };
      errors.push({
        code: ERROR_CODES.SOURCE_METADATA_UNAVAILABLE,
        field: 'topic',
        message: 'Article topic could not be established reliably from source metadata.'
      });
    }

    // 6. Summary check (FR-08)
    if (sourceMetadata && sourceMetadata.description && sourceMetadata.description.trim().length > 0) {
      const { match, normalizedExpected, normalizedActual } = compareSummaries(
        requestData.summary,
        sourceMetadata.description
      );

      if (match) {
        checks.summary = {
          status: CHECK_STATUS.PASSED
        };
      } else {
        checks.summary = {
          status: CHECK_STATUS.FAILED
        };
        errors.push({
          code: ERROR_CODES.SUMMARY_MISMATCH,
          field: 'summary',
          message: ERROR_MESSAGES[ERROR_CODES.SUMMARY_MISMATCH],
          expected: requestData.summary,
          actual: sourceMetadata.description
        });
      }
    } else {
      checks.summary = {
        status: CHECK_STATUS.UNVERIFIED,
        message: 'Article description or excerpt could not be established from source metadata.'
      };
      errors.push({
        code: ERROR_CODES.SOURCE_METADATA_UNAVAILABLE,
        field: 'summary',
        message: 'Article description or excerpt could not be established from source metadata.'
      });
    }

    // 7. Blog content length / word count check
    const minWords = typeof requestData.minWordCount === 'number' ? requestData.minWordCount : 500;
    if (sourceMetadata && typeof sourceMetadata.wordCount === 'number') {
      if (sourceMetadata.wordCount >= minWords) {
        checks.contentLength = {
          status: CHECK_STATUS.PASSED,
          wordCount: sourceMetadata.wordCount,
          minRequired: minWords,
          message: `Blog length passed (${sourceMetadata.wordCount} words >= ${minWords} words).`
        };
      } else {
        checks.contentLength = {
          status: CHECK_STATUS.FAILED,
          wordCount: sourceMetadata.wordCount,
          minRequired: minWords,
          message: `Blog length failed: article has ${sourceMetadata.wordCount} words, which is below the required ${minWords} words.`
        };
        errors.push({
          code: ERROR_CODES.INSUFFICIENT_CONTENT_LENGTH,
          field: 'contentLength',
          message: `The blog content does not meet the minimum required length of ${minWords} words.`,
          expected: minWords,
          actual: sourceMetadata.wordCount
        });
      }
    } else {
      checks.contentLength = {
        status: CHECK_STATUS.UNVERIFIED,
        message: 'Blog content length could not be established from source metadata.'
      };
      errors.push({
        code: ERROR_CODES.SOURCE_METADATA_UNAVAILABLE,
        field: 'contentLength',
        message: 'Blog content length could not be established from source metadata.'
      });
    }

    // 8. Aggregation (FR-10)
    return this.aggregateStatus(checks, errors, requestData);
  }

  /**
   * Aggregates check statuses into overall valid, invalid, or unverified response.
   * 
   * @param {object} checks 
   * @param {Array} errors 
   * @param {object} requestData 
   * @returns {object}
   */
  aggregateStatus(checks, errors, requestData) {
    const checkValues = Object.values(checks);
    const hasFailed = checkValues.some((c) => c.status === CHECK_STATUS.FAILED);
    const hasUnverified = checkValues.some((c) => c.status === CHECK_STATUS.UNVERIFIED);

    let overallStatus;
    let message;

    if (hasFailed) {
      overallStatus = VERIFICATION_STATUS.INVALID;
      message = 'Blog verification failed.';
    } else if (hasUnverified) {
      overallStatus = VERIFICATION_STATUS.UNVERIFIED;
      message = 'Blog verification could not be completed.';
    } else {
      overallStatus = VERIFICATION_STATUS.VALID;
      message = 'Blog verification completed successfully.';
    }

    const response = {
      success: true,
      status: overallStatus,
      message,
      data: {
        platform: requestData.platform,
        url: requestData.url,
        checks
      }
    };

    if (errors.length > 0) {
      response.errors = errors;
    }

    return response;
  }

  /**
   * Builds an unverified response when source lookup fails before metadata could be retrieved.
   * e.g., SOURCE_TIMEOUT, SOURCE_UNAVAILABLE, ARTICLE_ACCESS_DENIED.
   * 
   * @param {object} requestData 
   * @param {object} upstreamError 
   * @returns {object}
   */
  buildSourceFailureResponse(requestData, upstreamError) {
    const isNotFound = upstreamError.errorCode === ERROR_CODES.ARTICLE_NOT_FOUND;
    const hasSuppliedTags = Array.isArray(requestData.tags) && requestData.tags.length > 0;

    if (isNotFound) {
      // Confirmed not found -> status is 'invalid' per PRD Section 6.7 and FR-03
      return {
        success: true,
        status: VERIFICATION_STATUS.INVALID,
        message: 'Blog verification failed.',
        errors: [
          {
            code: ERROR_CODES.ARTICLE_NOT_FOUND,
            field: 'url',
            message: upstreamError.message || ERROR_MESSAGES[ERROR_CODES.ARTICLE_NOT_FOUND]
          }
        ],
        data: {
          platform: requestData.platform,
          url: requestData.url,
          checks: {
            url: {
              status: CHECK_STATUS.FAILED,
              message: upstreamError.message || ERROR_MESSAGES[ERROR_CODES.ARTICLE_NOT_FOUND]
            },
            username: { status: CHECK_STATUS.UNVERIFIED },
            publishedAt: { status: CHECK_STATUS.UNVERIFIED },
            quarter: { status: CHECK_STATUS.UNVERIFIED },
            tags: hasSuppliedTags
              ? { status: CHECK_STATUS.UNVERIFIED }
              : { status: CHECK_STATUS.SKIPPED, message: 'Tag validation was skipped because tags were not provided.' },
            topic: { status: CHECK_STATUS.UNVERIFIED },
            summary: { status: CHECK_STATUS.UNVERIFIED },
            contentLength: { status: CHECK_STATUS.UNVERIFIED }
          }
        }
      };
    }

    // Source timeout, access denied, unavailable, etc. -> 'unverified'
    return {
      success: true,
      status: VERIFICATION_STATUS.UNVERIFIED,
      message: 'Blog verification could not be completed.',
      errors: [
        {
          code: upstreamError.errorCode || ERROR_CODES.SOURCE_UNAVAILABLE,
          field: null,
          message: upstreamError.message
        }
      ],
      data: {
        platform: requestData.platform,
        url: requestData.url,
        checks: {
          url: { status: CHECK_STATUS.UNVERIFIED },
          username: { status: CHECK_STATUS.UNVERIFIED },
          publishedAt: { status: CHECK_STATUS.UNVERIFIED },
          quarter: { status: CHECK_STATUS.UNVERIFIED },
          tags: hasSuppliedTags
            ? { status: CHECK_STATUS.UNVERIFIED }
            : { status: CHECK_STATUS.SKIPPED, message: 'Tag validation was skipped because tags were not provided.' },
          topic: { status: CHECK_STATUS.UNVERIFIED },
          summary: { status: CHECK_STATUS.UNVERIFIED },
          contentLength: { status: CHECK_STATUS.UNVERIFIED }
        }
      }
    };
  }
}

module.exports = new ValidationService();

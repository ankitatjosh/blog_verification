const { validateVerificationRequest } = require('../../src/validators/blogVerification.schema');
const { ERROR_CODES } = require('../../src/constants/errorCodes');

describe('Request Schema Validation', () => {
  const validPayload = {
    platform: 'devto',
    url: 'https://dev.to/janedoe/building-a-node-api-123',
    username: 'janedoe',
    publishedAt: '2026-09-15',
    tags: ['nodejs', 'api'],
    topic: 'Backend Development',
    summary: 'A guide to building APIs using Node.js'
  };

  test('accepts a fully populated valid payload', () => {
    const result = validateVerificationRequest(validPayload);
    expect(result.success).toBe(true);
    expect(result.data).toEqual(validPayload);
  });

  test('accepts payload when tags is omitted', () => {
    const { tags, ...withoutTags } = validPayload;
    const result = validateVerificationRequest(withoutTags);
    expect(result.success).toBe(true);
    expect(result.data.tags).toBeUndefined();
  });

  test('accepts payload when tags is empty array', () => {
    const payload = { ...validPayload, tags: [] };
    const result = validateVerificationRequest(payload);
    expect(result.success).toBe(true);
    expect(result.data.tags).toEqual([]);
  });

  test('rejects non-object payload', () => {
    const result = validateVerificationRequest('invalid');
    expect(result.success).toBe(false);
    expect(result.errors[0].code).toBe(ERROR_CODES.INVALID_REQUEST);
  });

  test('rejects null payload', () => {
    const result = validateVerificationRequest(null);
    expect(result.success).toBe(false);
    expect(result.errors[0].code).toBe(ERROR_CODES.INVALID_REQUEST);
  });

  test('rejects unsupported platform with INVALID_PLATFORM error code', () => {
    const payload = { ...validPayload, platform: 'wordpress' };
    const result = validateVerificationRequest(payload);
    expect(result.success).toBe(false);
    const platformError = result.errors.find((e) => e.field === 'platform');
    expect(platformError).toBeDefined();
    expect(platformError.code).toBe(ERROR_CODES.INVALID_PLATFORM);
  });

  test('rejects missing required fields', () => {
    const result = validateVerificationRequest({});
    expect(result.success).toBe(false);
    const fields = result.errors.map((e) => e.field);
    expect(fields).toContain('platform');
    expect(fields).toContain('url');
    expect(fields).toContain('username');
    expect(fields).toContain('publishedAt');
    expect(fields).toContain('topic');
    expect(fields).toContain('summary');
  });

  test('rejects invalid date format', () => {
    const payload = { ...validPayload, publishedAt: '15-09-2026' };
    const result = validateVerificationRequest(payload);
    expect(result.success).toBe(false);
    const dateError = result.errors.find((e) => e.field === 'publishedAt');
    expect(dateError).toBeDefined();
  });

  test('rejects impossible calendar date (Feb 30)', () => {
    const payload = { ...validPayload, publishedAt: '2026-02-30' };
    const result = validateVerificationRequest(payload);
    expect(result.success).toBe(false);
    const dateError = result.errors.find((e) => e.field === 'publishedAt');
    expect(dateError).toBeDefined();
    expect(dateError.message).toContain('valid calendar date');
  });

  test('rejects unrecognized extra fields (strict schema)', () => {
    const payload = { ...validPayload, extraField: 'not allowed' };
    const result = validateVerificationRequest(payload);
    expect(result.success).toBe(false);
  });
});

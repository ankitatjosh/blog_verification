const {
  isValidCalendarDate,
  normalizeToUtcDateString,
  comparePublicationDates
} = require('../../src/utils/date');

describe('Date Utilities', () => {
  describe('isValidCalendarDate', () => {
    test('validates correct calendar dates', () => {
      expect(isValidCalendarDate('2026-09-15')).toBe(true);
      expect(isValidCalendarDate('2024-02-29')).toBe(true); // leap year
      expect(isValidCalendarDate('2023-12-31')).toBe(true);
    });

    test('rejects impossible dates', () => {
      expect(isValidCalendarDate('2026-02-30')).toBe(false);
      expect(isValidCalendarDate('2025-02-29')).toBe(false); // non-leap year
      expect(isValidCalendarDate('2026-04-31')).toBe(false);
      expect(isValidCalendarDate('2026-13-01')).toBe(false);
      expect(isValidCalendarDate('2026-00-10')).toBe(false);
      expect(isValidCalendarDate('invalid-date')).toBe(false);
    });
  });

  describe('normalizeToUtcDateString', () => {
    test('converts ISO string to UTC YYYY-MM-DD', () => {
      expect(normalizeToUtcDateString('2026-09-15T18:30:00Z')).toBe('2026-09-15');
      expect(normalizeToUtcDateString('2026-09-15T00:00:00.000Z')).toBe('2026-09-15');
    });

    test('handles date boundaries close to midnight UTC (AC-14)', () => {
      // 23:59:59 UTC remains 2026-09-15
      expect(normalizeToUtcDateString('2026-09-15T23:59:59Z')).toBe('2026-09-15');
      // 00:00:01 UTC is next day 2026-09-16
      expect(normalizeToUtcDateString('2026-09-16T00:00:01Z')).toBe('2026-09-16');
    });

    test('converts unix timestamps', () => {
      // 1789498800000 -> 2026-09-15T19:00:00.000Z
      const date = new Date('2026-09-15T19:00:00.000Z');
      expect(normalizeToUtcDateString(date.getTime())).toBe('2026-09-15');
      expect(normalizeToUtcDateString(Math.floor(date.getTime() / 1000))).toBe('2026-09-15');
    });

    test('returns null for invalid inputs', () => {
      expect(normalizeToUtcDateString(null)).toBeNull();
      expect(normalizeToUtcDateString('')).toBeNull();
      expect(normalizeToUtcDateString('not-a-date')).toBeNull();
    });
  });

  describe('comparePublicationDates', () => {
    test('returns match: true when dates match in UTC', () => {
      const res = comparePublicationDates('2026-09-15', '2026-09-15T23:55:00Z');
      expect(res.match).toBe(true);
      expect(res.normalizedActual).toBe('2026-09-15');
    });

    test('returns match: false when dates differ', () => {
      const res = comparePublicationDates('2026-09-15', '2026-09-16T00:05:00Z');
      expect(res.match).toBe(false);
      expect(res.normalizedActual).toBe('2026-09-16');
    });
  });

  describe('Quarter Verification (getQuarterInfo & isDateInCurrentQuarter)', () => {
    const { getQuarterInfo, isDateInCurrentQuarter } = require('../../src/utils/date');

    test('correctly identifies April - June quarter (Q1)', () => {
      const qStart = getQuarterInfo('2026-04-01');
      const qEnd = getQuarterInfo('2026-06-30');
      expect(qStart.quarterNumber).toBe(1);
      expect(qStart.quarterName).toBe('April - June');
      expect(qEnd.quarterNumber).toBe(1);
      expect(qEnd.label).toBe('April - June 2026');
    });

    test('correctly identifies July - September quarter (Q2)', () => {
      const qStart = getQuarterInfo('2026-07-01');
      const qEnd = getQuarterInfo('2026-09-30');
      expect(qStart.quarterNumber).toBe(2);
      expect(qStart.quarterName).toBe('July - September');
      expect(qEnd.quarterNumber).toBe(2);
    });

    test('correctly identifies October - December quarter (Q3)', () => {
      const qStart = getQuarterInfo('2026-10-01');
      const qEnd = getQuarterInfo('2026-12-31');
      expect(qStart.quarterNumber).toBe(3);
      expect(qStart.quarterName).toBe('October - December');
      expect(qEnd.quarterNumber).toBe(3);
    });

    test('correctly identifies January - March quarter (Q4)', () => {
      const qStart = getQuarterInfo('2026-01-01');
      const qEnd = getQuarterInfo('2026-03-31');
      expect(qStart.quarterNumber).toBe(4);
      expect(qStart.quarterName).toBe('January - March');
      expect(qEnd.quarterNumber).toBe(4);
    });

    test('isDateInCurrentQuarter returns true when blog date is within current quarter', () => {
      const res = isDateInCurrentQuarter('2026-10-11', '2026-10-15');
      expect(res.inCurrentQuarter).toBe(true);
      expect(res.blogQuarter.label).toBe('October - December 2026');
      expect(res.currentQuarter.label).toBe('October - December 2026');
    });

    test('isDateInCurrentQuarter returns false when blog date is in a different quarter', () => {
      const res = isDateInCurrentQuarter('2026-09-15', '2026-10-15');
      expect(res.inCurrentQuarter).toBe(false);
      expect(res.blogQuarter.label).toBe('July - September 2026');
      expect(res.currentQuarter.label).toBe('October - December 2026');
    });

    test('isDateInCurrentQuarter returns false when blog date is in same quarter but different year', () => {
      const res = isDateInCurrentQuarter('2025-10-15', '2026-10-15');
      expect(res.inCurrentQuarter).toBe(false);
    });
  });
});

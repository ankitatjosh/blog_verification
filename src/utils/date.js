/**
 * Date parsing, validation, and UTC normalization utilities.
 * Implements FR-05 and AC-14.
 */

const STRICT_DATE_REGEX = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

/**
 * Validates if a string is strictly formatted as YYYY-MM-DD and is a real calendar date.
 * Rejects impossible dates like 2026-02-30, 2026-04-31, 2026-13-01.
 * 
 * @param {string} dateStr 
 * @returns {boolean}
 */
function isValidCalendarDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return false;
  if (!STRICT_DATE_REGEX.test(dateStr)) return false;

  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  const utcDate = new Date(Date.UTC(year, month - 1, day));

  return (
    utcDate.getUTCFullYear() === year &&
    utcDate.getUTCMonth() + 1 === month &&
    utcDate.getUTCDate() === day
  );
}

/**
 * Normalizes an arbitrary timestamp or date representation to a UTC calendar date string (YYYY-MM-DD).
 * Follows UTC date policy strictly (never server local timezone).
 * 
 * @param {string|number|Date} sourceTimestamp 
 * @returns {string|null} YYYY-MM-DD or null if invalid
 */
function normalizeToUtcDateString(sourceTimestamp) {
  if (!sourceTimestamp) return null;

  let parsedDate;
  if (sourceTimestamp instanceof Date) {
    parsedDate = sourceTimestamp;
  } else if (typeof sourceTimestamp === 'number') {
    // If timestamp in seconds, convert to ms
    const ms = sourceTimestamp < 1e11 ? sourceTimestamp * 1000 : sourceTimestamp;
    parsedDate = new Date(ms);
  } else if (typeof sourceTimestamp === 'string') {
    // If already in YYYY-MM-DD, check if valid calendar date
    if (STRICT_DATE_REGEX.test(sourceTimestamp) && isValidCalendarDate(sourceTimestamp)) {
      return sourceTimestamp;
    }
    const parsedMs = Date.parse(sourceTimestamp);
    if (isNaN(parsedMs)) return null;
    parsedDate = new Date(parsedMs);
  } else {
    return null;
  }

  if (isNaN(parsedDate.getTime())) return null;

  const y = parsedDate.getUTCFullYear();
  const m = String(parsedDate.getUTCMonth() + 1).padStart(2, '0');
  const d = String(parsedDate.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Compares expected YYYY-MM-DD with source publication date.
 * 
 * @param {string} expectedDate 
 * @param {string|number|Date} sourceTimestamp 
 * @returns {{ match: boolean, normalizedActual: string|null }}
 */
function comparePublicationDates(expectedDate, sourceTimestamp) {
  const normalizedActual = normalizeToUtcDateString(sourceTimestamp);
  if (!normalizedActual) {
    return { match: false, normalizedActual: null };
  }
  return {
    match: expectedDate === normalizedActual,
    normalizedActual
  };
}

/**
 * Returns quarter details for any given date or timestamp in UTC.
 * Quarters defined as:
 * - Quarter 1: 1st April to June (months 4, 5, 6)
 * - Quarter 2: 1st July to September (months 7, 8, 9)
 * - Quarter 3: 1st October to December (months 10, 11, 12)
 * - Quarter 4: 1st January to March (months 1, 2, 3)
 * 
 * @param {string|number|Date} dateInput 
 * @returns {{ quarterNumber: number, quarterName: string, year: number, label: string, startDate: string, endDate: string }|null}
 */
function getQuarterInfo(dateInput) {
  if (!dateInput) return null;
  let parsedDate;
  if (dateInput instanceof Date) {
    parsedDate = dateInput;
  } else if (typeof dateInput === 'string') {
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
      parsedDate = new Date(`${dateInput}T00:00:00Z`);
    } else {
      const ms = Date.parse(dateInput);
      if (isNaN(ms)) return null;
      parsedDate = new Date(ms);
    }
  } else if (typeof dateInput === 'number') {
    const ms = dateInput < 1e11 ? dateInput * 1000 : dateInput;
    parsedDate = new Date(ms);
  } else {
    return null;
  }

  if (isNaN(parsedDate.getTime())) return null;

  const y = parsedDate.getUTCFullYear();
  const m = parsedDate.getUTCMonth() + 1; // 1-indexed

  let quarterNumber;
  let quarterName;
  let startDate;
  let endDate;

  if (m >= 4 && m <= 6) {
    quarterNumber = 1;
    quarterName = 'April - June';
    startDate = `${y}-04-01`;
    endDate = `${y}-06-30`;
  } else if (m >= 7 && m <= 9) {
    quarterNumber = 2;
    quarterName = 'July - September';
    startDate = `${y}-07-01`;
    endDate = `${y}-09-30`;
  } else if (m >= 10 && m <= 12) {
    quarterNumber = 3;
    quarterName = 'October - December';
    startDate = `${y}-10-01`;
    endDate = `${y}-12-31`;
  } else {
    quarterNumber = 4;
    quarterName = 'January - March';
    startDate = `${y}-01-01`;
    endDate = `${y}-03-31`;
  }

  return {
    quarterNumber,
    quarterName,
    year: y,
    label: `${quarterName} ${y}`,
    startDate,
    endDate
  };
}

/**
 * Checks if a given blog publication date falls within the current quarter.
 * 
 * @param {string|number|Date} blogDate 
 * @param {string|number|Date} [referenceDate] 
 * @returns {{ inCurrentQuarter: boolean, blogQuarter: object|null, currentQuarter: object|null }}
 */
function isDateInCurrentQuarter(blogDate, referenceDate = new Date()) {
  const blogQuarter = getQuarterInfo(blogDate);
  const currentQuarter = getQuarterInfo(referenceDate);

  if (!blogQuarter || !currentQuarter) {
    return { inCurrentQuarter: false, blogQuarter: null, currentQuarter: null };
  }

  const inCurrentQuarter =
    blogQuarter.year === currentQuarter.year &&
    blogQuarter.quarterNumber === currentQuarter.quarterNumber;

  return {
    inCurrentQuarter,
    blogQuarter,
    currentQuarter
  };
}

module.exports = {
  isValidCalendarDate,
  normalizeToUtcDateString,
  comparePublicationDates,
  getQuarterInfo,
  isDateInCurrentQuarter
};

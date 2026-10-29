const {
  normalizeUsername,
  normalizeTags,
  compareTagSets,
  normalizeSummary,
  compareSummaries
} = require('../../src/utils/normalize');

describe('Normalization Utilities', () => {
  describe('normalizeUsername', () => {
    test('trims surrounding whitespace and lowercases', () => {
      expect(normalizeUsername('  JaneDoe  ')).toBe('janedoe');
    });

    test('removes leading @ symbol if present', () => {
      expect(normalizeUsername('@janedoe')).toBe('janedoe');
      expect(normalizeUsername('  @JaneDoe ')).toBe('janedoe');
    });

    test('handles empty or non-string inputs', () => {
      expect(normalizeUsername('')).toBe('');
      expect(normalizeUsername(null)).toBe('');
    });
  });

  describe('normalizeTags and compareTagSets', () => {
    test('normalizes, deduplicates and sorts tags', () => {
      const tags = [' NodeJs ', 'API', 'nodejs', '  express  '];
      expect(normalizeTags(tags)).toEqual(['api', 'express', 'nodejs']);
    });

    test('compares tag sets ignoring order and case', () => {
      const submitted = ['API', 'NodeJS'];
      const source = ['nodejs', 'api'];
      const res = compareTagSets(submitted, source);
      expect(res.match).toBe(true);
      expect(res.normalizedExpected).toEqual(['api', 'nodejs']);
      expect(res.normalizedActual).toEqual(['api', 'nodejs']);
    });

    test('detects tag set differences', () => {
      const submitted = ['api', 'nodejs'];
      const source = ['api', 'python'];
      const res = compareTagSets(submitted, source);
      expect(res.match).toBe(false);
    });

    test('detects missing tags in source', () => {
      const submitted = ['api', 'nodejs', 'express'];
      const source = ['api', 'nodejs'];
      const res = compareTagSets(submitted, source);
      expect(res.match).toBe(false);
    });
  });

  describe('normalizeSummary and compareSummaries', () => {
    test('strips HTML markup and decodes entities', () => {
      const htmlText = '<p>A guide to &quot;APIs&quot; using <strong>Node.js</strong> &amp; Express.</p>';
      const expected = 'a guide to "apis" using node.js & express.';
      expect(normalizeSummary(htmlText)).toBe(expected);
    });

    test('collapses multiple whitespace characters and trims', () => {
      const messy = '   A   guide\n\t  to  building   APIs.  ';
      expect(normalizeSummary(messy)).toBe('a guide to building apis.');
    });

    test('compares matching summaries with formatting differences', () => {
      const expected = 'A guide to "APIs" using Node.js & Express.';
      const sourceHtml = '<p>A guide to &quot;APIs&quot; using <strong>Node.js</strong> &amp; Express.</p>';
      const res = compareSummaries(expected, sourceHtml);
      expect(res.match).toBe(true);
    });

    test('detects mismatching summaries', () => {
      const expected = 'A guide to building APIs with Node.js.';
      const sourceHtml = 'A totally different guide about Python.';
      const res = compareSummaries(expected, sourceHtml);
      expect(res.match).toBe(false);
    });
  });

  describe('countWords', () => {
    const { countWords } = require('../../src/utils/normalize');

    test('accurately counts words in plain text', () => {
      expect(countWords('This is a simple test sentence.')).toBe(6);
    });

    test('accurately counts words ignoring HTML tags and entities', () => {
      const html = '<article><h1>Title Here</h1><p>Hello &amp; welcome to the <strong>blog post</strong></p></article>';
      // Words: Title, Here, Hello, &, welcome, to, the, blog, post -> 9 words
      expect(countWords(html)).toBe(9);
    });

    test('handles empty or null inputs', () => {
      expect(countWords('')).toBe(0);
      expect(countWords(null)).toBe(0);
      expect(countWords('    ')).toBe(0);
    });
  });
});

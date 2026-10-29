# Blog Verification API — Node.js

A high-reliability, lightweight REST API built with Node.js and Express that verifies whether a submitted blog URL belongs to the claimed author and matches expected metadata.

Supports **DEV Community (dev.to)** and **Medium**.

---

## Features

- **Platform Adapters**:
  - **DEV Community**: Official Forem API integration with canonical author extraction, tag lists, publication timestamps, and excerpts.
  - **Medium**: HTML structured metadata parsing (JSON-LD `NewsArticle`/`BlogPosting`, meta tags, canonical `@username` resolution) with resilient handling of missing upstream metadata.
- **Strict Verification Rules**:
  - **URL & Article Existence**: Validates syntax, supported hosts, rejects homepages and profile links, safely verifies article presence.
  - **Canonical Author**: Strictly verifies canonical platform username (not display names); normalizes whitespace and case. For Medium, leverages JSON-LD `NewsArticle`/`BlogPosting` `author.identifier`, `@id`, and URLs.
  - **Original Publication Date**: Strict `YYYY-MM-DD` calendar date comparison normalized to UTC calendar dates (protecting against timezone boundary discrepancies). Does not substitute modified/updated dates.
  - **Quarter Verification**: Confirms that the blog was created/published within the **current quarter** (Q1: Apr-Jun, Q2: Jul-Sep, Q3: Oct-Dec, Q4: Jan-Mar). Out-of-quarter articles fail with `NOT_IN_CURRENT_QUARTER`.
  - **Blog Length Verification**: Counts body words (stripping HTML tags and markdown formatting) and validates that the article satisfies minimum word count (default 500 words). Failing articles return `INSUFFICIENT_CONTENT_LENGTH`.
  - **Topic Taxonomy**: Deterministic mapping from authoritative metadata/tags to a curated canonical taxonomy or direct topic verification.
  - **Summary/Excerpt**: Deterministic exact-match normalization (HTML tag removal, HTML entity decoding, whitespace collapsing, and case normalization).
  - **Optional Tags**: Tags are optional—omitting them or providing `tags: []` skips tag validation without penalty. When supplied, set comparison is performed ignoring order and case.
- **Security & SSRF Mitigation**:
  - Restricts outbound requests to approved platform hosts (`dev.to`, `medium.com`).
  - DNS resolution check blocking loopback, link-local, private IPv4 (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), and private IPv6 ranges before connecting.
  - Inspects all redirects to prevent open redirect SSRF attacks.
  - Request body limits, rate limiting, and safe timeouts.
- **Precise Status Differentiation**:
  - `valid`: All required and supplied optional checks pass.
  - `invalid`: Confirmed mismatch or confirmed non-existent article.
  - `unverified`: Upstream timeout, rate limit, access denial, or missing source metadata without confirmed mismatch.

---

## Tech Stack

- **Runtime**: Node.js LTS (v20+ / v22+)
- **Framework**: Express.js
- **Validation**: Zod
- **Networking & Security**: Native `fetch`, `ipaddr.js`, `express-rate-limit`, `he`
- **Testing**: Jest, Supertest

---

## Installation & Setup

### Prerequisites

- Node.js >= 20.0.0
- npm >= 9.0.0

### 1. Clone & Install Dependencies

```bash
git clone <repository-url>
cd BlogsVerification
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Available configuration variables:

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Port for the HTTP server |
| `NODE_ENV` | `development` | Environment mode (`development`, `production`, `test`) |
| `REQUEST_TIMEOUT_MS` | `5000` | Upstream platform request timeout in milliseconds |
| `MAX_REQUEST_BODY_SIZE` | `100kb` | Maximum accepted JSON request body size |
| `RATE_LIMIT_WINDOW_MS` | `60000` | Rate limiter window in milliseconds (default: 1 min) |
| `RATE_LIMIT_MAX_REQUESTS` | `100` | Max requests per IP within the rate limit window |
| `SKIP_DNS_CHECK` | `false` | Set `true` only in offline mock testing |

### 3. Run the Server

Development mode (with auto-reload):
```bash
npm run dev
```

Production mode:
```bash
npm start
```

### 4. Run Tests

Run test suite:
```bash
npm test
```

Generate test coverage report:
```bash
npm run test:coverage
```

---

## API Specification

### Endpoint

```http
POST /api/v1/blogs/verify
Content-Type: application/json
```

### Request Body Schema

```json
{
  "platform": "devto",
  "url": "https://dev.to/janedoe/building-a-node-api-123",
  "username": "janedoe",
  "publishedAt": "2026-10-11",
  "tags": ["nodejs", "api"],
  "topic": "Backend Development",
  "summary": "A guide to building APIs using Node.js",
  "minWordCount": 500
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `platform` | String | **Yes** | Supported values: `"devto"` or `"medium"` |
| `url` | String | **Yes** | Public HTTPS article URL |
| `username` | String | **Yes** | Expected canonical author username |
| `publishedAt` | String | **Yes** | Original publication date in `YYYY-MM-DD` |
| `tags` | Array of strings | No | Expected tags; omitting or `[]` skips validation |
| `topic` | String | **Yes** | Expected topic matching taxonomy |
| `summary` | String | **Yes** | Expected official description or excerpt |
| `minWordCount` | Number | No | Minimum required word count (defaults to `500`) |
| `referenceDate` | String | No | Custom reference date (`YYYY-MM-DD`) for quarter check (defaults to current system date) |

---

### Response Examples

#### 1. Valid Blog Verification (HTTP 200 OK)

```json
{
  "success": true,
  "status": "valid",
  "message": "Blog verification completed successfully.",
  "data": {
    "platform": "devto",
    "url": "https://dev.to/janedoe/building-a-node-api-123",
    "checks": {
      "url": {
        "status": "passed"
      },
      "username": {
        "status": "passed",
        "expected": "janedoe",
        "actual": "janedoe"
      },
      "publishedAt": {
        "status": "passed",
        "expected": "2026-10-11",
        "actual": "2026-10-11"
      },
      "quarter": {
        "status": "passed",
        "currentQuarter": "October - December 2026",
        "blogQuarter": "October - December 2026",
        "message": "Blog publication date is in the current quarter (October - December 2026)."
      },
      "tags": {
        "status": "passed",
        "expected": ["api", "nodejs"],
        "actual": ["api", "nodejs"]
      },
      "topic": {
        "status": "passed",
        "expected": "Backend Development",
        "actual": "Backend Development"
      },
      "summary": {
        "status": "passed"
      },
      "contentLength": {
        "status": "passed",
        "wordCount": 842,
        "minRequired": 500,
        "message": "Blog length passed (842 words >= 500 words)."
      }
    }
  }
}
```

#### 2. Valid Blog with Tags Omitted (HTTP 200 OK)

```json
{
  "success": true,
  "status": "valid",
  "message": "Blog verification completed successfully.",
  "data": {
    "platform": "devto",
    "url": "https://dev.to/janedoe/building-a-node-api-123",
    "checks": {
      "url": { "status": "passed" },
      "username": { "status": "passed" },
      "publishedAt": { "status": "passed" },
      "quarter": {
        "status": "passed",
        "currentQuarter": "October - December 2026",
        "blogQuarter": "October - December 2026",
        "message": "Blog publication date is in the current quarter (October - December 2026)."
      },
      "tags": {
        "status": "skipped",
        "message": "Tag validation was skipped because tags were not provided."
      },
      "topic": { "status": "passed" },
      "summary": { "status": "passed" },
      "contentLength": {
        "status": "passed",
        "wordCount": 780,
        "minRequired": 500,
        "message": "Blog length passed (780 words >= 500 words)."
      }
    }
  }
}
```

#### 3. Failed Verification / Mismatches (HTTP 200 OK)

```json
{
  "success": true,
  "status": "invalid",
  "message": "Blog verification failed.",
  "errors": [
    {
      "code": "AUTHOR_MISMATCH",
      "field": "username",
      "message": "The submitted username does not match the blog author.",
      "expected": "janedoe",
      "actual": "otheruser"
    },
    {
      "code": "PUBLICATION_DATE_MISMATCH",
      "field": "publishedAt",
      "message": "The submitted publication date does not match the blog's publication date.",
      "expected": "2026-10-11",
      "actual": "2026-10-12"
    },
    {
      "code": "NOT_IN_CURRENT_QUARTER",
      "field": "publishedAt",
      "message": "Blog publication date is not in the current quarter. Expected October - December 2026, but blog was published in April - June 2026.",
      "expected": "October - December 2026",
      "actual": "April - June 2026"
    },
    {
      "code": "INSUFFICIENT_CONTENT_LENGTH",
      "field": "contentLength",
      "message": "Blog length check failed. Article contains 320 words, but a minimum of 500 words is required.",
      "expected": 500,
      "actual": 320
    }
  ],
  "data": {
    "platform": "devto",
    "url": "https://dev.to/janedoe/building-a-node-api-123",
    "checks": {
      "url": { "status": "passed" },
      "username": { "status": "failed" },
      "publishedAt": { "status": "failed" },
      "quarter": { "status": "failed" },
      "tags": { "status": "skipped" },
      "topic": { "status": "passed" },
      "summary": { "status": "passed" },
      "contentLength": { "status": "failed", "wordCount": 320, "minRequired": 500 }
    }
  }
}
```

#### 4. Unverified Response (HTTP 200 OK)

Returned when source platform times out or upstream metadata is inaccessible:

```json
{
  "success": true,
  "status": "unverified",
  "message": "Blog verification could not be completed.",
  "errors": [
    {
      "code": "SOURCE_TIMEOUT",
      "field": null,
      "message": "The source platform did not respond within the allowed time."
    }
  ],
  "data": {
    "platform": "devto",
    "url": "https://dev.to/janedoe/building-a-node-api-123",
    "checks": {
      "url": { "status": "unverified" },
      "username": { "status": "unverified" },
      "publishedAt": { "status": "unverified" },
      "quarter": { "status": "unverified" },
      "tags": { "status": "skipped" },
      "topic": { "status": "unverified" },
      "summary": { "status": "unverified" },
      "contentLength": { "status": "unverified" }
    }
  }
}
```

---

## Error Codes Registry

| Error Code | HTTP Status | Meaning |
|---|---|---|
| `INVALID_REQUEST` | 400 | Request body or structure is malformed JSON |
| `MISSING_REQUIRED_FIELD` | 400 | A required field is missing |
| `INVALID_PLATFORM` | 422 | Unsupported platform |
| `INVALID_URL` | 422 | Malformed URL or unauthorized host |
| `UNSAFE_URL` | 422 | URL or redirect targets loopback or private network |
| `ARTICLE_NOT_FOUND` | 200 | Source confirms article does not exist (`status: invalid`) |
| `ARTICLE_ACCESS_DENIED` | 200 | Upstream article is paywalled or restricted (`status: unverified`) |
| `AUTHOR_MISMATCH` | 200 | Expected username differs from canonical author (`status: invalid`) |
| `PUBLICATION_DATE_MISMATCH`| 200 | Expected date differs from publication date (`status: invalid`) |
| `TAGS_MISMATCH` | 200 | Supplied tags differ from source tags (`status: invalid`) |
| `TOPIC_MISMATCH` | 200 | Expected topic differs from verified topic (`status: invalid`) |
| `SUMMARY_MISMATCH` | 200 | Expected summary differs from description (`status: invalid`) |
| `NOT_IN_CURRENT_QUARTER` | 200 | Blog creation date is outside current quarter (`status: invalid`) |
| `INSUFFICIENT_CONTENT_LENGTH` | 200 | Article word count is below required minimum (`status: invalid`) |
| `SOURCE_METADATA_UNAVAILABLE`| 200 | Required metadata cannot be retrieved (`status: unverified`) |
| `SOURCE_RATE_LIMITED` | 200 | Source platform rate-limited the request (`status: unverified`) |
| `SOURCE_TIMEOUT` | 200 | Source request timed out (`status: unverified`) |
| `SOURCE_UNAVAILABLE` | 200 | Source service is temporarily down (`status: unverified`) |
| `SOURCE_RESPONSE_INVALID` | 200 | Source response could not be parsed (`status: unverified`) |
| `INTERNAL_ERROR` | 500 | Unexpected internal server error |

---

## Quarter Verification Schedule

The API strictly verifies whether the blog's publication date falls within the **current quarter**. The four quarterly intervals are defined as:

| Quarter | Date Range | Description |
|---|---|---|
| **Quarter 1** | April 1 – June 30 | Q1 |
| **Quarter 2** | July 1 – September 30 | Q2 |
| **Quarter 3** | October 1 – December 31 | Q3 |
| **Quarter 4** | January 1 – March 31 | Q4 |

If the article was published in an earlier or future quarter compared to the current system date (or caller's `referenceDate`), the check returns `status: "failed"` with error code `NOT_IN_CURRENT_QUARTER` and marks verification as `invalid`.

---

## cURL Request Examples

### 1. Verify a Medium Blog (with Author JSON-LD Extraction & Quarter Check)

```bash
curl -X POST http://localhost:3000/api/v1/blogs/verify \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "medium",
    "url": "https://medium.com/@thedevankit/mastering-clean-architecture-in-nodejs-abc12345",
    "username": "thedevankit",
    "publishedAt": "2026-10-15",
    "tags": ["nodejs", "architecture", "express"],
    "topic": "Backend Development",
    "summary": "A comprehensive deep dive into implementing clean architecture and domain-driven design in Node.js applications.",
    "minWordCount": 500
  }'
```

### 2. Verify a DEV Community (dev.to) Blog

```bash
curl -X POST http://localhost:3000/api/v1/blogs/verify \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "devto",
    "url": "https://dev.to/janedoe/building-a-rest-api-with-nodejs-123",
    "username": "janedoe",
    "publishedAt": "2026-10-11",
    "tags": ["nodejs", "api", "express"],
    "topic": "Backend Development",
    "summary": "A comprehensive guide to building clean, maintainable REST APIs with Node.js and Express.",
    "minWordCount": 500
  }'
```

### 3. Verify a Blog with Historical/Custom Reference Date

To verify an older blog against the quarter it was published in, provide `referenceDate`:

```bash
curl -X POST http://localhost:3000/api/v1/blogs/verify \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "devto",
    "url": "https://dev.to/janedoe/building-a-rest-api-with-nodejs-123",
    "username": "janedoe",
    "publishedAt": "2026-05-20",
    "referenceDate": "2026-06-01",
    "topic": "Backend Development",
    "summary": "A comprehensive guide to building clean, maintainable REST APIs with Node.js and Express."
  }'
```

---

## Topic Taxonomy

The deterministic topic taxonomy maps article tags and categories to canonical classifications:

- **Backend Development** (e.g. `nodejs`, `express`, `api`, `django`, `spring`, `fastapi`, `graphql`, `microservices`)
- **Frontend Development** (e.g. `react`, `vue`, `angular`, `svelte`, `css`, `html`, `tailwind`, `nextjs`)
- **Full Stack Development** (e.g. `fullstack`, `mern`, `mean`, `webdev`)
- **DevOps & Cloud** (e.g. `docker`, `kubernetes`, `aws`, `gcp`, `azure`, `ci-cd`, `terraform`)
- **Artificial Intelligence & Machine Learning** (e.g. `ai`, `machine-learning`, `llm`, `data-science`, `nlp`)
- **Mobile Development** (e.g. `android`, `ios`, `flutter`, `react-native`, `swift`, `kotlin`)
- **Cybersecurity** (e.g. `security`, `cybersecurity`, `auth`, `jwt`, `cryptography`)
- **Database & Data Engineering** (e.g. `database`, `sql`, `postgresql`, `mysql`, `mongodb`, `redis`)
- **Software Architecture & Design** (e.g. `architecture`, `design-patterns`, `system-design`, `unix`)
- **Programming Languages** (e.g. `programming`, `javascript`, `typescript`, `python`, `rust`, `go`)
- **Testing & Quality Assurance** (e.g. `testing`, `qa`, `jest`, `cypress`, `unit-testing`)
- **Web Development**

---

## License

MIT

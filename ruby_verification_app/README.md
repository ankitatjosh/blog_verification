# Ruby Blog Verification App

A full Ruby verification application demonstrating and testing the `blog_verification` Ruby gem.

## Features Verified

- **Platform Support**: Medium and DEV Community (`devto`).
- **URL Syntax & SSRF Protection**: Whitelisted domains and blocked private/loopback IPs.
- **Author Username Verification**: Supports Medium JSON-LD `identifier`/`@id`/`url` and DEV.to user metadata.
- **Publication Date Verification**: UTC calendar day comparison (`YYYY-MM-DD`).
- **Quarter Verification**: Confirms blog is published in the current quarter:
  - Q1: April – June
  - Q2: July – September
  - Q3: October – December
  - Q4: January – March
- **Article Length Verification**: Confirms content length meets minimum word requirement (>= 500 words).
- **Optional Tags Validation**: Skips when omitted or empty; compares case-insensitively as sets when provided.
- **Topic Matching**: Canonical taxonomy mapping and synonym resolution.
- **Summary Validation**: HTML stripping, whitespace normalization, and substring containment.
- **Error Handling**: Standardized error codes and check statuses.

## Quick Start

### 1. Install Dependencies
```bash
bundle install
```

### 2. Run the Comprehensive Verification Suite
```bash
ruby app.rb
# or
ruby app.rb --suite
```

### 3. Start the Verification HTTP API Server
```bash
ruby app.rb --server 4567
```

Test with curl:
```bash
curl -X POST http://localhost:4567/api/v1/blogs/verify \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "devto",
    "url": "https://dev.to/janedoe/building-a-rest-api-with-nodejs-123",
    "username": "janedoe",
    "publishedAt": "2026-10-11",
    "topic": "Backend Development",
    "summary": "A comprehensive guide to building clean, maintainable REST APIs with Node.js and Express."
  }'
```

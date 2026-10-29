# BlogVerification — Ruby Gem

A robust, lightweight Ruby Gem for verifying whether a submitted blog URL belongs to the expected author, was published in the current quarter, contains sufficient article length, and matches expected topic, summary, and tag metadata.

Built for **Ruby on Rails** applications and standalone Ruby backends.

Supports **Medium** and **DEV Community (`dev.to`)**.

> [!TIP]
> **Sample Verification App & Server Included**: A complete verification runner and HTTP API server is available in [`ruby_verification_app/`](./ruby_verification_app) to test and run the gem locally.

---

## Key Features

- **Strict Ruby 2.7.8+ Compatibility**: Compatible with Ruby 2.7.8 through modern Ruby 3.x, tested across standard MRI runtimes.
- **Identical Input & Output Contract**: Produces the exact same structured JSON/Hash responses, error codes, and field checks as the original Node.js REST API.
- **Rails Integration**:
  - Direct helper: `BlogVerification.verify(params)`
  - ActiveModel / ActiveRecord validation: `validates :url, blog_verification: { ... }`
- **Platform Adapters**:
  - **DEV Community**: Official Forem API integration with canonical author extraction, tag lists, publication timestamps, and excerpts.
  - **Medium**: Parses JSON-LD structured data (`NewsArticle`/`BlogPosting`) to extract canonical author identifiers (`author.identifier`, `@id`, `url`), publication timestamps, tags, and body content.
- **Current Quarter Verification**:
  - Automatically verifies whether the blog was created in the current quarter:
    - **Quarter 1**: April 1 – June 30
    - **Quarter 2**: July 1 – September 30
    - **Quarter 3**: October 1 – December 31
    - **Quarter 4**: January 1 – March 31
  - Out-of-quarter articles fail with `NOT_IN_CURRENT_QUARTER`.
  - Supports optional `reference_date` (`YYYY-MM-DD`) for deterministic testing.
- **Article Word Count (Length Check)**:
  - Strips HTML tags and markdown formatting to count body words.
  - Verifies minimum word count (default: 500 words). Articles under 500 words fail with `INSUFFICIENT_CONTENT_LENGTH`.
- **SSRF & Outbound Security**:
  - Validates URL syntax, protocols (HTTPS), and approved hosts.
  - Verifies destination IP addresses against private and loopback CIDR blocks before connecting.
  - Safely follows HTTP redirects up to a maximum depth of 5, re-validating destination hosts and IPs at every hop.

---

## Installation

### In a Ruby on Rails Application

Add this line to your application's `Gemfile`:

```ruby
gem 'blog_verification'
```

And then execute:

```bash
bundle install
```

### In Plain Ruby or CLI

Install directly via RubyGems:

```bash
gem install blog_verification
```

---

## Usage in Ruby on Rails

### 1. In Controllers or Service Objects

You can call `BlogVerification.verify` using either **symbols** or **strings** for keys:

```ruby
class BlogSubmissionsController < ApplicationController
  def verify
    result = BlogVerification.verify(
      platform: params[:platform],                      # 'medium' or 'devto'
      url: params[:url],                                # Full article URL
      username: params[:username],                      # Expected author username
      published_at: params[:published_at],              # 'YYYY-MM-DD'
      tags: params[:tags],                              # Optional array of strings
      topic: params[:topic],                            # 'Backend Development'
      summary: params[:summary],                        # Expected description
      min_word_count: 500                               # Optional, defaults to 500
    )

    case result['status']
    when 'valid'
      render json: { success: true, message: 'Blog verified successfully!', data: result['data'] }
    when 'invalid'
      render json: { success: false, errors: result['errors'], data: result['data'] }, status: :unprocessable_entity
    when 'unverified'
      render json: { success: false, message: 'Upstream platform unavailable.', errors: result['errors'] }, status: :service_unavailable
    else
      render json: { success: false, errors: result['errors'] }, status: :bad_request
    end
  end
end
```

### 2. In ActiveRecord Models (Custom Validator)

The gem comes with an ActiveModel validator out-of-the-box:

```ruby
class ArticleSubmission < ApplicationRecord
  # Attributes: platform, url, author_username, publication_date, topic, summary, tags

  validates :url, presence: true, blog_verification: {
    platform: :platform,
    username: :author_username,
    published_at: :publication_date,
    topic: :topic,
    summary: :summary,
    tags: :tags,
    min_word_count: 500
  }
end
```

When calling `article_submission.valid?`, the validator automatically performs the verification. Any verification errors (e.g. `AUTHOR_MISMATCH`, `NOT_IN_CURRENT_QUARTER`, `INSUFFICIENT_CONTENT_LENGTH`) are appended to `article_submission.errors[:url]`.

---

## Configuration

You can configure global gem settings via an initializer (e.g. `config/initializers/blog_verification.rb` in Rails):

```ruby
BlogVerification.configure do |config|
  config.request_timeout = 5.0      # Outbound request timeout in seconds (default: 5.0)
  config.max_redirects = 5          # Maximum redirects to follow (default: 5)
  config.require_https = true       # Require HTTPS URLs in production (default: true)
  config.skip_dns_check = false     # Set true only in offline/mock testing environments
end
```

---

## Input & Output Specification

### Input Hash

Both `camelCase` and `snake_case` keys are supported:

| Field | Type | Required | Description |
|---|---|---|---|
| `platform` | String | **Yes** | `"devto"` or `"medium"` |
| `url` | String | **Yes** | Article HTTPS URL |
| `username` | String | **Yes** | Expected canonical author username |
| `published_at` / `publishedAt` | String | **Yes** | Original publication date in `YYYY-MM-DD` |
| `tags` | Array of strings | No | Expected tags; omitting or `[]` skips validation |
| `topic` | String | **Yes** | Expected topic matching taxonomy |
| `summary` | String | **Yes** | Expected official description or excerpt |
| `min_word_count` / `minWordCount` | Integer | No | Minimum required word count (default: `500`) |
| `reference_date` / `referenceDate` | String | No | Custom reference date (`YYYY-MM-DD`) for quarterly verification (default: today) |

---

### Output Hash Examples

#### 1. Valid Blog Verification

```json
{
  "success": true,
  "status": "valid",
  "message": "Blog verification completed successfully.",
  "data": {
    "platform": "medium",
    "url": "https://medium.com/@thedevankit/mastering-clean-architecture-in-nodejs-abc12345",
    "checks": {
      "url": { "status": "passed" },
      "username": {
        "status": "passed",
        "expected": "thedevankit",
        "actual": "thedevankit"
      },
      "publishedAt": {
        "status": "passed",
        "expected": "2026-10-15",
        "actual": "2026-10-15"
      },
      "quarter": {
        "status": "passed",
        "currentQuarter": "October - December 2026",
        "blogQuarter": "October - December 2026",
        "message": "Blog publication date is in the current quarter (October - December 2026)."
      },
      "tags": {
        "status": "passed",
        "expected": ["architecture", "express", "nodejs"],
        "actual": ["architecture", "express", "nodejs"]
      },
      "topic": {
        "status": "passed",
        "expected": "Backend Development",
        "actual": "Backend Development"
      },
      "summary": { "status": "passed" },
      "contentLength": {
        "status": "passed",
        "wordCount": 850,
        "minRequired": 500,
        "message": "Blog length passed (850 words >= 500 words)."
      }
    }
  }
}
```

#### 2. Failed Verification (Mismatch / Out of Quarter / Short Length)

```json
{
  "success": true,
  "status": "invalid",
  "message": "Blog verification failed.",
  "errors": [
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
      "message": "The blog content does not meet the minimum required length of 500 words.",
      "expected": 500,
      "actual": 250
    }
  ],
  "data": {
    "platform": "medium",
    "url": "https://medium.com/@thedevankit/mastering-clean-architecture-in-nodejs-abc12345",
    "checks": {
      "url": { "status": "passed" },
      "username": { "status": "passed" },
      "publishedAt": { "status": "passed" },
      "quarter": { "status": "failed" },
      "tags": { "status": "passed" },
      "topic": { "status": "passed" },
      "summary": { "status": "passed" },
      "contentLength": { "status": "failed", "wordCount": 250, "minRequired": 500 }
    }
  }
}
```

---

## Error Codes

| Error Code | Meaning |
|---|---|
| `INVALID_REQUEST` | Input payload or date format is malformed |
| `MISSING_REQUIRED_FIELD` | A required field (`platform`, `url`, `username`, `publishedAt`, `topic`, `summary`) is missing |
| `INVALID_PLATFORM` | Platform is not `'medium'` or `'devto'` |
| `INVALID_URL` | URL is malformed, uses an unsupported host, or targets an index/profile page |
| `UNSAFE_URL` | URL or redirect targets loopback or private network (SSRF protection) |
| `ARTICLE_NOT_FOUND` | Source platform confirms article does not exist |
| `ARTICLE_ACCESS_DENIED` | Article is restricted, paywalled, or private |
| `AUTHOR_MISMATCH` | Expected username does not match canonical platform username |
| `PUBLICATION_DATE_MISMATCH` | Expected date does not match source publication date (UTC) |
| `NOT_IN_CURRENT_QUARTER` | Blog publication date is outside the current quarter |
| `INSUFFICIENT_CONTENT_LENGTH` | Article word count is under the required minimum (default 500) |
| `TAGS_MISMATCH` | Supplied tags do not match article tags |
| `TOPIC_MISMATCH` | Expected topic does not match verified topic |
| `SUMMARY_MISMATCH` | Expected summary does not match description |
| `SOURCE_RATE_LIMITED` | Source platform rate limited the request |
| `SOURCE_TIMEOUT` | Upstream platform timed out |
| `SOURCE_UNAVAILABLE` | Upstream platform is down |

---

# Step-by-Step Guide to Uploading the Gem to RubyGems.org

Follow these instructions to build, package, and publish `blog_verification` to the official RubyGems library ([rubygems.org](https://rubygems.org)).

### Step 1: Create a RubyGems.org Account

1. Go to [https://rubygems.org/sign_up](https://rubygems.org/sign_up) and register an account.
2. Verify your email address.
3. Enable Multi-Factor Authentication (MFA) in your account settings (RubyGems now requires MFA for gem maintainers).

---

### Step 2: Configure RubyGems API Credentials on Your Machine

Open your terminal and run:

```bash
gem signin
```

Enter your RubyGems email and password. When prompted, enter your MFA code. This will save your API key securely into `~/.gem/credentials`.

Alternatively, you can manually set your API key:

```bash
curl -u <your-username> https://rubygems.org/api/v1/api_key.yaml > ~/.gem/credentials
chmod 0600 ~/.gem/credentials
```

---

### Step 3: Verify Gem Metadata

Open `blog_verification.gemspec` and ensure the following fields are personalized:

- `spec.name`: Must be unique on RubyGems.org. If `blog_verification` is already taken, you can name it `blog_verification_api` or `my_org_blog_verification`.
- `spec.version`: Ensure `lib/blog_verification/version.rb` is set (e.g. `'1.0.0'`).
- `spec.authors`: Your name or organization.
- `spec.email`: Your contact email.
- `spec.homepage`: Your repository URL (e.g. GitHub URL).

---

### Step 4: Run the Test Suite

Before releasing, execute the test suite to ensure all tests pass:

```bash
bundle install
bundle exec rspec
```

All unit and integration specs should pass.

---

### Step 5: Build the Gem Package

In the `rubyGeM` root directory, run:

```bash
gem build blog_verification.gemspec
```

Output:
```text
  Successfully built RubyGem
  Name: blog_verification
  Version: 1.0.0
  File: blog_verification-1.0.0.gem
```

This creates the packaged binary file: `blog_verification-1.0.0.gem`.

---

### Step 6: Test the Gem Locally (Optional but Recommended)

You can install the newly built gem locally to verify that it installs and loads cleanly:

```bash
gem install ./blog_verification-1.0.0.gem
```

Test it in `irb`:

```ruby
require 'blog_verification'

BlogVerification::VERSION
# => "1.0.0"
```

---

Install with:

```bash
gem install blog_verification
```

Or add it to their Rails `Gemfile`:

```ruby
gem 'blog_verification', '~> 1.0'
```

---

## Sample Application & Verification Runner

This repository includes a standalone Ruby verification application located in [`ruby_verification_app/`](./ruby_verification_app):

- **Automated Verification Suite**: Exercises all 13 core scenarios (valid Medium with JSON-LD, valid DEV.to, author mismatch, date mismatch, quarter checks, word count checks, optional tags, topic derivation, summary comparison, and error handling).
- **HTTP API Server**: Runs an Express/Node.js-compatible HTTP server on `http://localhost:4567/api/v1/blogs/verify`.

To run the sample app:
```bash
cd ruby_verification_app
bundle install
ruby app.rb          # Runs the 13 verification scenarios
ruby app.rb --server # Starts the REST API server on port 4567
```

---

## License

The gem is available as open source under the terms of the [MIT License](LICENSE.txt).

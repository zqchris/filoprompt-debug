# Changelog

All notable changes to this project will be documented in this file.

## [1.1.1] - 2026-01-08

### Added
- **Generation Model Selector**: Batch test now allows selecting generation model (provider + model)
  - Can choose different models for generation vs comparison per batch run
  - Defaults to global settings but can be customized

## [1.1.0] - 2026-01-08

### Added
- **Email Cleaner**: Automatic email content cleaning to reduce token usage (99% compression for marketing emails)
  - Preserves important headers (From, To, Date, Subject, List-Unsubscribe, etc.)
  - Extracts readable text from HTML emails with proper UTF-8 decoding
  - New `{{MAIL}}` returns cleaned email, `{{MAIL_RAW}}` returns original
- **Golden Results Status Icons**: Test Data view now shows golden result status for each email
  - Green badge = Reply golden set
  - Blue badge = Summarize golden set  
  - Purple badge = TODO golden set
- **Batch Test Improvements**:
  - "Save All as Golden" button for first-time runs
  - Separate comparison model selector (use higher-quality models for evaluation)
  - Default comparison models: Gemini 2.5 Pro / GPT-5.2 Pro
- **User Message Template**: System Prompt and User Message can now be saved together per operation type
- **Gemini 3 Thinking Mode**: Disabled by default to reduce latency and token consumption
- **Performance Optimizations**:
  - Added 500ms debounce to preview updates
  - Limited preview display to 2000 characters

### Fixed
- HTML to text extraction using cheerio for complex marketing emails
- Quoted-printable UTF-8 decoding for Chinese content
- CRLF line ending handling in EML files

## [1.0.0] - 2026-01-07

### Added
- Initial release
- Prompt Playground with dynamic variable support
- Test Data management (upload/delete .eml files)
- Batch testing with AI comparison scoring
- Multi-AI provider support (Gemini, OpenAI)
- Operation-specific prompt templates
- Writing tools (lengthen, shorten, spell check, formalize, casual)
- Golden Results system for quality benchmarking
- Settings management with API key configuration

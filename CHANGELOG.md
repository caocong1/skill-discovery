# Changelog

All notable changes to this project will be documented in this file.

## [1.0.0] - 2026-03-30

### Added
- Initial release
- Automatic skill discovery based on user intent
- Support for English and Chinese input
- Quality validation (install counts, trusted sources)
- Auto-install with whitelist support
- Safety features: pre-audit, backup, logging
- OpenClaw integration hook
- CLI and programmatic API
- Comprehensive test suite (32 tests)

### Features
- Intent analysis with confidence scoring
- Domain detection (DevOps, Testing, Design, etc.)
- Caching with TTL and size limits
- Retry mechanism with exponential backoff
- Sensitive data sanitization in logs
- Trash backup with 7-day retention

### Security
- Pre-audit for dangerous patterns
- Shell injection protection
- Whitelist for trusted sources
- Input validation
- Log sanitization
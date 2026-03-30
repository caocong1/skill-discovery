---
name: skill-discovery
description: Automatically discover and install skills based on user intent. Analyzes user input, searches for matching skills, validates quality, and auto-installs the best match.
---

# Skill Discovery

Automatically discover and install skills based on what the user is trying to do.

## When to Use This Skill

Use this skill when:

- The user asks for help with a task that might have an existing skill solution
- The user expresses interest in extending capabilities (e.g., "how do I deploy", "help me with testing")
- The user mentions wanting tools for specific domains (design, testing, deployment, etc.)
- The user asks "is there a skill for X" or "find a skill that can..."

## What It Does

1. **Analyzes user input** to understand intent and identify what skill domain is needed
2. **Searches skills.sh** for matching skills using `npx skills find`
3. **Validates quality** - checks install counts, source reputation, ratings
4. **Auto-installs** the best matching skill with user confirmation (or automatically if whitelisted)

## Usage

### Automatic Mode (Hook)

Integrate into OpenClaw's input processing:

```javascript
const { onUserInput } = require('./skill-discovery');

// In OpenClaw's message handler
const result = await onUserInput(userMessage);
if (result.installed) {
  notifyUser(`✅ Installed ${result.skill.name}`);
}
```

### Manual Mode

```javascript
const { autoDiscover } = require('./skill-discovery');

const result = await autoDiscover('help me deploy to Vercel');
// Automatically finds and installs vercel-deploy skill
```

### CLI Mode

```bash
node /path/to/skill-discovery/index.js
```

## Configuration

Edit `config.js` or set environment variables:

```javascript
{
  // Auto-install without confirmation for trusted sources
  autoInstall: false,
  
  // Require approval even for whitelisted skills
  requireApproval: true,
  
  // Minimum install count to consider a skill
  minInstalls: 1000,
  
  // Confidence threshold to trigger search (0-1)
  confidenceThreshold: 0.6,
  
  // Trusted skill owners
  trustedOwners: ['vercel-labs', 'anthropics', 'openai'],
  
  // Cache TTL in milliseconds
  cacheTtl: 600000 // 10 minutes
}
```

## Safety Features

- **Pre-audit**: Scans skill content for dangerous patterns before install
- **Whitelist**: Only auto-installs from trusted sources with high install counts
- **Sandbox**: Backs up removed skills to `.trash/` for 7 days
- **Logging**: All actions logged with sanitized input (no passwords/tokens)
- **Confirmation**: Can require user approval before installing

## Supported Languages

- English: "how do I deploy", "find a skill for testing"
- Chinese: "帮我部署", "怎么优化性能", "写个测试"

## Domains Covered

- DevOps: deploy, docker, kubernetes, CI/CD
- Testing: jest, playwright, unit tests, e2e
- Design: UI/UX, CSS, components, Tailwind
- Documentation: docs, README, changelog
- Code Quality: review, lint, refactor
- Data Processing: PDF, Excel, CSV, JSON
- Image Processing: compress, resize, OCR
- Video Processing: ffmpeg, convert
- Performance: optimize, speed up
- API/Network: scraper, HTTP requests
- Database: SQL, MongoDB, Redis
- AI/ML: AI, machine learning, models
- Security: auth, encryption, permissions
- Mobile: apps, iOS, Android, mini-programs
- Game Development: Unity, game dev

## Dependencies

- Node.js >= 18
- `npx skills` CLI (from skills.sh)
- OpenClaw (optional, for hook integration)

## License

MIT-0
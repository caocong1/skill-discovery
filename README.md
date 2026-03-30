# Skill Discovery

[![License: MIT-0](https://img.shields.io/badge/License-MIT--0-blue.svg)](LICENSE)

Automatically discover and install skills based on user intent.

## Features

- 🔍 **Intent Analysis** - Understands what the user wants to do
- 🤖 **Auto Search** - Finds matching skills from skills.sh
- ✅ **Quality Validation** - Checks install counts, ratings, source reputation
- 📦 **Auto Install** - Installs the best matching skill automatically
- 🛡️ **Safety First** - Pre-audit, whitelist, backup, logging
- 🌐 **Multi-language** - Supports English and Chinese

## Quick Start

```bash
# Clone and enter directory
cd ~/.openclaw/workspace/skill-discovery

# Install dependencies (if any)
npm install

# Run in dry-run mode (test without installing)
node index.js

# Use in your code
const { autoDiscover } = require('./index');
const result = await autoDiscover('help me deploy to Vercel');
```

## Usage

### Automatic Mode

```javascript
const { onUserInput } = require('./skill-discovery');

// Integrate into OpenClaw
const result = await onUserInput('帮我优化 React 性能');
// Automatically finds and installs react-best-practices skill
```

### Manual Mode

```javascript
const { autoDiscover } = require('./skill-discovery');

const result = await autoDiscover('how do I write tests', { dryRun: true });
console.log(result);
```

### CLI Mode

```bash
node index.js
```

## Configuration

Create `config.json` in the skill directory:

```json
{
  "autoInstall": false,
  "requireApproval": true,
  "minInstalls": 1000,
  "confidenceThreshold": 0.6,
  "trustedOwners": ["vercel-labs", "anthropics", "openai"]
}
```

## Project Structure

```
skill-discovery/
├── SKILL.md              # Skill definition for OpenClaw
├── README.md             # This file
├── package.json          # Package config
├── config.js             # Default configuration
├── skills-cli.js         # CLI wrapper for npx skills
├── auto-discover.js      # Core discovery logic
├── openclaw-hook.js      # OpenClaw integration
├── index.js              # Main entry
├── test/                 # Test files
│   ├── unit/
│   └── integration/
└── docs/                 # Documentation
```

## Testing

```bash
# Run all tests
npm test

# Run unit tests only
npm run test:unit

# Run with coverage
npm run test:coverage
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Add tests for new features
4. Ensure all tests pass
5. Submit a pull request

## License

MIT-0 - See [LICENSE](LICENSE) for details.

## Related

- [skills.sh](https://skills.sh) - Skill registry
- [OpenClaw](https://openclaw.ai) - Agent framework
- [ClawHub](https://clawhub.ai) - Skill directory
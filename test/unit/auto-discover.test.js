/**
 * Unit tests for auto-discover.js
 */

const {
  analyzeNeed,
  validateSkill,
  selectBest,
  validateParams,
  buildLogEntry,
  sanitize,
  LOG_SCHEMA
} = require('../../auto-discover');

// ==================== analyzeNeed ====================

describe('analyzeNeed', () => {
  test('should detect explicit trigger "find a skill for"', () => {
    const result = analyzeNeed('find a skill for deploying');
    expect(result.shouldSearch).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(0.9);
  });

  test('should detect Chinese trigger "\u5e2e\u6211"', () => {
    const result = analyzeNeed('\u5e2e\u6211\u90e8\u7f72\u5230 Vercel');
    expect(result.shouldSearch).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(0.8);
  });

  test('should detect domain keyword "\u90e8\u7f72"', () => {
    const result = analyzeNeed('\u600e\u4e48\u90e8\u7f72\u7f51\u7ad9');
    expect(result.shouldSearch).toBe(true);
    expect(result.domain).toBe('devops');
  });

  test('should detect domain keyword "\u6d4b\u8bd5"', () => {
    const result = analyzeNeed('\u5199\u4e2a\u6d4b\u8bd5');
    expect(result.shouldSearch).toBe(true);
    expect(result.domain).toBe('testing');
  });

  test('should not trigger for knowledge questions', () => {
    const result = analyzeNeed('\u4ec0\u4e48\u662f React');
    expect(result.shouldSearch).toBe(false);
  });

  test('should not trigger for weather queries', () => {
    const result = analyzeNeed('\u4eca\u5929\u5929\u6c14\u600e\u4e48\u6837');
    expect(result.shouldSearch).toBe(false);
  });

  test('should not trigger for debug questions', () => {
    const result = analyzeNeed('\u4e3a\u4ec0\u4e48\u62a5\u9519');
    expect(result.shouldSearch).toBe(false);
  });

  test('should handle "\u600e\u4e48\u6837\u624d\u80fd" without false negative', () => {
    const result = analyzeNeed('\u600e\u4e48\u6837\u624d\u80fd\u90e8\u7f72');
    expect(result.shouldSearch).toBe(true);
  });

  test('should detect English domain keywords', () => {
    const result = analyzeNeed('help me with kubernetes deployment');
    expect(result.shouldSearch).toBe(true);
    expect(result.domain).toBe('devops');
  });

  test('should detect AI/ML domain', () => {
    const result = analyzeNeed('I need a machine learning tool');
    expect(result.shouldSearch).toBe(true);
    expect(result.domain).toBe('ai-ml');
  });

  test('should truncate query to max length', () => {
    const longInput = 'find a skill for ' + 'a'.repeat(100);
    const result = analyzeNeed(longInput);
    expect(result.query.length).toBeLessThanOrEqual(50);
  });
});

// ==================== validateSkill ====================

describe('validateSkill', () => {
  test('should pass for high-install skill from trusted owner', () => {
    const skill = {
      fullName: 'vercel-labs/agent-skills@react',
      owner: 'vercel-labs',
      installs: 15000
    };

    const result = validateSkill(skill);
    expect(result.passed).toBe(true);
    expect(result.riskLevel).toBe('low');
  });

  test('should fail for low-install skill', () => {
    const skill = {
      fullName: 'unknown/skill@test',
      owner: 'unknown',
      installs: 100
    };

    const result = validateSkill(skill);
    expect(result.passed).toBe(false);
    expect(result.riskLevel).toBe('high');
  });

  test('should warn for untrusted owner', () => {
    const skill = {
      fullName: 'random/skill@test',
      owner: 'random',
      installs: 5000
    };

    const result = validateSkill(skill);
    expect(result.passed).toBe(true);
    expect(result.isTrusted).toBe(false);
  });

  test('should mark as high risk for invalid format', () => {
    const skill = {
      fullName: 'no-at-sign',
      owner: 'unknown',
      installs: 5000
    };

    const result = validateSkill(skill);
    expect(result.passed).toBe(false);
    expect(result.riskLevel).toBe('high');
  });
});

// ==================== selectBest ====================

describe('selectBest', () => {
  test('should select highest scoring skill', () => {
    const skills = [
      { fullName: 'a/b@1', owner: 'vercel-labs', installs: 1000 },
      { fullName: 'c/d@2', owner: 'vercel-labs', installs: 50000 },
      { fullName: 'e/f@3', owner: 'unknown', installs: 2000 }
    ];

    const best = selectBest(skills);
    expect(best.skill.fullName).toBe('c/d@2');
  });

  test('should prefer trusted owner even with lower installs', () => {
    const skills = [
      { fullName: 'vercel-labs/skill@1', owner: 'vercel-labs', installs: 10000 },
      { fullName: 'unknown/skill@2', owner: 'unknown', installs: 50000 }
    ];

    const best = selectBest(skills);
    expect(best.skill.owner).toBe('vercel-labs');
  });

  test('should handle single-element array', () => {
    const skills = [{ fullName: 'a/b@c', owner: 'vercel-labs', installs: 5000 }];

    const best = selectBest(skills);
    expect(best.skill.fullName).toBe('a/b@c');
    expect(best.score).toBeGreaterThan(0);
  });

  test('should include validation info in result', () => {
    const skills = [{ fullName: 'a/b@c', owner: 'vercel-labs', installs: 5000 }];

    const best = selectBest(skills);
    expect(best.validation).toBeDefined();
    expect(best.validation.riskLevel).toBeDefined();
  });
});

// ==================== validateParams ====================

describe('validateParams', () => {
  test('should return no errors for valid input', () => {
    expect(validateParams('hello', {})).toEqual([]);
  });

  test('should reject non-string input', () => {
    const errors = validateParams(123);
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('\u5b57\u7b26\u4e32');
  });

  test('should reject empty string', () => {
    const errors = validateParams('   ');
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('\u4e0d\u80fd\u4e3a\u7a7a');
  });

  test('should reject string over 500 chars', () => {
    const errors = validateParams('a'.repeat(501));
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('500');
  });

  test('should reject non-object options', () => {
    const errors = validateParams('hello', 'not-object');
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('\u5bf9\u8c61');
  });

  test('should reject non-boolean dryRun', () => {
    const errors = validateParams('hello', { dryRun: 'yes' });
    expect(errors.length).toBeGreaterThan(0);
    expect(errors[0]).toContain('dryRun');
  });

  test('should accept undefined options', () => {
    expect(validateParams('hello', undefined)).toEqual([]);
  });
});

// ==================== buildLogEntry ====================

describe('buildLogEntry', () => {
  test('should build entry with valid action', () => {
    const entry = buildLogEntry('discover', { input: 'test' });
    expect(entry.schema).toBe('1.0');
    expect(entry.action).toBe('discover');
    expect(entry.timestamp).toBeDefined();
    expect(entry.input).toBe('test');
  });

  test('should default to "error" for invalid action', () => {
    const entry = buildLogEntry('invalid_action', {});
    expect(entry.action).toBe('error');
  });

  test('should include all LOG_SCHEMA actions', () => {
    for (const action of LOG_SCHEMA.ACTIONS) {
      const entry = buildLogEntry(action, {});
      expect(entry.action).toBe(action);
    }
  });
});

// ==================== sanitize ====================

describe('sanitize', () => {
  test('should redact sensitive key names', () => {
    const obj = { token: 'abc123', password: 'secret', name: 'visible' };
    const result = sanitize(obj);
    expect(result.token).toBe('***');
    expect(result.password).toBe('***');
    expect(result.name).toBe('visible');
  });

  test('should redact api_key and credential fields', () => {
    const obj = { api_key: 'key123', credential: 'cred123' };
    const result = sanitize(obj);
    expect(result.api_key).toBe('***');
    expect(result.credential).toBe('***');
  });

  test('should preserve business fields', () => {
    const obj = {
      installs: 15000,
      confidence: 0.9,
      domain: 'devops',
      success: true,
      skillRef: 'vercel-labs/x@deploy',
      owner: 'vercel-labs',
      query: 'deploy'
    };
    const result = sanitize(obj);
    expect(result.installs).toBe(15000);
    expect(result.confidence).toBe(0.9);
    expect(result.domain).toBe('devops');
    expect(result.success).toBe(true);
    expect(result.skillRef).toBe('vercel-labs/x@deploy');
    expect(result.owner).toBe('vercel-labs');
  });

  test('should redact Bearer tokens in string values', () => {
    expect(sanitize('Bearer eyJhbGciOi...')).toBe('***');
  });

  test('should redact sk- API keys in string values', () => {
    expect(sanitize('sk-abc123xyz')).toBe('***');
  });

  test('should redact GitHub tokens in string values', () => {
    expect(sanitize('ghp_abcdef123456')).toBe('***');
  });

  test('should preserve normal strings', () => {
    expect(sanitize('hello world')).toBe('hello world');
  });

  test('should handle null and undefined', () => {
    expect(sanitize(null)).toBeNull();
    expect(sanitize(undefined)).toBeUndefined();
  });

  test('should handle arrays recursively', () => {
    const arr = [{ token: 'secret' }, { name: 'visible' }];
    const result = sanitize(arr);
    expect(result[0].token).toBe('***');
    expect(result[1].name).toBe('visible');
  });

  test('should handle nested objects', () => {
    const obj = { outer: { token: 'x', name: 'y' } };
    const result = sanitize(obj);
    expect(result.outer.token).toBe('***');
    expect(result.outer.name).toBe('y');
  });

  test('should stop at max depth', () => {
    // Build deeply nested object
    let obj = { value: 'deep' };
    for (let i = 0; i < 15; i++) {
      obj = { nested: obj };
    }
    const result = sanitize(obj);
    // Should not throw, and deep values become [MAX_DEPTH]
    expect(JSON.stringify(result)).toContain('[MAX_DEPTH]');
  });

  test('should preserve numbers and booleans', () => {
    expect(sanitize(42)).toBe(42);
    expect(sanitize(true)).toBe(true);
    expect(sanitize(false)).toBe(false);
  });
});

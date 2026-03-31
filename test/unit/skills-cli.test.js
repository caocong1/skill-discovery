/**
 * Unit tests for skills-cli.js
 */

const {
  parseFindOutput,
  stripAnsi,
  shellEscape,
  extractJson,
  withRetry
} = require('../../skills-cli');

// ==================== parseFindOutput ====================

describe('parseFindOutput', () => {
  test('should parse standard output with installs', () => {
    const output = `
vercel-labs/json-render@react 728 installs
\u2514 https://skills.sh/vercel-labs/json-render/react
    `;

    const results = parseFindOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      fullName: 'vercel-labs/json-render@react',
      owner: 'vercel-labs',
      repo: 'json-render',
      skill: 'react',
      installs: 728
    });
  });

  test('should parse output with K suffix', () => {
    const output = `
vercel-labs/agent-skills@vercel-react-best-practices 262K installs
\u2514 https://skills.sh/vercel-labs/agent-skills/vercel-react-best-practices
    `;

    const results = parseFindOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0].installs).toBe(262000);
  });

  test('should parse output with decimal K suffix', () => {
    const output = `
vercel-labs/agent-skills@vercel-react-native-skills 75.5K installs
\u2514 https://skills.sh/vercel-labs/agent-skills/vercel-react-native-skills
    `;

    const results = parseFindOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0].installs).toBe(75500);
  });

  test('should parse output with M suffix', () => {
    const output = `
popular/mega-skill@test 1.5M installs
\u2514 https://skills.sh/popular/mega-skill/test
    `;

    const results = parseFindOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0].installs).toBe(1500000);
  });

  test('should handle ANSI codes', () => {
    const output = '\x1b[38;5;145mvercel-labs/json-render@react\x1b[0m \x1b[36m728 installs\x1b[0m';

    const results = parseFindOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0].installs).toBe(728);
  });

  test('should return empty array for empty input', () => {
    const results = parseFindOutput('');
    expect(results).toEqual([]);
  });

  test('should return empty array for null/undefined input', () => {
    expect(parseFindOutput(null)).toEqual([]);
    expect(parseFindOutput(undefined)).toEqual([]);
  });

  test('should parse multiple skills', () => {
    const output = `
vercel-labs/json-render@react 728 installs
\u2514 https://skills.sh/vercel-labs/json-render/react

anthropics/skills@frontend-design 1500 installs
\u2514 https://skills.sh/anthropics/skills/frontend-design
    `;

    const results = parseFindOutput(output);
    expect(results).toHaveLength(2);
    expect(results[0].owner).toBe('vercel-labs');
    expect(results[1].owner).toBe('anthropics');
  });

  test('should parse lines with emoji prefix via fallback pattern', () => {
    const output = `\u2b50 vercel-labs/agent-skills@react 5000 installs`;
    const results = parseFindOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0].owner).toBe('vercel-labs');
  });

  test('should warn but return empty for unrecognized format', () => {
    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();
    const results = parseFindOutput('some random output that is not a skill');
    expect(results).toEqual([]);
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('CLI \u8f93\u51fa\u683c\u5f0f\u53ef\u80fd\u5df2\u53d8\u5316')
    );
    consoleSpy.mockRestore();
  });
});

// ==================== stripAnsi ====================

describe('stripAnsi', () => {
  test('should remove ANSI codes', () => {
    const text = '\x1b[38;5;145mhello\x1b[0m \x1b[36mworld\x1b[0m';
    expect(stripAnsi(text)).toBe('hello world');
  });

  test('should return plain text unchanged', () => {
    const text = 'hello world';
    expect(stripAnsi(text)).toBe('hello world');
  });
});

// ==================== shellEscape ====================

describe('shellEscape', () => {
  test('should wrap input in single quotes', () => {
    expect(shellEscape('hello')).toBe("'hello'");
  });

  test('should escape single quotes in input', () => {
    const result = shellEscape("it's a test");
    expect(result).toContain("\\'");
  });

  test('should prevent command injection', () => {
    const result = shellEscape('test; rm -rf /');
    expect(result).toBe("'test; rm -rf /'");
  });

  test('should prevent backtick injection', () => {
    const result = shellEscape('test `whoami`');
    expect(result).toBe("'test `whoami`'");
  });

  test('should return empty string for non-string input', () => {
    expect(shellEscape(123)).toBe('');
    expect(shellEscape(null)).toBe('');
    expect(shellEscape(undefined)).toBe('');
  });
});

// ==================== extractJson ====================

describe('extractJson', () => {
  test('should extract JSON array from mixed text', () => {
    const text = 'Some prefix [{"name":"test"}] Some suffix';
    const result = extractJson(text);
    expect(result).toEqual([{ name: 'test' }]);
  });

  test('should return null when no JSON found', () => {
    expect(extractJson('no json here')).toBeNull();
  });

  test('should return null for invalid JSON brackets', () => {
    expect(extractJson('[ invalid json }')).toBeNull();
  });

  test('should handle nested arrays', () => {
    const text = 'prefix [1, [2, 3], 4] suffix';
    const result = extractJson(text);
    expect(result).toEqual([1, [2, 3], 4]);
  });

  test('should return null when ] comes before [', () => {
    expect(extractJson('] before [')).toBeNull();
  });
});

// ==================== withRetry ====================

describe('withRetry', () => {
  test('should return result on first success', async () => {
    const fn = jest.fn().mockResolvedValue('ok');
    const result = await withRetry(fn, { maxRetries: 3 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  test('should retry on failure and succeed', async () => {
    const fn = jest.fn().mockRejectedValueOnce(new Error('fail')).mockResolvedValue('ok');

    const result = await withRetry(fn, { maxRetries: 3, retryDelay: 1 });
    expect(result).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  test('should throw after all retries exhausted', async () => {
    const fn = jest.fn().mockRejectedValue(new Error('always fails'));

    await expect(withRetry(fn, { maxRetries: 2, retryDelay: 1 })).rejects.toThrow('always fails');
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

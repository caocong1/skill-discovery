/**
 * Unit tests for skills-cli.js
 */

const { parseFindOutput, stripAnsi } = require('../../skills-cli');

describe('parseFindOutput', () => {
  test('should parse standard output with installs', () => {
    const output = `
vercel-labs/json-render@react 728 installs
└ https://skills.sh/vercel-labs/json-render/react
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
└ https://skills.sh/vercel-labs/agent-skills/vercel-react-best-practices
    `;
    
    const results = parseFindOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0].installs).toBe(262000);
  });

  test('should parse output with decimal K suffix', () => {
    const output = `
vercel-labs/agent-skills@vercel-react-native-skills 75.5K installs
└ https://skills.sh/vercel-labs/agent-skills/vercel-react-native-skills
    `;
    
    const results = parseFindOutput(output);
    expect(results).toHaveLength(1);
    expect(results[0].installs).toBe(75500);
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

  test('should parse multiple skills', () => {
    const output = `
vercel-labs/json-render@react 728 installs
└ https://skills.sh/vercel-labs/json-render/react

anthropics/skills@frontend-design 1500 installs
└ https://skills.sh/anthropics/skills/frontend-design
    `;
    
    const results = parseFindOutput(output);
    expect(results).toHaveLength(2);
    expect(results[0].owner).toBe('vercel-labs');
    expect(results[1].owner).toBe('anthropics');
  });
});

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
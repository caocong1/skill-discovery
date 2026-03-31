/**
 * Unit tests for openclaw-hook.js
 */

// Mock dependencies before requiring module
jest.mock('../../skills-cli', () => ({
  skillsList: jest.fn(),
  skillsRemove: jest.fn()
}));

jest.mock('../../auto-discover', () => ({
  autoDiscover: jest.fn(),
  buildLogEntry: jest.fn((action, data) => ({
    schema: '1.0',
    timestamp: new Date().toISOString(),
    action,
    ...data
  })),
  sanitize: jest.fn((obj) => obj)
}));

const { onUserInput, generatePrompt, safeRemove, cleanTrash } = require('../../openclaw-hook');
const { autoDiscover } = require('../../auto-discover');
const { skillsList } = require('../../skills-cli');

describe('generatePrompt', () => {
  test('should format successful install', () => {
    const result = {
      success: true,
      installed: true,
      skill: { fullName: 'vercel-labs/x@deploy', installs: 15000, url: 'https://skills.sh/x' }
    };
    const prompt = generatePrompt(result);
    expect(prompt).toContain('vercel-labs/x@deploy');
    expect(prompt).toContain('15,000');
  });

  test('should format already installed', () => {
    const result = {
      success: true,
      alreadyInstalled: true,
      skill: { fullName: 'vercel-labs/x@deploy' }
    };
    const prompt = generatePrompt(result);
    expect(prompt).toContain('已安装');
  });

  test('should format candidates when no valid results', () => {
    const result = {
      success: false,
      candidates: [
        { fullName: 'a/b@c', installs: 500 },
        { fullName: 'd/e@f', installs: 300 }
      ]
    };
    const prompt = generatePrompt(result);
    expect(prompt).toContain('候选');
    expect(prompt).toContain('a/b@c');
    expect(prompt).toContain('d/e@f');
  });

  test('should format fallback on install failure', () => {
    const result = {
      success: false,
      fallback: 'npx skills add x/y@z'
    };
    const prompt = generatePrompt(result);
    expect(prompt).toContain('npx skills add x/y@z');
  });

  test('should return null when no meaningful result', () => {
    const result = { success: false };
    const prompt = generatePrompt(result);
    expect(prompt).toBeNull();
  });
});

describe('onUserInput', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return handled=true when install succeeds', async () => {
    autoDiscover.mockResolvedValue({
      success: true,
      installed: true,
      skill: { fullName: 'vercel-labs/x@deploy' }
    });

    const result = await onUserInput('deploy to vercel');
    expect(result.handled).toBe(true);
    expect(result.response).toContain('vercel-labs/x@deploy');
    expect(result.alreadyInstalled).toBe(false);
  });

  test('should return handled=false with note when already installed', async () => {
    autoDiscover.mockResolvedValue({
      success: true,
      alreadyInstalled: true,
      skill: { fullName: 'vercel-labs/x@deploy' }
    });

    const result = await onUserInput('deploy to vercel');
    expect(result.handled).toBe(false);
    expect(result.alreadyInstalled).toBe(true);
    expect(result.note).toContain('已安装');
  });

  test('should return handled=false with fallback on install failure', async () => {
    autoDiscover.mockResolvedValue({
      success: false,
      fallback: 'npx skills add x/y@z',
      skill: { fullName: 'x/y@z' }
    });

    const result = await onUserInput('deploy something');
    expect(result.handled).toBe(false);
    expect(result.note).toContain('npx skills add');
  });

  test('should return handled=false with candidates when no valid results', async () => {
    autoDiscover.mockResolvedValue({
      success: false,
      candidates: [{ fullName: 'a/b@c' }]
    });

    const result = await onUserInput('some query');
    expect(result.handled).toBe(false);
    expect(result.candidates).toHaveLength(1);
  });

  test('should return handled=false when nothing triggers', async () => {
    autoDiscover.mockResolvedValue({
      success: false
    });

    const result = await onUserInput('what is javascript');
    expect(result.handled).toBe(false);
    expect(result.alreadyInstalled).toBe(false);
  });
});

describe('safeRemove', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return not_found when skill is not installed', async () => {
    skillsList.mockResolvedValue([]);

    const result = await safeRemove('unknown/skill@test');
    expect(result.success).toBe(false);
    expect(result.reason).toBe('not_found');
  });

  test('should handle removal errors gracefully', async () => {
    skillsList.mockRejectedValue(new Error('list failed'));

    const result = await safeRemove('some/skill@test');
    expect(result.success).toBe(false);
    expect(result.reason).toBe('remove_failed');
  });
});

describe('cleanTrash', () => {
  test('should return cached result within interval', async () => {
    // First call with force to set baseline
    await cleanTrash({ force: true });

    // Second call should be cached
    const second = await cleanTrash({ force: false });
    expect(second.cached).toBe(true);
  });

  test('should bypass cache when force=true', async () => {
    const result = await cleanTrash({ force: true });
    expect(result.cached).toBe(false);
  });
});

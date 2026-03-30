/**
 * Integration tests for auto-discover
 * 
 * These tests use real npx skills calls (mocked or with network)
 */

const { autoDiscover } = require('../../auto-discover');

describe('autoDiscover Integration', () => {
  // Use longer timeout for network calls
  jest.setTimeout(30000);

  test('should handle dry run mode', async () => {
    const result = await autoDiscover('deploy to vercel', { dryRun: true });
    
    // Should analyze and search but not install
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('skill');
    expect(result).toHaveProperty('dryRun', true);
    
    if (result.success) {
      expect(result.skill).toHaveProperty('fullName');
      expect(result.skill).toHaveProperty('installs');
    }
  });

  test('should return low confidence for vague input', async () => {
    const result = await autoDiscover('hello world', { dryRun: true });
    
    expect(result.success).toBe(false);
    expect(result.reason).toBe('confidence_too_low');
  });

  test('should return low confidence for knowledge questions', async () => {
    const result = await autoDiscover('what is React', { dryRun: true });
    
    expect(result.success).toBe(false);
    expect(result.reason).toBe('confidence_too_low');
  });

  test('should handle Chinese input', async () => {
    const result = await autoDiscover('帮我部署网站', { dryRun: true });
    
    expect(result).toHaveProperty('success');
    // Should detect high confidence for Chinese deploy request
    if (result.success) {
      expect(result.skill).toBeDefined();
    }
  });

  test('should handle empty input gracefully', async () => {
    // Empty input should throw validation error
    await expect(autoDiscover('', { dryRun: true }))
      .rejects
      .toThrow('参数校验失败');
  });

  test('should handle very long input', async () => {
    const longInput = 'a'.repeat(500);
    const result = await autoDiscover(longInput, { dryRun: true });
    
    // Should not crash
    expect(result).toHaveProperty('success');
  });
});
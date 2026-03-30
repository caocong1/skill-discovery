/**
 * Integration tests for skills-cli
 * 
 * These tests make real calls to npx skills
 */

const { skillsList, skillsFind } = require('../../skills-cli');

describe('skills-cli Integration', () => {
  jest.setTimeout(60000);

  test('should list installed skills', async () => {
    const skills = await skillsList({ global: true });
    
    // Should return an array
    expect(Array.isArray(skills)).toBe(true);
    
    // Each skill should have required fields
    if (skills.length > 0) {
      expect(skills[0]).toHaveProperty('name');
      expect(skills[0]).toHaveProperty('path');
    }
  });

  test('should find skills for "react"', async () => {
    const results = await skillsFind('react');
    
    expect(Array.isArray(results)).toBe(true);
    
    if (results.length > 0) {
      expect(results[0]).toHaveProperty('fullName');
      expect(results[0]).toHaveProperty('owner');
      expect(results[0]).toHaveProperty('installs');
      expect(results[0].fullName).toMatch(/@/);
    }
  });

  test('should find skills for "deploy"', async () => {
    const results = await skillsFind('deploy');
    
    expect(Array.isArray(results)).toBe(true);
  });

  test('should handle empty search results', async () => {
    const results = await skillsFind('xyznonexistent123');
    
    expect(Array.isArray(results)).toBe(true);
    // May be empty or have results depending on fuzzy matching
  });

  test('should handle special characters in search', async () => {
    // Should not crash
    const results = await skillsFind('test@#$%');
    expect(Array.isArray(results)).toBe(true);
  });
});
/**
 * Unit tests for auto-discover.js
 */

const { analyzeNeed, validateSkill, selectBest } = require('../../auto-discover');

describe('analyzeNeed', () => {
  test('should detect explicit trigger "find a skill for"', () => {
    const result = analyzeNeed('find a skill for deploying');
    expect(result.shouldSearch).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(0.9);
  });

  test('should detect Chinese trigger "帮我"', () => {
    const result = analyzeNeed('帮我部署到 Vercel');
    expect(result.shouldSearch).toBe(true);
    expect(result.confidence).toBeGreaterThanOrEqual(0.8);
  });

  test('should detect domain keyword "部署"', () => {
    const result = analyzeNeed('怎么部署网站');
    expect(result.shouldSearch).toBe(true);
    expect(result.domain).toBe('devops');
  });

  test('should detect domain keyword "测试"', () => {
    const result = analyzeNeed('写个测试');
    expect(result.shouldSearch).toBe(true);
    expect(result.domain).toBe('testing');
  });

  test('should not trigger for knowledge questions', () => {
    const result = analyzeNeed('什么是 React');
    expect(result.shouldSearch).toBe(false);
  });

  test('should not trigger for weather queries', () => {
    const result = analyzeNeed('今天天气怎么样');
    expect(result.shouldSearch).toBe(false);
  });

  test('should not trigger for debug questions', () => {
    const result = analyzeNeed('为什么报错');
    expect(result.shouldSearch).toBe(false);
  });

  test('should handle "怎么样才能" without false negative', () => {
    const result = analyzeNeed('怎么样才能部署');
    expect(result.shouldSearch).toBe(true);
  });
});

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
});

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
    // Trusted owner gets bonus, may win despite lower installs
    expect(best.skill.owner).toBe('vercel-labs');
  });
});
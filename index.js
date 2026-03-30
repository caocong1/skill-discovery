#!/usr/bin/env node
/**
 * Skill Discovery V3 - 主入口
 * 
 * 完整功能：
 * - Phase 1: 基础封装（skills-cli.js）
 * - Phase 2: 自动化（auto-discover.js）
 * - Phase 3: 增强（openclaw-hook.js）
 */

const {
  skillsList,
  skillsFind,
  skillsAdd,
  skillsRemove
} = require('./skills-cli');

const {
  analyzeNeed,
  validateSkill,
  autoDiscover
} = require('./auto-discover');

const {
  onUserInput,
  generatePrompt,
  safeRemove,
  cleanTrash
} = require('./openclaw-hook');

// ==================== 主函数 ====================

/**
 * 完整的 Skill Discovery 流程
 */
async function discoverAndInstall(userInput, options = {}) {
  const result = await autoDiscover(userInput, options);
  const prompt = generatePrompt(result);
  
  return {
    ...result,
    display: prompt
  };
}

// ==================== 导出 ====================
module.exports = {
  // Phase 1: CLI 封装
  skillsList,
  skillsFind,
  skillsAdd,
  skillsRemove,
  
  // Phase 2: 自动化
  analyzeNeed,
  validateSkill,
  autoDiscover,
  discoverAndInstall,
  
  // Phase 3: OpenClaw 集成
  onUserInput,
  generatePrompt,
  safeRemove,
  cleanTrash
};

// ==================== 直接运行 ====================
if (require.main === module) {
  const testInputs = [
    '帮我优化 React 性能',
    '怎么部署到 Vercel',
    '写个测试',
    '解析 PDF 文件',
    '今天天气怎么样'  // 应该不触发
  ];
  
  (async () => {
    console.log('=== Skill Discovery V3 测试 ===\n');
    
    for (const input of testInputs) {
      console.log('\n' + '='.repeat(60));
      console.log(`输入: "${input}"`);
      console.log('='.repeat(60));
      
      const result = await discoverAndInstall(input, { dryRun: true });
      
      if (result.display) {
        console.log('\n' + result.display);
      } else {
        console.log('\n[未触发自动发现]');
      }
    }
  })();
}
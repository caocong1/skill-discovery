#!/usr/bin/env node
/**
 * Demo - 演示 Skill Discovery 的基本功能
 *
 * 用法: node examples/demo.js
 */

const { discoverAndInstall } = require('../index');

const testInputs = [
  '帮我优化 React 性能',
  '怎么部署到 Vercel',
  '写个测试',
  '解析 PDF 文件',
  '今天天气怎么样'  // 应该不触发
];

(async () => {
  console.log('=== Skill Discovery Demo ===\n');

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

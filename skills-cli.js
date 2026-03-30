#!/usr/bin/env node
/**
 * Skills CLI Wrapper - npx skills 命令封装
 *
 * 基于官方 npx skills CLI 的可靠封装
 */

const { exec } = require('child_process');
const util = require('util');

const execAsync = util.promisify(exec);

// ==================== 配置 ====================
const CONFIG = {
  maxRetries: 3,
  retryDelay: 1000,  // 初始重试延迟（毫秒）
  timeout: 60000     // 命令超时时间
};

// ==================== 安全工具 ====================

/**
 * 转义 shell 参数，防止命令注入
 * @param {string} input - 用户输入
 * @returns {string} 转义后的安全字符串
 */
function shellEscape(input) {
  if (typeof input !== 'string') return '';
  // 使用单引号包裹并转义单引号（将 ' 替换为 '\''，即先结束单引号，
  // 插入转义单引号，再开始新单引号）
  return `'${input.replace(/'/g, "'\\''")}'`;
}

// ==================== 重试工具 ====================

/**
 * 带重试的执行
 * @param {Function} fn - 异步函数
 * @param {Object} options - 选项
 */
async function withRetry(fn, options = {}) {
  const { maxRetries = CONFIG.maxRetries, retryDelay = CONFIG.retryDelay } = options;

  let lastError;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // 如果是最后一次，不再重试
      if (i === maxRetries - 1) break;

      // 指数退避
      const delay = retryDelay * Math.pow(2, i);
      console.log(`⚠️  第 ${i + 1} 次尝试失败，${delay}ms 后重试...`);
      await sleep(delay);
    }
  }

  throw lastError;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ==================== 核心命令封装 ====================

/**
 * 列出已安装的 skills
 * @param {Object} options - 选项
 * @returns {Promise<Array>} 已安装 skill 列表
 */
async function skillsList(options = {}) {
  const { global = true, agent } = options;

  let cmd = 'npx skills list --json';
  if (global) cmd += ' -g';
  if (agent) cmd += ` -a ${shellEscape(agent)}`;

  return withRetry(async () => {
    const { stdout } = await execAsync(cmd, { timeout: CONFIG.timeout });

    try {
      const results = JSON.parse(stdout);
      return Array.isArray(results) ? results : [];
    } catch (e) {
      // JSON 解析失败时，尝试提取 JSON 片段
      const fallback = extractJson(stdout);
      if (fallback !== null) {
        return Array.isArray(fallback) ? fallback : [];
      }
      throw new Error(`解析 list 输出失败（JSON & 降级均失败）: ${e.message}`);
    }
  });
}

/**
 * 搜索 skills
 * @param {string} query - 搜索关键词
 * @returns {Promise<Array>} 搜索结果
 */
async function skillsFind(query) {
  // 参数校验
  if (typeof query !== 'string' || query.trim().length === 0) {
    return [];
  }

  const cmd = `npx skills find ${shellEscape(query)}`;

  return withRetry(async () => {
    const { stdout } = await execAsync(cmd, { timeout: CONFIG.timeout });
    return parseFindOutput(stdout);
  });
}

/**
 * 去除 ANSI 转义码
 * @param {string} str - 带 ANSI 码的字符串
 * @returns {string} 干净的字符串
 */
function stripAnsi(str) {
  // 匹配 ANSI 转义序列: \x1b[...m
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * 从任意文本中提取 JSON 数组（降级解析）
 * @param {string} text - 原始文本
 * @returns {Array|null} 解析后的数组，或 null
 */
function extractJson(text) {
  // 查找 [ ... ] JSON 数组边界
  const openIdx = text.indexOf('[');
  const closeIdx = text.lastIndexOf(']');
  if (openIdx === -1 || closeIdx === -1 || closeIdx <= openIdx) return null;
  try {
    const jsonStr = text.slice(openIdx, closeIdx + 1);
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

/**
 * 解析 npx skills find 的输出
 * @param {string} output - ANSI 文本输出
 * @returns {Array} 解析后的结果
 */
function parseFindOutput(output) {
  const results = [];
  const lines = output.split('\n').map(stripAnsi);

  // 正则匹配: owner/repo@skill installs
  // 示例: vercel-labs/json-render@react 728 installs
  // 示例: vercel-labs/json-render@react 75.5K installs  <-- 带小数
  // 匹配 \d+(?:\.\d+)?[K]? 表示支持无后缀、纯小数、K 后缀小数
  const skillPattern = /^(.+?)\/(.+?)@(.+?)\s+([\d.]+[K]?)\s+installs/i;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const match = line.match(skillPattern);

    if (match) {
      const [_, owner, repo, skill, installsStr] = match;

      // 解析安装数（处理 K 后缀，支持小数）
      let installs = parseFloat(installsStr.replace('K', ''));
      if (installsStr.includes('K')) {
        installs *= 1000;
      }

      // 下一行通常是 URL
      const urlLine = lines[i + 1] || '';
      const urlMatch = stripAnsi(urlLine).match(/https:\/\/skills\.sh\/.+/);

      results.push({
        fullName: `${owner}/${repo}@${skill}`,
        owner,
        repo,
        skill,
        installs: Math.floor(installs),
        url: urlMatch ? urlMatch[0].trim().replace(/[^\x00-\x7F]/g, '') : null,
        source: 'skills.sh'
      });
    }
  }

  return results;
}

/**
 * 安装 skill
 * @param {string} skillRef - skill 引用 (owner/repo@skill)
 * @param {Object} options - 选项
 * @returns {Promise<Object>} 安装结果
 */
async function skillsAdd(skillRef, options = {}) {
  // 参数校验
  if (typeof skillRef !== 'string' || skillRef.trim().length === 0) {
    throw new Error('skillRef 参数无效：必须是非空字符串');
  }

  const { global = true, yes = true } = options;

  let cmd = `npx skills add ${shellEscape(skillRef)}`;
  if (global) cmd += ' -g';
  if (yes) cmd += ' -y';

  return withRetry(async () => {
    const { stdout, stderr } = await execAsync(cmd, {
      timeout: CONFIG.timeout * 2  // 安装可能较慢
    });

    return {
      success: true,
      skillRef,
      output: stdout,
      warnings: stderr || null
    };
  });
}

/**
 * 移除 skill
 * @param {string} skillRef - skill 引用
 * @param {Object} options - 选项
 */
async function skillsRemove(skillRef, options = {}) {
  const { global = true, yes = true } = options;

  let cmd = `npx skills remove ${shellEscape(skillRef)}`;
  if (global) cmd += ' -g';
  if (yes) cmd += ' -y';

  return withRetry(async () => {
    const { stdout } = await execAsync(cmd, { timeout: CONFIG.timeout });
    return { success: true, skillRef, output: stdout };
  });
}

/**
 * 检查更新
 */
async function skillsCheck() {
  const cmd = 'npx skills check';

  return withRetry(async () => {
    const { stdout } = await execAsync(cmd, { timeout: CONFIG.timeout });
    return { output: stdout };
  });
}

/**
 * 更新所有 skills
 */
async function skillsUpdate() {
  const cmd = 'npx skills update';

  return withRetry(async () => {
    const { stdout } = await execAsync(cmd, { timeout: CONFIG.timeout * 2 });
    return { output: stdout };
  });
}

// ==================== 导出 ====================
module.exports = {
  skillsList,
  skillsFind,
  skillsAdd,
  skillsRemove,
  skillsCheck,
  skillsUpdate,
  parseFindOutput,
  extractJson,
  shellEscape,
  withRetry,
  CONFIG,
  stripAnsi
};

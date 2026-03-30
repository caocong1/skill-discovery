#!/usr/bin/env node
/**
 * Auto Discover - 自动发现与安装
 * 
 * Phase 2: 自动化（A+B）
 * A. 自动发现需求
 * B. 自动执行流程
 */

const { skillsList, skillsFind, skillsAdd } = require('./skills-cli');

// ==================== 常量（消除魔法数字）====================
const MAGIC = {
  CONFIDENCE_THRESHOLD: 0.6,
  MIN_INSTALLS: 1000,
  CACHE_TTL_MS: 10 * 60 * 1000,       // 10 分钟
  CACHE_MAX_SIZE: 100,                 // 搜索缓存上限
  QUERY_MAX_LENGTH: 50,                // 查询最大长度
  WEIGHT_EXPLICIT: 1.0,
  WEIGHT_HIGH: 0.9,
  WEIGHT_MEDIUM_HIGH: 0.85,
  WEIGHT_MEDIUM: 0.8,
  WEIGHT_DOMAIN: 0.7,
  NEGATIVE_MULTIPLIER: 0.5,
  DOMAIN_MIN_CONFIDENCE: 0.8,
  INSTALLS_SCORE_FACTOR: 10,
  INSTALLS_SCORE_MAX: 40,
  TRUSTED_SCORE: 30,
  UNTRUSTED_SCORE: 10,
  HIGH_RISK_MULTIPLIER: 0.3,
  MEDIUM_RISK_MULTIPLIER: 0.7,
  MIN_INSTALLS_SCALE: 10000,
  // 日志统一 Schema
  LOG_VERSION: '1.0',
  // 重试相关
  MAX_RETRIES: 3,
  RETRY_DELAY_MS: 1000,
  // cleanTrash 相关
  TRASH_CLEAN_DAYS: 7,
  TRASH_CLEAN_INTERVAL_MS: 60 * 60 * 1000,  // 1 小时
  // 脱敏相关
  SANITIZE_MAX_DEPTH: 10,
  // 缓存清理阈值
  CACHE_CLEANUP_THRESHOLD: 100
};

// ==================== 预编译正则（避免重复编译）====================
const RE = {
  // 明确触发词（英文）
  explicitTriggers: [
    { re: /find a skill for/i, weight: MAGIC.WEIGHT_EXPLICIT },
    { re: /is there a skill (for|that|to)/i, weight: MAGIC.WEIGHT_EXPLICIT },
    { re: /how do i (do|make|create|build)/i, weight: MAGIC.WEIGHT_HIGH },
    { re: /can you (help me with|do)/i, weight: MAGIC.WEIGHT_MEDIUM },
    { re: /i need (a skill|help with)/i, weight: MAGIC.WEIGHT_HIGH },
    { re: /can i use/i, weight: MAGIC.WEIGHT_MEDIUM },
    { re: /help me (with|to|build|create|make|do)/i, weight: MAGIC.WEIGHT_MEDIUM },
    { re: /looking for/i, weight: MAGIC.WEIGHT_HIGH },
    { re: /\bi want (to|a|an)/i, weight: MAGIC.WEIGHT_MEDIUM },
    // 英文推荐句式
    { re: /recommend.*(tool|library|package|skill|plugin)/i, weight: MAGIC.WEIGHT_HIGH },
    { re: /any.*(tool|library|package|skill|plugin).*(for|that)/i, weight: MAGIC.WEIGHT_HIGH },
    { re: /what('s| is).*tool/i, weight: MAGIC.WEIGHT_MEDIUM },
    // 中文明确触发词（优先级1）
    { re: /找.*?(skill|技能|工具)/i, weight: MAGIC.WEIGHT_EXPLICIT },
    { re: /有没有.*?(skill|技能|工具)/i, weight: MAGIC.WEIGHT_EXPLICIT },
    { re: /安装.*?(skill|技能)/i, weight: MAGIC.WEIGHT_EXPLICIT },
    // 中文触发词（优先级0.8-0.9）
    { re: /有什么工具/i, weight: MAGIC.WEIGHT_HIGH },
    { re: /有什么工具可以/i, weight: MAGIC.WEIGHT_HIGH },
    { re: /推荐一个/i, weight: MAGIC.WEIGHT_HIGH },
    { re: /能不能/i, weight: MAGIC.WEIGHT_MEDIUM },
    { re: /想要/i, weight: MAGIC.WEIGHT_MEDIUM },
    { re: /求推荐/i, weight: MAGIC.WEIGHT_HIGH },
    { re: /能帮我/i, weight: MAGIC.WEIGHT_MEDIUM },
    { re: /帮我推荐/i, weight: MAGIC.WEIGHT_HIGH },
    { re: /帮我找个/i, weight: MAGIC.WEIGHT_HIGH },
    // 中文句式（优先级0.9）
    { re: /怎么.*?(做|实现|创建|部署|写)/i, weight: MAGIC.WEIGHT_HIGH },
    { re: /如何.*?(做|实现|创建|部署|写)/i, weight: MAGIC.WEIGHT_HIGH },
    // 中文句式（优先级0.8）
    { re: /能.*?(帮我|给我).*?(做|写|优化|部署)/i, weight: MAGIC.WEIGHT_MEDIUM },
    { re: /需要.*?(skill|技能|工具)/i, weight: MAGIC.WEIGHT_HIGH },
    { re: /帮我.*?(做|写|优化|部署|处理)/i, weight: MAGIC.WEIGHT_MEDIUM_HIGH },
    // "怎么样才能" 是需求导向，正面触发
    { re: /怎么样才能/i, weight: MAGIC.WEIGHT_HIGH }
  ],

  // 领域关键词（英文）
  domainKeywordsEn: [
    { re: /deploy|deployment|ci[\/\\-]cd|docker|kubernetes|k8s/i, domain: 'devops' },
    { re: /test|testing|jest|playwright|cypress|vitest/i, domain: 'testing' },
    { re: /design|ui|ux|css|tailwind|component/i, domain: 'design' },
    { re: /doc|documentation|readme|changelog/i, domain: 'docs' },
    { re: /review|lint|refactor|best practice/i, domain: 'code-quality' },
    { re: /pdf|excel|csv|json.*process/i, domain: 'data-processing' },
    { re: /image|photo|compress|resize|ocr/i, domain: 'image-processing' },
    { re: /video|ffmpeg|convert/i, domain: 'video-processing' },
    { re: /performance|optimize|speed|fast/i, domain: 'performance' },
    // 英文领域关键词（网络/API、数据库、AI/ML、安全、移动端、游戏）
    { re: /api|rest|graphql|endpoint|http/i, domain: 'network-api' },
    { re: /database|db|sql|mongodb|postgresql|mysql|redis/i, domain: 'database' },
    { re: /ai|ml|machine learning|nlp|gpt|llm|chatgpt|openai|deep learning|tensorflow|pytorch/i, domain: 'ai-ml' },
    { re: /security|secure|crypto|encrypt|auth|authentication|authorization/i, domain: 'security' },
    { re: /mobile|ios|android|react native|flutter|swift|kotlin/i, domain: 'mobile' },
    { re: /game|unity|unreal|godot|game dev|2d|3d/i, domain: 'gaming' }
  ],

  // 领域关键词（中文）
  domainKeywordsZh: [
    { re: /部署|发布|上线/i, domain: 'devops' },
    { re: /测试|单元测试|e2e|自动化测试/i, domain: 'testing' },
    { re: /设计|样式|组件|界面/i, domain: 'design' },
    { re: /文档|说明/i, domain: 'docs' },
    { re: /审查|检查|重构|最佳实践|代码质量/i, domain: 'code-quality' },
    { re: /pdf|excel|csv|数据处理|解析|转换/i, domain: 'data-processing' },
    { re: /图片|图像|压缩|裁剪|ocr|识别/i, domain: 'image-processing' },
    { re: /视频|剪辑|转码|压缩/i, domain: 'video-processing' },
    { re: /性能|优化|加速|提升/i, domain: 'performance' },
    // 中文领域关键词（网络/API、数据库、AI/ML、安全、移动端、游戏）
    { re: /api|接口|rest|graphql|网络请求|http/i, domain: 'network-api' },
    { re: /数据库|db|sql|mongodb|postgresql|mysql|redis/i, domain: 'database' },
    { re: /人工智能|ai|机器学习|nlp|gpt|llm|chatgpt|深度学习|tensorflow|pytorch/i, domain: 'ai-ml' },
    { re: /安全|加密|解密|认证|授权|权限/i, domain: 'security' },
    { re: /移动端|ios|android|react native|flutter|swift|kotlin|手机端/i, domain: 'mobile' },
    { re: /游戏|unity|unreal|godot|游戏开发|2d|3d/i, domain: 'gaming' }
  ],

  // 负面模式（英文）
  negativePatternsEn: [
    /^(what is|what's|how to|explain|describe)/i,
    /^(why|when|who|where)/i,
    /how (much|many|long)/i,
    /tell me (about|what)/i,
    /^(just|only) (a|one)/i,
    /^(i|i'm|i am) (just|only) (a|one)/i,
    /can i ask/i
  ],

  // 负面模式（中文 - 精确匹配避免误杀"怎么样才能"）
  negativePatternsZh: [
    /^什么/i,
    /^为什么/i,
    /^什么时候/i,
    /^谁/i,
    /^哪里/i,
    /^(是|有).*吗$/i,                   // "是xxx吗？"纯询问
    /天气|时间|日期|新闻/i,             // 纯信息查询
    /错误|bug|修复|问题|报错/i,          // 调试问题
    /(?:^|有)什么(?:问题|bug|错|报错)/i, // "有什么问题"纯询问
    /(?:咋样|怎么样)$/i                 // 精确匹配 "怎么样" 或 "咋样" 结尾（避免误杀"怎么样才能..."）
  ]
};

// ==================== 配置 ====================
const CONFIG = {
  confidenceThreshold: MAGIC.CONFIDENCE_THRESHOLD,
  minInstalls: MAGIC.MIN_INSTALLS,
  trustedOwners: [
    'vercel-labs',
    'anthropics',
    'google-labs-code',
    'microsoft',
    'openai'
  ],
  cache: {
    findResults: new Map(),
    ttl: MAGIC.CACHE_TTL_MS,
    maxSize: MAGIC.CACHE_MAX_SIZE
  }
};

// ==================== A. 自动发现需求 ====================

/**
 * 分析用户输入，判断是否需要搜索 skill
 * 基于官方 find-skills 的触发条件
 * 
 * 修复：负面模式采用行首锚定（^）避免误杀
 * "怎么样才能..."中的"怎么样"不是行首，不会被^什么匹配
 */
function analyzeNeed(userInput) {
  const input = userInput.toLowerCase().trim();

  let confidence = 0;
  let matchedDomain = null;
  let query = input;

  // ---- 1. 检查明确触发词 ----
  for (const trigger of RE.explicitTriggers) {
    if (trigger.re.test(input)) {
      confidence = Math.max(confidence, trigger.weight);
      query = input.replace(trigger.re, '').trim();
    }
  }

  // ---- 2. 检查领域关键词（英文） ----
  for (const kw of RE.domainKeywordsEn) {
    if (kw.re.test(input)) {
      confidence = Math.max(confidence, MAGIC.WEIGHT_DOMAIN);
      matchedDomain = kw.domain;
    }
  }

  // ---- 3. 检查领域关键词（中文） ----
  for (const kw of RE.domainKeywordsZh) {
    if (kw.re.test(input)) {
      confidence = Math.max(confidence, MAGIC.WEIGHT_DOMAIN);
      matchedDomain = kw.domain;
    }
  }

  // 领域关键词触发时使用完整输入作为搜索词
  if (matchedDomain && confidence < MAGIC.DOMAIN_MIN_CONFIDENCE) {
    query = input;
  }

  // ---- 4. 检查负面模式（英文，行首锚定避免误杀）----
  for (const neg of RE.negativePatternsEn) {
    if (neg.test(input)) {
      confidence *= MAGIC.NEGATIVE_MULTIPLIER;
    }
  }

  // ---- 5. 检查负面模式（中文，行首锚定避免误杀）----
  for (const neg of RE.negativePatternsZh) {
    if (neg.test(input)) {
      confidence *= MAGIC.NEGATIVE_MULTIPLIER;
    }
  }

  return {
    shouldSearch: confidence >= CONFIG.confidenceThreshold,
    confidence,
    query: query.substring(0, MAGIC.QUERY_MAX_LENGTH),
    domain: matchedDomain
  };
}

// ==================== B. 自动执行流程 ====================

/**
 * 验证 skill 质量（按官方标准）
 */
function validateSkill(skill) {
  const reasons = [];
  let riskLevel = 'low';
  
  // 1. 安装量检查
  if (skill.installs < CONFIG.minInstalls) {
    reasons.push(`安装量过低 (${skill.installs} < ${CONFIG.minInstalls})`);
    riskLevel = 'high';
  } else {
    reasons.push(`✓ 安装量充足 (${skill.installs.toLocaleString()})`);
  }
  
  // 2. 来源可信度
  const isTrusted = CONFIG.trustedOwners.includes(skill.owner);
  if (isTrusted) {
    reasons.push(`✓ 官方来源 (${skill.owner})`);
  } else {
    reasons.push(`⚠ 非官方来源 (${skill.owner})`);
    if (riskLevel === 'low') riskLevel = 'medium';
  }
  
  // 3. 格式检查
  if (!skill.fullName.includes('@')) {
    reasons.push('✗ 格式异常');
    riskLevel = 'high';
  }
  
  return {
    passed: riskLevel !== 'high' && skill.installs >= CONFIG.minInstalls,
    riskLevel,
    reasons,
    isTrusted
  };
}

/**
 * 选择最佳 skill
 */
function selectBest(skills) {
  // 评分算法
  const scored = skills.map(skill => {
    const validation = validateSkill(skill);
    let score = 0;

    // 安装量分数 (0-40)
    score += Math.min(skill.installs / MAGIC.MIN_INSTALLS_SCALE, 4) * MAGIC.INSTALLS_SCORE_FACTOR;

    // 可信度分数
    score += validation.isTrusted ? MAGIC.TRUSTED_SCORE : MAGIC.UNTRUSTED_SCORE;

    // 风险调整
    if (validation.riskLevel === 'high') score *= MAGIC.HIGH_RISK_MULTIPLIER;
    else if (validation.riskLevel === 'medium') score *= MAGIC.MEDIUM_RISK_MULTIPLIER;

    return { skill, score, validation };
  });

  // 排序并返回最佳
  scored.sort((a, b) => b.score - a.score);
  return scored[0];
}

/**
 * 参数校验
 */
function validateParams(userInput, options) {
  const errors = [];

  // 校验 userInput 类型和长度
  if (typeof userInput !== 'string') {
    errors.push('userInput 必须是字符串');
  } else if (userInput.trim().length === 0) {
    errors.push('userInput 不能为空');
  } else if (userInput.length > 500) {
    errors.push('userInput 不能超过 500 字符');
  }

  // 校验 options 为 object 或 undefined
  if (options !== undefined && typeof options !== 'object') {
    errors.push('options 必须是对象');
  } else if (options && typeof options === 'object') {
    if ('dryRun' in options && typeof options.dryRun !== 'boolean') {
      errors.push('options.dryRun 必须是布尔值');
    }
  }

  return errors;
}

/**
 * 带缓存 + 容量上限的搜索
 * 缓存超过 maxSize 时清除最旧的条目
 */
async function skillsFindCached(query) {
  // 参数校验
  if (typeof query !== 'string' || query.trim().length === 0) {
    throw new Error('query 参数无效：必须是非空字符串');
  }

  const cacheKey = query.toLowerCase().trim();
  const cached = CONFIG.cache.findResults.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CONFIG.cache.ttl) {
    console.log(`📋 使用缓存: "${query}"`);
    return cached.results;
  }

  const results = await skillsFind(query);

  // 缓存超过上限时清除最旧的条目（淘汰最久未使用的）
  if (CONFIG.cache.findResults.size >= CONFIG.cache.maxSize) {
    let oldestKey = null;
    let oldestTime = Infinity;
    for (const [key, val] of CONFIG.cache.findResults) {
      if (val.timestamp < oldestTime) {
        oldestTime = val.timestamp;
        oldestKey = key;
      }
    }
    if (oldestKey) {
      CONFIG.cache.findResults.delete(oldestKey);
      console.log(`🗑️  缓存已满，淘汰最旧条目: "${oldestKey}"`);
    }
  }

  CONFIG.cache.findResults.set(cacheKey, {
    results,
    timestamp: Date.now()
  });

  return results;
}

// ==================== 日志统一 Schema ====================
const LOG_SCHEMA = {
  VERSION: '1.0',
  ACTIONS: ['discover', 'install', 'remove', 'error', 'cache_hit', 'cache_miss'],
  REQUIRED_FIELDS: ['timestamp', 'action', 'input']
};

/**
 * 统一日志格式（供外部 logDiscovery 调用）
 * @param {string} action - 操作类型（必须是 LOG_SCHEMA.ACTIONS 之一）
 * @param {Object} data - 日志数据
 * @returns {Object} 符合 Schema 的日志对象
 */
function buildLogEntry(action, data) {
  if (!LOG_SCHEMA.ACTIONS.includes(action)) {
    action = 'error';
  }
  return {
    schema: LOG_SCHEMA.VERSION,
    timestamp: new Date().toISOString(),
    action,
    ...data
  };
}

// ==================== 脱敏工具（供 openclaw-hook 使用）====================

/** 敏感字段白名单（脱敏时这些字段值不显示）*/
const SANITIZE_SAFE_FIELDS = [
  'skillRef', 'skill', 'fullName', 'owner', 'repo',
  'installs', 'confidence', 'query', 'domain',
  'riskLevel', 'reasons', 'success', 'result'
];

/** 匹配敏感值的正则模式 */
const SANITIZE_VALUE_PATTERNS = [
  /\btoken\b/i, /\bsecret\b/i, /\bpassword\b/i, /\bauth\b/i,
  /\bapi[_-]?key\b/i, /\bbearer\b/i, /\bcredential\b/i,
  /\bBearer\s+[\w.-]+/i, /\bsk-[\w.-]+/i, /ghp_[\w]+/i,
  /===+.*===+/i  // OAUTH 授权页特征
];

/**
 * 递归脱敏对象中的敏感信息（用于日志记录）
 * @param {*} obj - 任意对象
 * @param {number} depth - 递归深度，防止循环引用
 * @returns {*} 脱敏后的对象
 */
function sanitize(obj, depth = 0) {
  if (depth > MAGIC.SANITIZE_MAX_DEPTH) return '[MAX_DEPTH]';
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== 'object') {
    if (typeof obj === 'string') {
      for (const p of SANITIZE_VALUE_PATTERNS) {
        if (p.test(obj)) return '***';
      }
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(item => sanitize(item, depth + 1));
  }

  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    // 检查字段名是否在白名单
    let isSensitiveField = SANITIZE_SAFE_FIELDS.includes(key);
    // 检查字段名是否匹配敏感模式
    if (!isSensitiveField) {
      for (const p of SANITIZE_VALUE_PATTERNS) {
        if (p.test(key)) { isSensitiveField = true; break; }
      }
    }

    if (isSensitiveField) {
      result[key] = '***';
    } else {
      result[key] = sanitize(value, depth + 1);
    }
  }
  return result;
}

// ==================== 主流程 ====================

/**
 * 主流程：自动发现与安装
 */
async function autoDiscover(userInput, options = {}) {
  // 参数校验
  const validationErrors = validateParams(userInput, options);
  if (validationErrors.length > 0) {
    throw new Error(`参数校验失败: ${validationErrors.join('; ')}`);
  }

  const { dryRun = false } = options;
  
  console.log(`🔍 分析: "${userInput.substring(0, 50)}..."`);
  
  // 1. 分析需求
  const need = analyzeNeed(userInput);
  console.log(`📊 置信度: ${Math.round(need.confidence * 100)}%`);
  
  if (!need.shouldSearch) {
    return {
      success: false,
      reason: 'confidence_too_low',
      confidence: need.confidence,
      message: '置信度不足，跳过自动发现'
    };
  }
  
  console.log(`💡 搜索: "${need.query}"`);
  
  // 2. 搜索（带缓存）
  let results;
  try {
    results = await skillsFindCached(need.query);
  } catch (error) {
    return {
      success: false,
      reason: 'search_failed',
      error: error.message,
      message: '搜索失败，请稍后重试'
    };
  }
  
  console.log(`📋 找到 ${results.length} 个结果`);
  
  if (results.length === 0) {
    return {
      success: false,
      reason: 'no_results',
      message: '未找到相关 skill'
    };
  }
  
  // 3. 验证质量
  const validResults = results.filter(s => validateSkill(s).passed);
  console.log(`✅ 通过验证: ${validResults.length} 个`);
  
  if (validResults.length === 0) {
    return {
      success: false,
      reason: 'no_valid_results',
      candidates: results.slice(0, 3),
      message: '未找到符合质量标准的 skill'
    };
  }
  
  // 4. 选择最佳
  const best = selectBest(validResults);
  console.log(`⭐ 最佳: ${best.skill.fullName} (评分: ${Math.round(best.score)})`);
  
  // 5. 检查是否已安装
  try {
    const installed = await skillsList({ global: true });
    const isInstalled = installed.some(s => 
      s.name === best.skill.skill || 
      s.name === best.skill.fullName.replace(/[@/]/g, '-')
    );
    
    if (isInstalled) {
      return {
        success: true,
        alreadyInstalled: true,
        skill: best.skill,
        message: `✅ ${best.skill.fullName} 已安装`
      };
    }
  } catch (e) {
    // 忽略检查错误，继续安装
  }
  
  // 6. 安装（或模拟）
  if (dryRun) {
    return {
      success: true,
      dryRun: true,
      skill: best.skill,
      validation: best.validation,
      message: `[模拟] 将安装 ${best.skill.fullName}`
    };
  }
  
  console.log(`📦 安装: ${best.skill.fullName}`);
  try {
    const installResult = await skillsAdd(best.skill.fullName, {
      global: true,
      yes: true
    });
    
    return {
      success: true,
      installed: true,
      skill: best.skill,
      validation: best.validation,
      result: installResult,
      message: `✅ 已自动安装 ${best.skill.fullName}`
    };
  } catch (error) {
    return {
      success: false,
      reason: 'install_failed',
      skill: best.skill,
      error: error.message,
      fallback: `手动安装: npx skills add ${best.skill.fullName}`,
      message: `安装失败: ${error.message}`
    };
  }
}

// ==================== 导出 ====================
module.exports = {
  analyzeNeed,
  validateSkill,
  validateParams,
  selectBest,
  skillsFindCached,
  autoDiscover,
  buildLogEntry,
  LOG_SCHEMA,
  sanitize,
  CONFIG,
  MAGIC
};
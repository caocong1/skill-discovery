---
name: skill-discovery
description: 基于用户意图自动发现并安装 skill。分析用户输入，搜索匹配 skill，验证质量后自动安装最佳匹配。
---

# Skill Discovery

根据用户意图自动发现并安装匹配的 skill。

## 何时使用

适用场景：

- 用户请求帮助完成某个任务，且可能已有现成的 skill 方案
- 用户表达了扩展能力的需求（如"怎么部署"、"帮我写测试"）
- 用户提到了特定领域的工具需求（设计、测试、部署等）
- 用户明确询问"有没有 skill 可以..."、"找个工具帮我..."

## 工作流程

1. **分析用户输入** — 理解意图，识别目标领域
2. **搜索 skills.sh** — 通过 `npx skills find` 查找匹配 skill
3. **质量验证** — 检查安装量（>= 1000）和来源可信度
4. **自动安装** — 安装最佳匹配（或返回模拟结果）

## 输入/输出

**输入**: 用户自然语言文本（中文或英文）

**输出**（统一结构）:
```javascript
{
  success: boolean,
  stage: 'analyze' | 'search' | 'select' | 'install',
  outcome: 'installed' | 'already_installed' | 'dry_run' | 'skipped' | 'failed',
  errorCode: string | null,   // 如 'NO_RESULTS'、'INSTALL_FAILED'
  skill: object | null,
  candidates: array,
  message: string
}
```

## 触发示例

**中文:**
- "帮我部署到 Vercel"
- "有什么工具可以优化性能"
- "怎么写测试"
- "推荐一个数据处理工具"

**英文:**
- "find a skill for deploying"
- "help me with testing"
- "is there a skill for PDF parsing"
- "I need a tool for React optimization"

## 安全特性

- **Shell 转义**: 所有 CLI 参数转义防止命令注入
- **日志脱敏**: 敏感数据（token、密钥）在日志中自动遮蔽
- **卸载备份**: 卸载的 skill 备份到 `.trash/`，保留 7 天
- **来源验证**: 校验 skill 来源是否在可信 owner 列表中

## 支持语言

- 中文：触发词 + 领域关键词（含负面模式排除避免误触发）
- 英文：触发词 + 领域关键词

## 覆盖领域

DevOps、测试、设计、文档、代码质量、数据处理、图片处理、视频处理、性能优化、API/网络、数据库、AI/ML、安全、移动端、游戏

## 依赖

- Node.js >= 18
- `npx skills` CLI（来自 skills.sh）

## 许可证

MIT-0

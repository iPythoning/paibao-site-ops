# paibao-site-ops — 智能体一句话从 0 建站、配置、运营

> **开源核心**：让任何 AI agent 一句话从 0 建一个 EmDash 独立站并全周期运营。
> **商业化**：Cloud 托管版（AI 运营官控制面）+ FDE 深度定制服务 → 见文末。

## 为什么做

外贸 B2B 独立站（GEO/AI 搜索获客）建站 SOP 已成熟（`client-site-starter` 7 phases），但**靠人跑**。
本仓把 SOP 固化成 **agent 编排层**：一句话 `paibao-site-ops create --domain X --brand Y` 从 0 建站、配置、部署，之后 MCP 接管运营。

## 架构

```
一句话 (agent/人)
    │  paibao-site-ops CLI (bin/paibao-site-ops.mjs)
    ▼
┌─────────────┬──────────────────┬──────────────────────┐
│ 建站 (Phase1-3)│ 配置 (Phase1-2)  │ 运营 (Phase 7)       │
│ site-       │ client.config/   │ EmDash MCP server    │
│ lifecycle   │ seed/i18n/brand/ │ content/media/schema/│
│ create→      │ theme/SEO/llms   │ menus/settings/…     │
│ deploy      │ (=SOP checklist) │ 8 域 tools           │
└─────────────┴──────────────────┴──────────────────────┘
   dry-run 默认 / --apply 才写     人后台同表可改(非黑盒)
```

## 快速开始

```bash
# dry-run
paibao-site-ops create --domain example.com --brand "Acme Trading"

# 真建（需 CF token 预建 D1/KV/R2；或 --adapter docker）
export CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=...
paibao-site-ops create --domain example.com --brand "Acme Trading" --apply

# 部署 + 审计 + 交接
paibao-site-ops deploy --site client-sites/<slug> --apply
paibao-site-ops audit --site client-sites/<slug>
paibao-site-ops handover --site client-sites/<slug>
```

## 前置

- Node ≥ 20 + wrangler（CF 部署时）
- `client-site-starter` clone 到 `02-emdash-client-sites/client-sites/_factory/`（engine）
- EmDash 0.29+（建站产物自带 MCP）

## 目录

```
bin/paibao-site-ops.mjs   CLI（create/deploy/audit/operate/handover）
skills/paibao-site-ops/   Agent SKILL（agent 读即会全套 SOP）
docs/                     （本文件等）
```

## License

MIT（编排器 + 建站 SOP 开源）。EmDash 本身 MIT。

## 商业化（开源引流）

| 版 | 免费/付费 | 内容 | 联系 |
|---|---|---|---|
| **开源核心** | 免费 MIT | 一句话建站 + MCP 运营 | GitHub |
| **Cloud 版** | 付费订阅 | 托管 + 自动备份 + AI 运营官控制面（marketplace.paibao.ai）| paibaowork.com |
| **FDE 深度服务** | 付费 | 全栈代运营/深度定制（schema/主题/集成/专属 SOP）| paibaowork.com |

> MCP 深度定制、专属建站 SOP、AI 运营官增强 → **联系 paibaowork.com**（或 FDE 服务）。

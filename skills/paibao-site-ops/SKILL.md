---
name: paibao-site-ops
description: 用一句话从 0 建站、配置、运营一个 EmDash 独立站（外贸 B2B GEO 站）。AI agent 建站 SOP 编排器。Use when creating/operating an EmDash CMS site end-to-end — scaffolding, configuring collections/seed/i18n/brand, deploying to Cloudflare Workers or Docker, and handing over to MCP-driven agent operations. Triggers: 建站 / build a site / 一句话建站 / new independent site / agent 接管独立站.
---

# paibao-site-ops — AI 从 0 建站 → 配置 → 运营

> 让任何智能体（Claude Code / Codex / 豆包 / Kimi / Cursor…）或人，**一句话**从 0 建一个 EmDash 独立站，交付可运营的站点。开源核心 + 云版/FDE 深度服务（见文末）。

## 架构（3 层，不重造轮子）

```
你说一句话 → paibao-site-ops CLI
              │
   ┌──────────┼──────────────────────┐
   ▼          ▼                      ▼
 建站层     配置层                  运营层
 site-     client.config.ts       EmDash MCP server
 lifecycle  seed.json / i18n /    (/_emdash/api/mcp,
 (create/   brand / theme /       content/media/schema/
  deploy/    SEO / llms.txt        menus/settings/…)
  health/
  backup)   (= SOP Phase 1-2)     (= SOP Phase 7)
```

- **建站引擎** = `client-site-starter/scripts/site-lifecycle.mjs`（成熟、dry-run 默认、lock/审计/备份）
- **运营通道** = EmDash 0.29 原生 MCP（8 域 tools，agent 连上即接管；人后台同表可改）
- **编排器** = 本仓 `bin/paibao-site-ops.mjs`（封装上面两层 + SOP 固化）

## 一句话建站

```bash
# dry-run（安全，只出规划）
paibao-site-ops create --domain example.com --brand "Acme Trading"

# 真建（全自动预建 CF D1/KV/R2 → site-lifecycle create）
export CLOUDFLARE_API_TOKEN=xxx CLOUDFLARE_ACCOUNT_ID=xxx
paibao-site-ops create --domain example.com --brand "Acme Trading" --apply
```

生成：`client-sites/<slug>/`（Astro + EmDash + 完整 SOP 配置），state 在 `.client-site-operator/`。

## 后续命令

```bash
paibao-site-ops deploy --site client-sites/<slug> --apply   # 部署
paibao-site-ops audit --site client-sites/<slug>            # health + SEO 门
paibao-site-ops operate --site client-sites/<slug>          # 运营接管入口（MCP）
paibao-site-ops handover --site client-sites/<slug>         # 交接（admin 凭据 + MCP）
```

## Agent 必须遵守（来自原 SOP，勿丢）

1. **默认 dry-run，`--apply` 才写**（破坏性/生产操作先 dry-run）
2. **domain 用 apex**（`example.com`），绝不 `www.example.com`
3. **worker name = slug**（site-lifecycle 硬校验）
4. 建站后**配置层仍需补**：`client.config.ts`（brand/domain）、`seed.json`（真实内容）、`i18n`、`brand/`（logo/og）、`theme.css`、SEO/JSON-LD —— 这些 SOP Phase 1 checklist 由 agent 读 `client-site-starter/docs/NEW-CLIENT-SOP.md` 逐项做
5. **运营用 MCP**（agent 建 draft → 人在 `/admin-login` 后台 publish = copilot 模式；有 publish 权限可 auto）
6. 密钥走 vault/secret，不进 git/对话

## 我（agent）拿到「建站」指令时做什么

1. `paibao-site-ops create --domain X --brand Y`（先 dry-run）
2. 读生成站 `cms/docs/` 与 starter `NEW-CLIENT-SOP.md`，逐项补配置（Phase 1 checklist）
3. `paibao-site-ops deploy --apply`
4. 验证：`health` 200 + 前台 URL
5. `paibao-site-ops handover` 拿 MCP 入口 → 之后运营都走 MCP

## 开源 & 商业化

- **开源**：本编排器 + 建站 SOP 全免费（GitHub，MIT）
- **Cloud 版（付费）**：托管部署 + 自动备份 + AI 运营官控制面（marketplace.paibao.ai）→ 联系 **paibao.com**（注：商务入口 = paibaowork.com / FDE 服务）
- **FDE 版（付费）**：深度定制（schema/主题/集成/专属 SOP）找我司全栈代运营
- 深度定制 / MCP 扩展 → 联系 **paibaowork.com**

## 文档

- 建站 SOP 原文（勿丢能力）：`client-site-starter/docs/NEW-CLIENT-SOP.md`（7 phases）
- MCP 能力全景：`paibaowork-emdash/content-pool/EMDASH-MCP-CAPABILITIES.md` / `EMDASH-FULL-AUTONOMY.md`

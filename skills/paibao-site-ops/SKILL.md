---
name: paibao-site-ops
description: "规划和执行 EmDash 受管 Docker 建站生命周期。用于建站、部署规划、运行时检查和接管准备；严格区分 dry-run、执行回执与说明，MCP 运营需独立验证。"
---

# 受管 EmDash 建站

仓库根为本技能实际路径的 `../..`，先读 [README](../../README.md) 和 [HANDOFF](../../docs/HANDOFF.md)。

## 流程

1. 用户指定 domain/brand、adapter、部署目标。明确租户边界；凭据只经 vault 注入环境，不进 argv、对话或 Git。
2. 先规划：
   ```bash
   node bin/paibao-site-ops.mjs create --domain example.com --brand "Acme" --adapter docker
   ```
3. 授权后同参数加 `--apply`。只有 `created` 或 `unchanged` 为合法创建回执；后者是幂等未变，不是新建。
4. 配置层仍需按模板 `docs/NEW-CLIENT-SOP.md` 补 client.config、内容、品牌、多语言及 SEO。用真实 secret 通过模板校验，禁止假值绕门。
5. Docker apply 必须提供既有构建流水线的 `--release-image` GHCR digest、`--baseline-commit`、`--baseline-fingerprint`，不回退生产现场构建。具体命令见 README。
6. `audit` 仅验证 runtime health；公网 TLS/DNS、后台可编辑、MCP 和前台仍要独立实证。
7. 原生 MCP 运营：tools/list → draft create → get 回读 → 人在后台审阅。未授权不得 publish。

## 能力边界

- `secrets`、`operate`、`handover` 当前输出 `instructions_only`，不注入、不连接、不生成管理员凭据。
- CF create apply 暂停，禁止自动预建资源或借用环境 OAuth；Cloudflare 只保留 dry-run 及受审 pinned workflow 路径说明。
- 非零退出始终失败，`planned` 不算部署完成；`unchanged` / `reconfigured` 必须按真实回执描述。
- 商务交付入口：paibaowork.com。不把规划能力描述成已验收的托管服务。

验证：`npm run check && npm test`；覆盖率：`npm run test:coverage`。全局发现应以此合法 SKILL.md 为入口。

# HANDOFF — paibao-site-ops

最后更新：2026-09-05 13:50 +0800

## 最新：用户要求「部署」，发布预检阻塞（尚未推送/合并）

按发布本轮两仓智能体端工具修复处理，不新建站、不重建现有站点容器、不发文章、不操作CF。2026-09-05复跑39+38测试均通过，两修复工作树干净。

- 远端main仍为ops `2196091` / 站点 `58a7a77`；本地修复未上远端。
- ops仓没有`.github/workflows`，没有可用自动PR检查。
- 站点main最近Quality `33890546983`及CMS release `33890546992`都在npm ci失败，有分配runner及实际步骤，**不是0步额度拒绝**。日志确认lock不一致，包括`Missing: csstype@3.2.3 from lock file`；不能跳过npm ci/typecheck/build放行。
- 现有quality/release仍写死ubuntu-latest，且新MCP回归未纳入CI。CMS release只产出artifact，不等于部署到生产。
- 建议最小发布方案：修复依赖lock基线并按需修复后续暴露的基线错误；ops补CLI检查，站点将MCP测试接入CI及受管runner路由；审查PR、全部门禁绿后合main，再将全局技能入口切到稳定main。无需改DNS/nginx/容器/CF。
- **下一步先等用户确认上述CI/多文件修复方案**，不直接推红PR或跳过门禁。真正新Docker站另按完整注册/secret/digest前置处理。


## 当前任务 / 写入者

用户已批准修复假成功、凭据传递、离线测试，然后继续 Docker/MCP 验收。CF 控制面操作暂停，不擅自发布生产草稿。主代理为唯一写入者；两个 Codex writer 因沙箱禁止 Git 元数据写入在 RED 提交处停止并撤回文件，未实施。随后主代理亲自写测试、修复、验证及提交。不存在仍活跃的代码子代理。

- 本仓分支 `fix/verified-lifecycle-20260905`，原业务基线 `2196091`，审查文档基线 `25624c2`。
- 模板 `../client-sites/_factory/client-site-starter` HEAD `fcb27b8` 实际在 `merge/sop-preview-into-main`，并非 main；禁止未经核对合并/切换。
- MCP修复隔离分支 `fix/mcp-demo-verification-20260905`，路径 `../paibaowork-mcp-verification`；原站 `../client-sites/paibaowork` 有他人文章/封面未提交，未触碰。

## 已完成与实证

- 旧问题和审查取舍：[AUDIT-2026-09-05.md](AUDIT-2026-09-05.md)。其中旧状态由本文件覆盖。
- TDD：35项中33 fail → 35 pass；独立复核发现合法幂等状态被拒等问题 → 新增4项RED → **39/39全绿**。RED checkpoints `6c1d35a` / `e8d83d4`。
- CLI 删除 stderr 关键词吞错和无条件完成提示；严格JSON/退出码/命令状态，支持模板合法 `unchanged` / `reconfigured`，保留结构化不可回滚安全信号。
- deploy apply 必须 GHCR digest + baseline commit/fingerprint，白名单透传；支持显式 starter/state/target 路径。
- secrets/operate/handover 明确 `instructions_only`，不虚构已注入/连接；CF写路径 fail-closed，旧execSync预建代码已移除。
- npm check/test/coverage入口、AGENTS与技能已同步真实边界。CLI行覆盖率96.71%（分支63.41%，不是全分支覆盖）。
- 真模板 create dry-run：exit0/planned；本机Docker29.7.2、Xserver SSH/Docker27.5.1只读探针成功。**未部署新Docker容器**。
- MCP工具38/38回归通过；真实paibaowork tools/list=51、pulseagent=53，两站各创建一篇草稿并独立读回成功，仍未发布。完整ID见MCP分支HANDOFF。
- 独立GPT复核发现5项：幂等回执、具名站点token回退、query凭据、ok:false工具回执、CLI创建状态验证；均加RED并修复，主代理复跑GREEN。

## Docker真实前置（仍未齐备/验收）

完整secret契约：TURNSTILE_SITE_KEY、TURNSTILE_SECRET_KEY、INQUIRY_FROM_EMAIL、ZEPTOMAIL_API_KEY或RESEND_API_KEY、CONTROL_PLANE_URL、CONTROL_PLANE_SITE_TOKEN；INQUIRY_FROM_NAME可选，SEO_CANONICAL_*与受管身份一致。目录0700/site.env0600。以模板validator为准，不能塞假值绕门。

还需：隔离站控制面注册、完整真实secret、经验证构建的GHCR digest/baseline、模板分支与部署路径审核。已有paibaowork Docker站MCP成功不能代替“新建Docker站部署完成”。

## 人工阻塞 / 原goal剩余

- Claude auth status虽loggedIn，但真实Sonnet请求仍401 OAuth revoked，未完成第二厂商写入；老板须 `claude auth login`。
- ego-browser task space **6** 已交用户，页面paibaowork.com/admin-login。无已登录session、vault无管理员凭据引用。等用户明确确认后takeOver，验证草稿可编辑，不能自动publish。
- 两站发布仍需本人审阅或明确选择不发；不以draft回读冒充后台编辑/前台200。
- CF token长度/前缀与撤销判断无依据，旧结论撤回；曾暴露凭据仍须轮换。

## 验证方式

```bash
npm run check
npm test
npm run test:coverage
git diff --check
```

MCP隔离仓：`node --test scripts/mcp-verification.test.mjs`；各JS `node --check`，shell `bash -n`。不把局部测试当作全量CMS build/CI；本轮不改UI/CMS依赖或基础设施。

新增职责：`test/cli.test.mjs`零网络子进程契约测试；`AGENTS.md`仓级验证入口。调用仍为CLI→原site-lifecycle，没有新部署引擎。

## 本轮文件清单（跨仓）

| 仓/文件 | 目的 |
|---|---|
| ops `bin/paibao-site-ops.mjs` | 修复假成功、严格回执与不可变部署参数，暂停CF写路径 |
| ops `test/cli.test.mjs`（新增） | 39项隔离契约测试，覆盖失败与幂等路径 |
| ops `package.json` | 增加check/test/coverage入口及Node最低版本 |
| ops `README.md` | 对齐命令、digest和能力边界 |
| ops `AGENTS.md`（新增） | 固化本仓测试/安全约束 |
| ops `skills/paibao-site-ops/SKILL.md` | 删除自动CF/假接管说明，改为受管Docker流程 |
| ops `docs/HANDOFF.md` | 跨仓证据、阻塞与接续入口 |
| MCP `scripts/lib/emdash-mcp.mjs`（新增） | 统一协议、认证、错误及超时处理 |
| MCP `scripts/demo-ai-operator.mjs`（新增） | 执行draft建稿及独立回读验收 |
| MCP `scripts/demo-ai-operator.sh` | 只exec Node，移除token argv传递 |
| MCP `scripts/paibaowork-mcp.mjs` | 复用传输并验证参数/工具回执 |
| MCP `scripts/mcp-verification.test.mjs`（新增） | 38项零网络错误注入与安全测试 |
| MCP `skills/paibaowork-publish/SKILL.md`（新增） | 提供合法可发现的安全运营技能入口 |
| MCP `content-pool/MCP-AGENTS.md` | 修正配置、演示语义与未完成验收声明 |
| MCP `AGENTS.md` | 补MCP验证命令与发布边界 |
| MCP `docs/HANDOFF.md` | 保存两站草稿ID、真实请求与人审状态 |

调用变化：CLI→site-lifecycle保留；CLI→wrangler自动预建路径移除；MCP CLI/demo统一→共享客户端，shell→Node，不再shell拼请求。全局paibaowork-publish的SKILL软链暂指隔离worktree合法入口，合入main后迁至稳定路径再删除worktree。

## 下一步第一件事

审核本轮两仓修复分支，按PR/CI路径合入。核对模板分支与构建digest/baseline来源、隔离站控制面注册和secret后继续Docker部署；收到用户Claude登录/后台登录确认后补第二厂商及后台实证。不得将goal标完成。

# HANDOFF — paibao-site-ops

最后更新：2026-09-05 18:36 +0800

## 最新：fork PR门禁已修，两仓候选CI实跑通过，等待合并审核

- 用户17:05明确授权追溯、备份后清史及可能的受控强推。站点完成三份age加密备份和解密校验；当前登录表只读查无匹配，未用旧值认证。
- 站点14个本地ref精确重写，原8个在途文件和1条可见stash保留；远端仅3个分支以atomic+逐ref旧SHA lease更新。main现`9ebe7c7`，修复分支映射为`9760ffd`；没有把功能修复合入main，也未动容器/CF/文章。
- 本地全部5233个对象查无该值，历史gitleaks=0，新历史MCP38/38。10条确证误报仅更新提交fingerprint。完整证据见站点私有仓`docs/SECURITY-HISTORY-CLEANUP-20260905.md`。
- **已修上次审查阻塞**：三个workflow删除跳过fork的job级if；fork固定hosted并短路CI_RUNNER解析，同仓PR/push/dispatch保留受管路由。没有新增pull_request_target，没有让fork进入持久runner。
- **TDD**：ops RED `31c3f26`→GREEN `018d980`；站点 RED `04c24f9`→GREEN `58b44d3`。新增两个路由测试文件，覆盖三个job、8类事件/配置组合、坏配置的短路与显式失败，并防止重新跳过job或断开CI测试接线。
- **新鲜验证**：507项（ops40+站点MCP/路由40+CMS427）、干净npm ci、seed/typecheck(0error)/build、npm pack dry-run全过；三个YAML与17个bash块语法通过。
- **独立复核PASS**：原生Codex只读复核这批修复，确认关闭此前唯一BLOCKER；私有报告在站点`docs/reviews/20260905-fork-routing-review.md`。PASS限静态实现和回归设计，未创建真实fork PR，不冒充Actions官方解释器或fork调度实测。
- **剩余边界**：GitHub保留7个只读旧PR快照，需平台处理（todo#29）；不能冒充所有缓存均已清除。功能修复PR/CI仍未完成。
- **纠正runner阻塞**：ops为public仓，受管reconcile明确跳过public，可用hosted；站点private且已有online xserver runner。旧注册工具有token argv问题，未运行，不必为已有/不需要的runner冒险注册。
- 原始授权已从会话请求d68f4872/用户f21c0df1核验。压缩后goal/NOW的等待授权状态滞后，不能据旧指针重复请求或猜测用户决定。

本轮文件：ops `.github/workflows/pr-check.yml`修改调度；新增`test/ci-routing.test.mjs`，由既有npm test自动收集；本文更新交接。站点修改quality/release，新增`scripts/ci-routing.test.mjs`并接入Quality，AGENTS同步验证入口，新增复核报告。CI增加测试调用，业务运行时调用关系不变，零新增依赖；不做npm发版或无关版本号重构。

已知辅助工具边界：`agents-handoff.sh --check`因末尾条件表达式返回1，且仅识别`.git`目录会漏掉worktree；本轮已读源码核验并逐项检查实际文档/验证入口，未改全局工具，也未把该诊断退出码当成项目测试结论。

### 实际PR/CI证据与下一步

- 本仓 [PR #1](https://github.com/iPythoning/paibao-site-ops/pull/1)，代码候选`4b9f267`的PR Check [33960914498](https://github.com/iPythoning/paibao-site-ops/actions/runs/33960914498)成功：hosted/ubuntu-latest，11个步骤，无失败或跳过。
- 站点 [PR #9](https://github.com/iPythoning/paibaowork-emdash/pull/9)，代码候选`89851e3`的Quality两次（push/PR）及CMS release全部success。所有job真实分配hosted runner并执行；不是0步失败或整体skipped。制品上传只在push main启用，PR中该单步按预期跳过，构建及可复现校验已成功。
- 这些是同仓事件，不冒充真实fork事件。收尾文档提交后需复核PR最新head的Checks；不得拿旧SHA的绿灯合并新代码。

下一步：向用户展示两个PR的最终就绪状态，确认合并后用reviewed head约束合main、复核main CI，再迁技能入口。当前尚未合并/部署容器/操作CF/发文章。#30已完成，#28等待PR审核，#29独立跟踪旧PR快照；人工OAuth/后台、新Docker前置不变。

## 2026-09-05 14:47 · 发布基线修复记录（历史状态，以上最新段落覆盖）

用户已确认执行最小发布修复。现两仓仍未push/PR/合main，网站容器、DNS、CF、文章均未操作，技能软链尚未迁至main。

- ops新增`.github/workflows/pr-check.yml`，从VibeDevOps模板裁剪为零依赖JS CLI门禁：受管runner变量、同仓PR限制（防fork上持久runner）、固定action SHA、固定gitleaks版本+下载SHA256、随机假key阳性对照且必须exit1、真实历史扫描、syntax/39tests/coverage/npm pack dry-run。不虚构TS编译或容器部署。
- 站点锁文件修复：仅补@types/react、@types/react-dom、csstype，另同步npm生成的本地file插件元数据，未升级既有运行时版本。干净npm ci（含patch-package）成功。
- 3个Astro文件补类型：LeadCapture/Base JSON响应类型、[slug]的date字段。8个既有类型错误清零；对比TypeScript transpile前后，三处输出JS逐字一致，没有页面行为改动。
- quality.yml接MCP38项回归+安全扫描、固定版本与阳性对照；quality/release改受管runner表达式、同仓PR限制和checkout不保留凭据。deploy-cloudflare.yml只同步lock SHA256常量，未触发CF动作。
- **新鲜验证：ops39 + MCP38 + CMS427 = 504项测试全绿；seed/typecheck(0error)/build/npm pack dry-run通过；4个workflow YAML与所有bash片段语法通过。** 本轮都是本地门禁，不能当作GitHub CI已执行。
- 安全门阳性对照成功：随机假GitHub token被检出(exit1)。ops历史gitleaks=0；站点历史gitleaks原11项，10项已证明是存储键、公开IndexNow验证文件值或Idempotency-Key测试数据，按精确commit/file/rule/line fingerprint豁免，未放宽目录/规则。
- **剩余1项未豁免**：站点历史commit `109bb329061f81caa8ad9139a6c713472293131d` 的`docs/templates/CLIENT-OPERATIONS-MANUAL.en.md:28`含来源未明登录token。当前模板已删除值，改为安全渠道单独交付；历史仍在。值从未回显，留存vault引用`EMDASH_LEGACY_MANUAL_LOGIN_TOKEN_REVOKE_PENDING`仅供追溯/撤销，未用于任何认证请求。不能凭模板写24h就断言已失效。
- 外部审查未完成：Pi codex-exec启动器MODULE_NOT_FOUND；原生codex只读fallback125秒超时，未返回最终报告。不得当作review通过，不再在此轮修Pi。
- ops还没有注册runner/设置CI_RUNNER；站点已有online/idle xserver runner，CI_RUNNER未设。`onboard-repo.sh`当前实现使用root@IP和token拼SSH argv，违反安全规则，本轮未执行也未改全局工具。后续应用安全的注册通路或先修该工具，不直接照跑。

### 本批新增/变更职责与调用关系

ops仅新增CI workflow；站点新增`.gitleaksignore`精确误报指纹；修改quality/release门禁、CF锁摘要、cms/package-lock、LeadCapture/Base/[slug]类型，以及客户手册去除登录值。没有新增业务服务/调用，三个Astro输出JS不变。完整验证输出保存在`~/.local/state/emdash-release/20260905/`，本交接为持久事实源。

### 下一步（硬停）

先确认该历史登录token来源/撤销情况，并让用户明确授权是否清理相关Git历史（涉及重写提交及受控强推，不能擅自做）。安全门过后补独立复核、runner接入、推PR/CI全绿合main，再迁技能入口。todo#29记录安全阻塞；原goal及#28保持in_progress。


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

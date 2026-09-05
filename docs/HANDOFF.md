# HANDOFF — paibao-site-ops

最后更新：2026-09-05 10:05 +0800

## 当前目标与边界

目标是智能体经 EmDash MCP 接管真实站（可建稿、人可后台改），用户要求先 Docker、暂停 CF；最新指令为用 GPT 子代理全面检查。此次完成诊断而非实施。下一步需用户确认多文件修复方案，不得继续声称 Docker 已部署。

当前写入者：Pi 主代理，仅写审查/交接文档。三个原生 Codex 只读进程（配置 gpt-5.6-sol）已结束；不再有后台审查写入者。

## 仓库现状

- 本仓 main，业务代码基线 `2196091`；本轮仅新增本文件及 `AUDIT-2026-09-05.md`。
- 模板 `../client-sites/_factory/client-site-starter` HEAD `fcb27b8` 在 `merge/sop-preview-into-main`，并非 main；禁止未经核对合并/切换其在途分支。
- 真实站工具 `../client-sites/paibaowork` main `58a7a77`；另有他人文章/封面未提交，不属于本次，禁止清理/覆盖。
- 本仓没有根 AGENTS.md 和测试 scripts。先检查路径存在，不重复 read ENOENT。

## 已完成

- 三路 GPT 审查：CLI 正确性、Docker 契约、MCP 原目标证据；主代理已核验关键源码。
- 完整问题、行号、证据、建议及取舍见 [AUDIT-2026-09-05.md](AUDIT-2026-09-05.md)。这份文档为持久事实源。
- Pi 子代理启动器 MODULE_NOT_FOUND 与业务代码无关；已通过原生 Codex read-only 恢复审查，未改 Pi 安装。

## 阻塞与纠错

1. `bin/paibao-site-ops.mjs` runLifecycle 吞错、create 无条件输出完成；secrets/operate 仅打印；deploy 未透传 digest/baseline。
2. Docker 不仅缺 Turnstile/发件邮箱，还需控制面 URL/site token 与邮件 provider。不得用假值绕门禁。
3. 双站 demo shell 有 token argv 暴露与 JSON-RPC 错误仍报成功。未修。
4. 第二厂商真写、后台可编辑、两站人工发布/明确不发决定没有完整验收。goal 保持 active。
5. CF token“必须40位、不能带前缀、已被撤销”等旧结论无依据，撤回。对话暴露的凭据仍需轮换。

## 验证方式

本轮仅文档交付：`git diff --check`，JS `node --check bin/paibao-site-ops.mjs`；检查未意外改变业务文件。独立审查包含语法检查与局部纯测试，不等于全量 CI 或真实部署。

修复后应新增/执行：
- 无网络 CLI 契约测试（非零退出、含 planned 的错误、未知参数、透传证明参数）。
- mock MCP 错误/空响应/成功/读回测试，日志与 argv 不含 token。
- 按既有流水线构建不可变镜像；Docker runtime health 与公网 live smoke 分开记录。
- ego-browser 真实后台编辑、前台页面及 console 错误检查；人工 publish 之前只记录 draft。

## 下一步第一件事

向用户确认审查报告的最小修复批次：先修假成功和凭据传递并补离线测试，再恢复 Docker 制品/secret 路径，最后补第二厂商与后台实证。暂不新增审批系统、不动 CF、不发布生产草稿。

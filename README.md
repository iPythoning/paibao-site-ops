# paibao-site-ops

EmDash 受管站点生命周期 CLI。**规划、实际执行与操作说明是不同状态，不代表已完成公网验收。** Node >=20.11，零运行时依赖。

```bash
node bin/paibao-site-ops.mjs create --domain example.com --brand "Acme Trading" --adapter docker
node bin/paibao-site-ops.mjs create --domain example.com --brand "Acme Trading" --adapter docker --apply
node bin/paibao-site-ops.mjs deploy --site /absolute/path/to/site  # 仅 planned
node bin/paibao-site-ops.mjs deploy --site /absolute/path/to/site --apply \
  --release-image 'ghcr.io/OWNER/REPO@sha256:DIGEST' \
  --baseline-commit FULL_GIT_COMMIT --baseline-fingerprint SHA256
node bin/paibao-site-ops.mjs audit --site /absolute/path/to/site
```

占位符须替换为既有构建流水线产生的真实证明。`--apply` 不接受 tag 或缺失 baseline，不允许隐式本地 Docker build。模板仍负责证明匹配、路径、secret、容器与回滚的权威校验；CLI 不复制另一套部署引擎。

## 路径

`--starter-dir` / `--state-root` 覆盖 `PAIBAO_STARTER_DIR` / `PAIBAO_STATE_ROOT`；create 用 `--target` 指定目标。默认保留原同级目录布局，独立安装者必须指定真实路径。

## 真实能力边界

- create/deploy 默认规划；新计划为 `planned`，既有同身份 create 可为 `unchanged`。create apply 接受 `created|unchanged`，deploy apply 接受 `deployed|reconfigured|unchanged`；幂等未变不宣称新建。非零退出一律失败，不因错误文本含 planned 而例外。
- `audit` 为模板 runtime health，不验证公网 DNS/TLS、后台编辑或 MCP。
- `secrets`、`operate`、`handover` 仅返回 `instructions_only` / `executed:false`；**不注入、不鉴权、不建立 MCP 连接**。现存目录也不代表已验证受管身份。
- Docker 完整 secret 契约见 [HANDOFF](docs/HANDOFF.md)，不可只补 Turnstile/邮箱，也不可使用假 key。
- Cloudflare create apply 已 fail-closed 暂停；dry-run 仍可用。CF 发布只走审阅后的 pinned workflow。不会自动创建资源或借用本机 OAuth。
- MCP 真实运营用站点仓库 `scripts/demo-ai-operator.sh`：tools/list → draft → get，人工发布另行确认。

## 验证

```bash
npm run check
npm test
npm run test:coverage
```

离线 fixture 不访问 CF、邮件或生产站点。详见 [审查](docs/AUDIT-2026-09-05.md) 与 [架构](docs/ARCHITECTURE.md)。Cloud/FDE 交付说明：paibaowork.com。

# paibao-site-ops

先读 README.md、docs/HANDOFF.md 与 ~/AGENTS.md。模板引擎为唯一部署契约源，不修改模板分支或复制其安全校验。

## 验证命令

```bash
npm run check
npm test
npm run test:coverage
```

- tests 使用隔离 fixture；禁止触达生产、vault 或真实云资源。
- planned / instructions_only 不能报部署或 MCP 验收完成；非零退出不能被 stderr 文本覆盖。
- deploy apply 必须使用 release-image digest + baseline commit/fingerprint，不回退现场构建。
- CF 写操作暂停；secrets/operate/handover 当前只是说明，不得夸大能力。
- 凭据只走环境变量或受限 FD，不输出到 argv、日志、测试或 Git。
- 修改后更新 HANDOFF；新文件逐个 git add，不碰其他工作树在途内容。

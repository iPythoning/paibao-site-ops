#!/usr/bin/env node
/**
 * paibao-site-ops — AI/agent「一句话从 0 建站、配置、运营」编排器。
 *
 * 封装既有成熟引擎：
 *   建站:  client-site-starter 的 site-lifecycle.mjs（create/deploy/health/backup/restore）
 *   运营:  EmDash MCP server（/_emdash/api/mcp, 8 域 tools）或 @paibao/emdash-agent-client
 *
 * 设计原则:
 *   - 默认 dry-run, 显式 --apply 才写 (与 site-lifecycle 一致)
 *   - 全自动: 给最少参数 (域名/品牌), 自动生成 slug/brand/email/CF 资源
 *   - 不重造轮子: 建站调 site-lifecycle, 运营走 MCP
 *   - 可被任何 agent 调用 (Claude Code/Codex/...): 读 skills/paibao-site-ops/SKILL.md 即知全流程
 *
 * Usage:
 *   paibao-site-ops create --domain example.com --brand "Acme" [--legal "..."] [--email ...] [--adapter cloudflare|docker] [--apply]
 *   paibao-site-ops deploy --site <path> [--apply]
 *   paibao-site-ops audit --site <path>
 *   paibao-site-ops operate --site <path> --mcp-url <url> --token <ec_pat_>  (印出运营命令)
 *   paibao-site-ops handover --site <path>   (生成/展示 admin 凭据 + MCP 接入)
 */

import { execFileSync, execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

// CF 账号/资源自动预建 (adapter=cloudflare 时 create 前调用)
async function provisionCloudflare(slug, { workerName, accountId, apiToken }) {
	const env = { ...process.env };
	if (apiToken) env.CLOUDFLARE_API_TOKEN = apiToken;
	const run = (cmd) => execSync(cmd, { encoding: "utf8", env, stdio: ["inherit", "pipe", "pipe"] });

	// 1. D1 database
	let d1Id;
	try {
		const out = run(`npx wrangler d1 create ${slug}-cms 2>&1`);
		d1Id = (out.match(/database_id = "([^"]+)"|database_id: ([a-f0-9-]{36})/) || [])[1] || (out.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/) || [])[0];
	} catch (e) {
		// 已存在则查列表
		const out = run(`npx wrangler d1 list 2>&1`);
		d1Id = (out.match(new RegExp(`${slug}-cms\\s+([a-f0-9-]{36})`)) || [])[1];
	}
	if (!d1Id) throw new Error("无法创建/找到 D1 database");

	// 2. KV namespace
	let kvId;
	try {
		const out = run(`npx wrangler kv namespace create ${slug}-session 2>&1`);
		kvId = (out.match(/id = "([^"]+)"|id: ([a-f0-9-]{32})/) || [])[1] || (out.match(/[a-f0-9]{32}/) || [])[0];
	} catch (e) {
		const out = run(`npx wrangler kv namespace list 2>&1`);
		kvId = (out.match(new RegExp(`${slug}-session\\s+([a-f0-9]{32})`)) || [])[1];
	}
	if (!kvId) throw new Error("无法创建/找到 KV namespace");

	// 3. R2 bucket (不存在才建, wrangler 无幂等 create)
	try { run(`npx wrangler r2 bucket create ${slug}-media 2>&1`); } catch { /* already exists */ }
	const r2Name = `${slug}-media`;

	console.log(`  ✓ CF 资源就绪: D1=${slug}-cms (${d1Id.slice(0,8)}…)  KV=${kvId.slice(0,8)}…  R2=${r2Name}`);
	return { d1Id, kvId, r2Name };
}

const DEFAULT_STARTER = process.env.PAIBAO_STARTER_DIR
	|| join(import.meta.dirname, "..", "..", "client-sites", "_factory", "client-site-starter");
const DEFAULT_STATE_ROOT = process.env.PAIBAO_STATE_ROOT
	|| join(import.meta.dirname, "..", "..", ".client-site-operator");

function usage() {
	console.log(`paibao-site-ops — AI/agent 建站编排器

用法:
  paibao-site-ops create --domain <domain.com> --brand "<Brand>" [options]
      [--legal "<Entity>"] [--email inquiry@domain] [--locales en,zh]
      [--adapter cloudflare|docker] [--apply]

  paibao-site-ops deploy --site <target-path> [--apply]
  paibao-site-ops audit --site <target-path>
  paibao-site-ops operate --site <target-path>   (展示 MCP 运营入口)
  paibao-site-ops secrets --site <target-path>   (docker secret 注入说明)
  paibao-site-ops handover --site <target-path>

选项:
  --domain      apex domain (必填, create)
  --brand       品牌名 (必填, create)
  --apply       真正执行 (默认 dry-run)
  --adapter     cloudflare (默认, 或 docker)
`);
}

function parseArgs(argv) {
	const values = {};
	const boolFlags = new Set(["apply"]);
	for (let i = 0; i < argv.length; i += 1) {
		const flag = argv[i];
		if (boolFlags.has(flag.replace(/^--/, ""))) { values[flag.replace(/^--/, "")] = true; continue; }
		if (!flag.startsWith("--") || i + 1 >= argv.length) throw new Error(`invalid argument: ${flag}`);
		values[flag.replace(/^--/, "")] = argv[++i];
	}
	return values;
}

/** 确保 starter engine 存在 */
function ensureStarter() {
	if (!existsSync(join(DEFAULT_STARTER, "scripts", "site-lifecycle.mjs"))) {
		console.error(`❌ client-site-starter 不存在: ${DEFAULT_STARTER}`);
		console.error("   git clone https://github.com/iPythoning/client-site-starter.git 到 _factory/ 下");
		process.exit(2);
	}
	return join(DEFAULT_STARTER, "scripts", "site-lifecycle.mjs");
}

function runLifecycle(command, siteLifecyclePath, args) {
	// 默认 dry-run 注入 state-root (site-lifecycle 强制要求)
	// args 不应含 command 本身 (调用方已拼好完整参数列表)
	const argv = [siteLifecyclePath, ...args];
	if (!argv.some((a) => a === "--state-root")) argv.push("--state-root", DEFAULT_STATE_ROOT);
	if (!process.env.PAIBAO_NO_EXEC) console.log(`\n▶ site-lifecycle ${command}\n`);
	try {
		const out = execFileSync("node", argv, { encoding: "utf8", stdio: ["inherit", "pipe", "pipe"] });
		console.log(out);
	} catch (e) {
		const stderr = e.stderr?.toString() || "";
		if (stderr.includes("dry run") || stderr.includes("--apply") || stderr.includes("Dry run") || stderr.includes("planned")) {
			console.log(stderr); // dry-run/planned 提示不是错误
		} else {
			console.error(stderr || e.message);
			process.exitCode = 1;
		}
	}
}
async function cmdCreate(values) {
	if (!values.domain || !values.brand) { usage(); process.exit(2); }
	const lifecycle = ensureStarter();
	const domain = values.domain;
	const slug = values.slug || domain.split(".")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
	const legal = values.legal || values.brand;
	const email = values.email || `inquiry@${domain}`;
	const locales = values.locales || "en";
	const adapter = values.adapter || "cloudflare";
	const target = values.target || join(import.meta.dirname, "..", "..", "client-sites", slug);

	const args = [
		"create",
		"--slug", slug,
		"--domain", domain,
		"--brand", values.brand,
		"--legal", legal,
		"--inquiry-email", email,
		"--locales", locales,
		"--target", target,
		"--source", DEFAULT_STARTER,
		"--adapter", adapter,
		"--state-root", DEFAULT_STATE_ROOT,
	];
	if (adapter === "cloudflare") {
		// worker name 必须 = slug (site-lifecycle 硬校验)
		args.push("--worker-name", slug);
		// 全自动: 预建 CF 资源 (D1/KV/R2) 并传 id; dry-run 用占位 UUID 验证完整流程
		let cf = { d1Id: null, kvId: null, r2Name: `${slug}-media` };
		if (values.apply) {
			console.log(`\n▶ 预建 Cloudflare 资源 (${slug})...`);
			cf = await provisionCloudflare(slug, {
				accountId: process.env.CLOUDFLARE_ACCOUNT_ID,
				apiToken: process.env.CLOUDFLARE_API_TOKEN,
			});
		} else {
			// 占位 UUID (格式合法, dry-run 不会真用)
			const { randomUUID } = await import("node:crypto");
			cf.d1Id = randomUUID(); cf.kvId = randomUUID().replace(/-/g, "");
			console.log(`\n[dry-run] 将自动预建: D1 ${slug}-cms / KV ${slug}-session / R2 ${slug}-media`);
		}
		args.push("--d1-id", cf.d1Id, "--kv-id", cf.kvId, "--r2-bucket", cf.r2Name);
	}
	if (values.apply) args.push("--apply");

	console.log(`\n══ paibao-site-ops create ══`);
	console.log(`  domain=${domain} slug=${slug} brand=${values.brand} adapter=${adapter}`);
	console.log(`  target=${target}\n`);
	runLifecycle("create", lifecycle, args);

	if (values.apply) {
		console.log(`\n✅ 建站完成: ${target}`);
		console.log(`  下一步: paibao-site-ops deploy --site ${target} --apply`);
		console.log(`          paibao-site-ops operate --site ${target}`);
	}
}

async function cmdDeploy(values) {
	const lifecycle = ensureStarter();
	const target = values.site || values.target;
	if (!target) { usage(); process.exit(2); }
	const args = ["deploy", "--site", target, "--state-root", DEFAULT_STATE_ROOT];
	if (values.apply) args.push("--apply");
	runLifecycle("deploy", lifecycle, args);
}

async function cmdAudit(values) {
	const lifecycle = ensureStarter();
	const target = values.site || values.target;
	if (!target) { usage(); process.exit(2); }
	runLifecycle("health", lifecycle, ["health", "--site", target, "--state-root", DEFAULT_STATE_ROOT]);
}

async function cmdOperate(values) {
	const target = values.site || values.target;
	console.log(`\n══ 运营接管: ${target || "(site)"} ══`);
	console.log(`
独立站运营走 EmDash MCP (8 域 tools)，任何 agent 可连:

  MCP endpoint : https://<domain>/_emdash/api/mcp
  token        : ec_pat_* (vault / admin 后台生成)

  一句话运营 (agent 说):
    "写一篇关于 [主题] 的博客草稿"    → content_create (draft)
    "发布刚才那篇"                    → content_publish
    "把首页 about 改成 ..."           → content_update
    "给产品页加个 testimonials 类型"  → schema_create_collection (Admin)

  参考: skills/paibao-site-ops/SKILL.md 或 content-pool/EMDASH-MCP-CAPABILITIES.md
`);
}

/** 给 docker 站注入 secret（从 vault / 参数 → site.env）*/
async function cmdSecrets(values) {
	const target = values.site || values.target;
	if (!target) { usage(); process.exit(2); }
	const { readFileSync: rf, writeFileSync: wf } = await import("node:fs");
	const siteEnvPath = join(target, ".client-site-operator") // 实际在 state-root; 改为读 manifest
	console.log(`\n══ 注入 docker secret ══`);
	console.log(`target=${target}`);
	// docker secret 位置在 state-root, 不是 target。提示用户正确路径。
	console.log(`\n提示: site.env 在 state-root 的 site 目录下（.client-site-operator/sites/<id>/deployments/<id>/secrets/site.env）`);
	console.log(`必填: TURNSTILE_SITE_KEY, TURNSTILE_SECRET_KEY, INQUIRY_FROM_EMAIL, (ZEPTOMAIL_API_KEY|RESEND_API_KEY)`);
	console.log(`可用 vault 注入的: RESEND_API_KEY（vault 有）；TURNSTILE×2 + INQUIRY_FROM_EMAIL 需从 CF/邮件侧提供。`);
	console.log(`\n待 secret 齐后: paibao-site-ops deploy --site ${target} --apply`);
}

async function cmdHandover(values) {
	const target = values.site || values.target;
	console.log(`\n══ 交接: ${target || "(site)"} ══`);
	console.log(`
管理后台 : https://<domain>/admin-login   (邮箱+密码, 人可改 agent 产出)
MCP      : /_emdash/api/mcp + ec_pat_* token (agent 接管)
GEO 字段 : guides 需 direct_answer/facts/sources/reviewed_at; posts 用 body_html
`);
}

async function main() {
	const [cmd, ...rest] = process.argv.slice(2);
	const values = parseArgs(rest);
	if (!cmd || cmd === "help" || cmd === "--help") { usage(); return; }
	switch (cmd) {
		case "create": await cmdCreate(values); break;
		case "deploy": await cmdDeploy(values); break;
		case "audit": await cmdAudit(values); break;
		case "operate": await cmdOperate(values); break;
		case "secrets": await cmdSecrets(values); break;
		case "handover": await cmdHandover(values); break;
		default: usage();
	}
}

main().catch((e) => { console.error("❌", e.message); process.exit(1); });

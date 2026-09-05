#!/usr/bin/env node
/** Thin, fail-closed adapter for the managed site lifecycle. Credentials use env, never CLI arguments. */
import { execFileSync } from 'node:child_process';
import { existsSync, lstatSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';

const DEFAULT_STARTER = process.env.PAIBAO_STARTER_DIR
  || join(import.meta.dirname, '..', '..', 'client-sites', '_factory', 'client-site-starter');
const DEFAULT_STATE_ROOT = process.env.PAIBAO_STATE_ROOT
  || join(import.meta.dirname, '..', '..', '.client-site-operator');
const schemas = {
  create: ['domain', 'brand', 'legal', 'email', 'locales', 'slug', 'adapter', 'apply', 'target', 'starter-dir', 'state-root'],
  deploy: ['site', 'target', 'apply', 'starter-dir', 'state-root', 'release-image', 'baseline-commit', 'baseline-fingerprint'],
  audit: ['site', 'target', 'starter-dir', 'state-root'],
  operate: ['site', 'target'], secrets: ['site', 'target'], handover: ['site', 'target'],
};
function invalid(message) { return Object.assign(new Error(message), { exitCode: 2 }); }
function usage() {
  console.log(`paibao-site-ops — managed site lifecycle (Node >=20.11)
  create --domain example.com --brand "Brand" [--adapter docker|cloudflare] [--apply]
    [--slug name] [--target path] [--legal entity] [--email inquiry@example.com] [--locales en,zh]
  deploy --site path [--apply --release-image ghcr.io/owner/repo@sha256:<digest>
    --baseline-commit <40hex> --baseline-fingerprint <64hex>]
  audit --site path                         (runtime health, not public/MCP verification)
  operate|secrets|handover --site path       (instructions_only; no write or connection)
  create/deploy/audit: --starter-dir path --state-root path override PAIBAO_* env.
Cloudflare create --apply is paused; use the reviewed pinned workflow, not ambient OAuth.
Only structured planned/created/deployed receipts count. A draft is not a published page.`);
}
function parseArgs(command, argv) {
  const allowed = schemas[command];
  if (!allowed) throw invalid('未知命令；运行 help 查看用法');
  const values = Object.create(null);
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (!flag.startsWith('--')) throw invalid('参数必须使用 --name value；布尔 --apply 不接受值');
    const name = flag.slice(2);
    // Do not echo unknown arguments: users sometimes accidentally pass a credential.
    if (!allowed.includes(name) || Object.hasOwn(values, name)) throw invalid('未知或重复选项；运行 help 查看本命令选项');
    if (name === 'apply') { values[name] = true; continue; }
    const value = argv[++i];
    if (!value || value.startsWith('--')) throw invalid('选项缺少值');
    values[name] = value;
  }
  if (values.site && values.target) throw invalid('--site 和 --target 不能同时使用');
  return values;
}
function targetFor(values) {
  const target = values.site || values.target;
  if (!target) throw invalid('必须提供 --site 或 --target');
  return resolve(target);
}
function ensureStarter(values) {
  const starter = resolve(values['starter-dir'] || DEFAULT_STARTER);
  const script = join(starter, 'scripts', 'site-lifecycle.mjs');
  if (!existsSync(script)) throw invalid('client-site-starter 缺失；用 --starter-dir 指定受信任模板目录');
  return { starter, script };
}
function runLifecycle(command, values, args) {
  const { script } = ensureStarter(values);
  const argv = [script, command, ...args, '--state-root', resolve(values['state-root'] || DEFAULT_STATE_ROOT)];
  let raw;
  try {
    raw = execFileSync(process.execPath, argv, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (error) {
    const exitCode = Number.isInteger(error.status) && error.status > 0 && error.status < 256 ? error.status : 1;
    const failure = Object.assign(new Error(`site-lifecycle ${command} 失败（exit ${exitCode}）；未确认完成`), { exitCode });
    // Preserve safety signals, without echoing untrusted child output or credentials.
    try {
      const payload = JSON.parse(error.stderr?.toString() || '');
      for (const key of ['unsafeToRollback', 'persistentDataMayHaveChanged', 'previousAuthorizationUncontrolled', 'runtimeOwnershipLost']) {
        if (payload[key] === true) failure[key] = true;
      }
    } catch { /* No structured safety payload; the process failure still propagates. */ }
    throw failure;
  }
  let result;
  try { result = JSON.parse(raw); }
  catch { throw new Error('site-lifecycle 未返回完整 JSON 回执；未确认完成'); }
  const accepted = command === 'create'
    ? (values.apply ? ['created', 'unchanged'] : ['planned', 'unchanged'])
    : (values.apply ? ['deployed', 'reconfigured', 'unchanged'] : ['planned']);
  if (!result || typeof result !== 'object' || Array.isArray(result)
    || (command === 'health' ? result.ok !== true : !accepted.includes(result.status))) {
    throw new Error('site-lifecycle 回执状态与请求不一致；未确认完成');
  }
  return result;
}
function createSite(values) {
  if (!values.domain || !values.brand) throw invalid('create 必须提供 --domain 和 --brand');
  const adapter = values.adapter || 'cloudflare';
  if (!['docker', 'cloudflare'].includes(adapter)) throw invalid('adapter 必须为 docker 或 cloudflare');
  const slug = values.slug || values.domain.split('.')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw invalid('slug 必须为小写字母、数字及分隔连字符');
  if (adapter === 'cloudflare' && values.apply) throw invalid('Cloudflare 写操作已暂停；请走审阅后的 pinned workflow，不在此预建资源');
  const { starter } = ensureStarter(values);
  const args = ['--slug', slug, '--domain', values.domain, '--brand', values.brand,
    '--legal', values.legal || values.brand, '--inquiry-email', values.email || `inquiry@${values.domain}`,
    '--locales', values.locales || 'en', '--target', resolve(values.target || join(import.meta.dirname, '..', '..', 'client-sites', slug)),
    '--source', starter, '--adapter', adapter];
  if (adapter === 'cloudflare') {
    // Format-valid planning placeholders only. This path can never apply.
    args.push('--worker-name', slug, '--d1-id', randomUUID(), '--kv-id', randomUUID().replaceAll('-', ''), '--r2-bucket', `${slug}-media`);
  }
  if (values.apply) args.push('--apply');
  return runLifecycle('create', values, args);
}
function deploySite(values) {
  const target = targetFor(values);
  const keys = ['release-image', 'baseline-commit', 'baseline-fingerprint'];
  if (values.apply || keys.some(key => values[key] !== undefined)) {
    if (!/^ghcr\.io\/[a-z0-9._-]+\/[a-z0-9._/-]+@sha256:[a-f0-9]{64}$/.test(values['release-image'] || '')
      || !/^[a-f0-9]{40}$/i.test(values['baseline-commit'] || '')
      || !/^[a-f0-9]{64}$/i.test(values['baseline-fingerprint'] || '')) {
      throw invalid('deploy 需要完整 --release-image（GHCR digest）、--baseline-commit、--baseline-fingerprint；禁止隐式本机构建');
    }
  }
  const args = ['--site', target];
  for (const key of keys) if (values[key]) args.push(`--${key}`, values[key]);
  if (values.apply) args.push('--apply');
  return runLifecycle('deploy', values, args);
}
function instructions(command, values) {
  const target = targetFor(values);
  if (!existsSync(target) || !lstatSync(target).isDirectory() || lstatSync(target).isSymbolicLink()) {
    throw invalid('站点目录不存在或不是常规目录');
  }
  return {
    command, status: 'instructions_only', target, executed: false, injected: false, connected: false,
    message: command === 'secrets'
      ? '此命令不读取或注入凭据。按受管 manifest.paths.secretEnv 配置真实凭据，并运行模板 validateDockerSecretSet；完整契约见 docs/HANDOFF.md。'
      : '此命令不验证站点身份、后台或 MCP；请使用真实站点的 MCP 演示工具完成 tools/list、draft 写入和读回。人工发布另行确认。',
  };
}
function main() {
  const [command, ...argv] = process.argv.slice(2);
  if ((!command || command === 'help' || command === '--help') && argv.length === 0) { usage(); return; }
  const values = parseArgs(command, argv);
  const result = command === 'create' ? createSite(values)
    : command === 'deploy' ? deploySite(values)
      : command === 'audit' ? runLifecycle('health', values, ['--site', targetFor(values)])
        : instructions(command, values);
  console.log(JSON.stringify(result, null, 2));
}
try { main(); }
catch (error) {
  const safety = ['unsafeToRollback', 'persistentDataMayHaveChanged', 'previousAuthorizationUncontrolled', 'runtimeOwnershipLost']
    .filter(key => error[key] === true);
  console.error(JSON.stringify({ error: error.message, ...(safety.length ? { safety } : {}) }));
  process.exitCode = error.exitCode || 1;
}

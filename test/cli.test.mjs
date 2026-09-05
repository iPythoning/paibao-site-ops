import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const cli = resolve(import.meta.dirname, '../bin/paibao-site-ops.mjs');
function fixture(t, response = { status: 'planned' }, code = 0, stderr = '') {
  const root = mkdtempSync(join(tmpdir(), 'ops-contract-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const starter = join(root, 'starter'), site = join(root, 'site'), capture = join(root, 'argv.json');
  mkdirSync(join(starter, 'scripts'), { recursive: true }); mkdirSync(site);
  writeFileSync(join(starter, 'scripts/site-lifecycle.mjs'), `import {writeFileSync} from 'node:fs';
writeFileSync(${JSON.stringify(capture)}, JSON.stringify(process.argv.slice(2)));
console.log(${JSON.stringify(typeof response === 'string' ? response : JSON.stringify(response))});
console.error(${JSON.stringify(stderr)}); process.exitCode=${code};`);
  // Never let the old Cloudflare path reach real npx, even during RED.
  const bin = join(root, 'bin'); mkdirSync(bin);
  writeFileSync(join(bin, 'npx'), '#!/bin/sh\nexit 91\n', { mode: 0o755 });
  return { root, starter, site, capture, run(args) {
    return spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8', timeout: 10000,
      env: { PATH: `${bin}:${process.env.PATH}`, HOME: root, PAIBAO_STARTER_DIR: starter, PAIBAO_STATE_ROOT: join(root, 'state') } });
  } };
}
const create = ['create', '--domain', 'demo.example.com', '--brand', 'Demo', '--adapter', 'docker'];
const image = `ghcr.io/example/site@sha256:${'a'.repeat(64)}`;
const attestation = ['--release-image', image, '--baseline-commit', 'b'.repeat(40), '--baseline-fingerprint', 'c'.repeat(64)];
for (const word of ['planned', '--apply', 'dry run', 'Dry run', 'failure']) {
  test(`propagates nonzero exit even when stderr contains ${word}`, t => {
    const f = fixture(t, { status: 'created' }, 7, word);
    const r = f.run([...create, '--apply']);
    assert.equal(r.status, 7); assert.doesNotMatch(r.stdout, /建站完成/);
  });
}
for (const response of [{}, { status: 'failed' }, { status: 'deployed' }, 'banner\n{"status":"planned"}', '']) {
  test(`rejects invalid create response ${JSON.stringify(response)}`, t => {
    const f = fixture(t, response); assert.notEqual(f.run(create).status, 0);
  });
}
test('dry-run reports only planned, apply requires created', t => {
  const f = fixture(t); const plan = f.run(create); assert.equal(plan.status, 0);
  assert.equal(JSON.parse(plan.stdout).status, 'planned');
  assert.notEqual(f.run([...create, '--apply']).status, 0);
});
test('created response is validated and returned', t => {
  const f = fixture(t, { status: 'created', manifest: { siteId: 'fixture' } });
  const r = f.run([...create, '--apply']); assert.equal(r.status, 0); assert.equal(JSON.parse(r.stdout).status, 'created');
});
for (const args of [['wat'], ['create','--token','DO_NOT_ECHO'], [...create,'--brand','Again'], [...create,'--apply','false'], [...create,'--target'], ['deploy','--site','--apply'], [...create,'--wat','value']]) {
  test(`invalid CLI syntax is usage failure: ${args[0]} ${args.at(-1)}`, t => {
    const f = fixture(t); const r = f.run(args); assert.equal(r.status, 2); assert.equal(existsSync(f.capture), false);
    assert.doesNotMatch(r.stdout+r.stderr, /DO_NOT_ECHO/);
  });
}
test('CF apply fails closed before lifecycle or resource creation', t => {
  const f = fixture(t); const r = f.run(['create','--domain','demo.example.com','--brand','Demo','--apply']);
  assert.equal(r.status, 2); assert.equal(existsSync(f.capture), false); assert.match(r.stderr,/Cloudflare|CF/);
});
for (const slug of ['../escape', 'demo;echo injected', '--option']) {
  test(`rejects unsafe slug ${slug}`, t => { const f=fixture(t); assert.equal(f.run([...create,'--slug',slug]).status,2); assert.equal(existsSync(f.capture),false); });
}
test('deploy requires immutable attestation before apply', t => {
  const f=fixture(t); assert.equal(f.run(['deploy','--site',f.site,'--apply']).status,2); assert.equal(existsSync(f.capture),false);
});
test('deploy forwards exact release/baseline arguments', t => {
  const f=fixture(t,{status:'deployed',release:{imageDigest:'sha256:'+'a'.repeat(64)}});
  const r=f.run(['deploy','--site',f.site,'--apply',...attestation]); assert.equal(r.status,0); assert.equal(JSON.parse(r.stdout).status,'deployed');
  const argv=JSON.parse(readFileSync(f.capture,'utf8'));
  for(let i=0;i<attestation.length;i+=2) assert.equal(argv[argv.indexOf(attestation[i])+1],attestation[i+1]);
});
test('partial/invalid attestation cannot reach engine', t => {
  const f=fixture(t); for(const args of [['--baseline-commit','b'.repeat(40)],['--release-image','ghcr.io/example/site:latest']]) {
    assert.equal(f.run(['deploy','--site',f.site,...args]).status,2); assert.equal(existsSync(f.capture),false);
  }
});
test('explicit paths override env and are forwarded', t => {
  const f=fixture(t), target=join(f.root,'explicit'), state=join(f.root,'explicit-state');
  const r=f.run([...create,'--target',target,'--starter-dir',f.starter,'--state-root',state]); assert.equal(r.status,0);
  const argv=JSON.parse(readFileSync(f.capture,'utf8')); assert.equal(argv[argv.indexOf('--state-root')+1],state); assert.equal(argv[argv.indexOf('--target')+1],target);
});
for(const command of ['operate','secrets','handover']) {
  test(`${command} is explicitly instructions-only, not verification`, t => {
    const f=fixture(t); const r=f.run([command,'--site',f.site]); assert.equal(r.status,0);
    const result=JSON.parse(r.stdout); assert.equal(result.status,'instructions_only'); assert.equal(result.executed,false);
    if(command==='secrets') assert.equal(result.injected,false);
    if(command==='operate') assert.equal(result.connected,false);
    assert.equal(existsSync(f.capture),false);
  });
  test(`${command} rejects missing site`, t => { const f=fixture(t); assert.equal(f.run([command,'--site',join(f.root,'missing')]).status,2); });
}
test('audit must report ok true', t => { const f=fixture(t,{ok:false}); assert.notEqual(f.run(['audit','--site',f.site]).status,0); });
test('help succeeds without a starter', t => { const f=fixture(t); assert.equal(f.run(['help']).status,0); });

for(const apply of [false,true])test('create accepts engine unchanged receipt (apply='+apply+')',t=>{
 const f=fixture(t,{status:'unchanged',manifest:{siteId:'fixture'}});const r=f.run([...create,...(apply?['--apply']:[])]);
 assert.equal(r.status,0,r.stderr);assert.equal(JSON.parse(r.stdout).status,'unchanged');
});
for(const status of ['unchanged','reconfigured'])test('deploy accepts engine '+status,t=>{
 const f=fixture(t,{status,release:{imageDigest:'sha256:'+'a'.repeat(64)}});
 const r=f.run(['deploy','--site',f.site,'--apply',...attestation]);assert.equal(r.status,0,r.stderr);assert.equal(JSON.parse(r.stdout).status,status);
});

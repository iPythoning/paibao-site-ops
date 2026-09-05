import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workflows = [['pr-check.yml', 'check']];
const approvedExpression = "(github.event_name == 'pull_request' && github.event.pull_request.head.repo.full_name != github.repository) && 'ubuntu-latest' || (vars.CI_RUNNER && fromJSON(vars.CI_RUNNER) || 'ubuntu-latest')";

for (const [file, jobName] of workflows) {
  test(`${file}: fork checks run on hosted; trusted events retain configured routing`, () => {
    const source = readFileSync(new URL(`../.github/workflows/${file}`, import.meta.url), 'utf8');
    const job = source.split(`\n  ${jobName}:\n`)[1]?.split(/\n  [\w-]+:\n/)[0];
    assert.ok(job, 'required job exists');
    assert.doesNotMatch(job, /^    if:/m, 'required checks must not skip fork PRs');
    assert.doesNotMatch(source, /^  pull_request_target:/m, 'do not elevate untrusted PR permissions');
    const expression = job.match(/^    runs-on: \$\{\{ (.+) \}\}$/m)?.[1];
    assert.equal(expression, approvedExpression, 'only the reviewed fork-first expression may execute');

    // This exact expression uses a JS-compatible subset of Actions expressions.
    // Pin it before evaluation: this is not a general Actions-expression evaluator.
    const route = new Function('github', 'vars', 'fromJSON', `return (${expression});`);
    const repository = 'owner/project';
    const selfHosted = ['self-hosted', 'xserver'];
    const cases = [
      ['fork with persistent route', 'pull_request', 'external/project', JSON.stringify(selfHosted), 'ubuntu-latest', 0],
      ['fork without route', 'pull_request', 'external/project', '', 'ubuntu-latest', 0],
      ['fork ignores malformed route', 'pull_request', 'external/project', '{invalid', 'ubuntu-latest', 0],
      ['same-repo PR configured', 'pull_request', repository, JSON.stringify(selfHosted), selfHosted, 1],
      ['same-repo PR default', 'pull_request', repository, '', 'ubuntu-latest', 0],
      ['push without PR context', 'push', undefined, JSON.stringify(selfHosted), selfHosted, 1],
      ['manual dispatch string label', 'workflow_dispatch', undefined, JSON.stringify('ubuntu-24.04'), 'ubuntu-24.04', 1],
      ['push default', 'push', undefined, '', 'ubuntu-latest', 0],
    ];
    for (const [label, eventName, headRepo, setting, expected, expectedParses] of cases) {
      const github = { repository, event_name: eventName, event: {} };
      if (headRepo) github.event.pull_request = { head: { repo: { full_name: headRepo } } };
      let parses = 0;
      const result = route(github, { CI_RUNNER: setting }, value => { parses++; return JSON.parse(value); });
      assert.deepEqual(result, expected, label);
      assert.equal(parses, expectedParses, `${label}: short-circuit config parsing`);
    }
    assert.throws(() => route({ repository, event_name: 'push' }, { CI_RUNNER: '{invalid' }, JSON.parse), SyntaxError,
      'bad trusted configuration must fail, not silently choose a different runner');
    assert.match(job, /run: npm test/, 'routing regression remains in the required test gate');
  });
}

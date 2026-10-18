// No diagnostic is silently ignored: check both full trees with the SAME
// installed dependencies; fail on any additional/changed diagnostic.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
const compiler = resolve('node_modules/typescript/bin/tsc');
function check(cwd) {
  const result = spawnSync(process.execPath, [compiler, '--noEmit', '--pretty', 'false'], { cwd, encoding: 'utf8' });
  if (result.error) throw result.error;
  const output = result.stdout + result.stderr;
  console.log(output);
  const errors = output.split('\n').filter(line => /error TS\d+:/.test(line));
  assert.ok(result.status === 0 || (result.status === 2 && errors.length), 'Unexpected compiler failure');
  // Preserve file, error code, message AND multiplicity. Only positions can move.
  return errors.map(line => line.replace(/\(\d+,\d+\):/, ':')).sort();
}
const current = check(process.cwd());
const baseline = check(resolve(process.argv[2]));
assert.deepEqual(current, baseline, 'TypeScript diagnostics differ from reviewed baseline');
if (current.length) console.log(`::warning::Full TypeScript check is not clean: ${current.length} existing diagnostics reproduced on baseline 74673f4; no new diagnostics.`);
else console.log('Full TypeScript check passed on both trees.');

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const anonKey = `e30.${Buffer.from(JSON.stringify({ role: 'anon' })).toString('base64url')}.signature`;
const privateJwt = `e30.${Buffer.from(JSON.stringify({ role: 'service_role' })).toString('base64url')}.signature`;
function readConfig(values) {
  const env = { ...process.env };
  delete env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  delete env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  Object.assign(env, values);
  return spawnSync(process.execPath, ['--experimental-strip-types', '--input-type=module', '-e', 'await import("./next.config.ts")'], { cwd: new URL('../', import.meta.url), env, encoding: 'utf8' });
}

test('build accepts absent, publishable, and legacy anon credentials', () => {
  for (const values of [{}, { NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test' }, { NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey }]) {
    const result = readConfig(values);
    assert.equal(result.status, 0, result.stderr);
  }
});

test('build refuses private keys before exposing them in browser JavaScript', () => {
  for (const values of [
    { NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_test' },
    { NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: privateJwt },
    { NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test', NEXT_PUBLIC_SUPABASE_ANON_KEY: privateJwt },
  ]) {
    const result = readConfig(values);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Private Supabase keys cannot be bundled/);
    assert.ok(!result.stderr.includes(privateJwt));
  }
});

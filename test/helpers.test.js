import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { createHmac } from 'node:crypto';
import bridge from '@vkontakte/vk-bridge';
import * as server from 'vk-helpers/server';
import * as browser from 'vk-helpers/browser';
import * as legacy from 'vk-helpers';
const require = createRequire(import.meta.url);

// Independent frozen 1.0.3 wire algorithm, with deliberately fake credentials.
const options = { secretKey: 'FAKE-test-secret-not-a-credential', app_id: '123', user_id: '456', ts: 1700000000 };
function original(params) {
  const payload = Buffer.from(Object.entries(params).sort(([a], [b]) => a.localeCompare(b)).map(([k,v]) => `${k}_${encodeURIComponent(String(v))}`).join(';')).toString('base64').replace(/=/g, '');
  const sign = createHmac('sha256', options.secretKey).update(`app_id=${options.app_id}&request_id=${payload}&ts=${options.ts}&user_id=${options.user_id}`).digest('base64url');
  return { payload, sign };
}
for (const params of [{}, { z: 'hello world', a: "Привет !'()*;_+/%" }, { num: 3, flag: false }, { B: '2', a: '1' }]) {
  test(`exact signature wire compatibility: ${JSON.stringify(params)}`, () => {
    const expected = original(params);
    for (const api of [server, legacy, require('vk-helpers/server'), require('vk-helpers')]) {
      assert.equal(api.sortParams(params), expected.payload);
      assert.equal(api.generateSignature({ ...options, params }), expected.sign);
      assert.equal(api.checkRequestSignature({ ...options, params, signature: expected.sign }), true);
      for (const signature of ['', 'x', expected.sign + '=', 'x'.repeat(43), 'я'.repeat(43), null]) {
        assert.equal(api.checkRequestSignature({ ...options, params, signature }), false);
      }
    }
  });
}
test('Bridge receives the same encoded payload and preserves sign/ts contract', async () => {
  const params = { z: 'space + slash/', a: 'Привет !' };
  const expected = original(params);
  const send = bridge.send;
  bridge.send = async (method, data) => {
    assert.equal(method, 'VKWebAppCreateHash');
    assert.deepEqual(data, { payload: expected.payload });
    return { sign: expected.sign, ts: options.ts };
  };
  try {
    for (const api of [browser, legacy, require('vk-helpers/browser'), require('vk-helpers')]) {
      const result = await api.getHashForParamsFromVK(params);
      assert.deepEqual(result, { sign: expected.sign, ts: options.ts });
      assert.equal(server.checkRequestSignature({ ...options, params, signature: result.sign, ts: result.ts }), true);
    }
  } finally { bridge.send = send; }
});
test('Bridge failure rejects rather than returning an empty signature', async () => {
  const send = bridge.send;
  const error = new Error('synthetic bridge failure');
  bridge.send = async () => { throw error; };
  try { await assert.rejects(browser.getHashForParamsFromVK({}), error); }
  finally { bridge.send = send; }
});
test('explicit empty search is empty; duplicate and encoded parameters retain URLSearchParams behavior', () => {
  globalThis.window = { location: { search: '?fallback=yes' } };
  try {
    assert.deepEqual(browser.parseLaunchParams(''), {});
    assert.deepEqual(browser.parseLaunchParams(), { fallback: 'yes' });
    assert.deepEqual(browser.parseLaunchParams('?x=1&x=2&label=hello+world&v=%D0%AF'), { x: '2', label: 'hello world', v: 'Я' });
  } finally { delete globalThis.window; }
  assert.deepEqual(browser.parseLaunchParams('?x=1'), { x: '1' });
  assert.throws(() => browser.parseLaunchParams(), /browser environment/);
});
test('isolated exports keep browser and server dependency boundaries', async () => {
  const { rollup } = await import('rollup');
  for (const [entry, forbidden] of [['browser', /crypto/], ['server', /vk-bridge/]]) {
    const bundle = await rollup({ input: `dist/${entry}.js`, external: ['node:crypto', '@vkontakte/vk-bridge'] });
    const { output } = await bundle.generate({ format: 'es' });
    assert.ok(!forbidden.test(output[0].code));
    await bundle.close();
  }
  assert.ok(readFileSync('dist/browser/index.d.ts', 'utf8').includes('parseLaunchParams'));
});

test('npm-packed package works as an installed ESM/CJS consumer without window', async () => {
  const { mkdtempSync, mkdirSync, symlinkSync, writeFileSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join, resolve } = await import('node:path');
  const { execFileSync } = await import('node:child_process');
  const temp = mkdtempSync(join(tmpdir(), 'vk-helpers-consumer-'));
  try {
    const packed = JSON.parse(execFileSync('npm', ['pack', '--json', '--ignore-scripts', '--pack-destination', temp], { encoding: 'utf8' }))[0];
    assert.ok(packed.files.every(file => !file.path.includes('node_modules') && !file.path.startsWith('src/')));
    const target = join(temp, 'node_modules', 'vk-helpers');
    mkdirSync(target, { recursive: true });
    execFileSync('tar', ['-xzf', join(temp, packed.filename), '-C', target, '--strip-components=1']);
    // Only the declared external runtime dependency is supplied from the local
    // clean install. The library itself is loaded exclusively from its tarball.
    symlinkSync(resolve('node_modules/@vkontakte'), join(temp, 'node_modules', '@vkontakte'), 'dir');
    const assertions = `
      import assert from 'node:assert/strict';
      import { createRequire } from 'node:module';
      import * as root from 'vk-helpers';
      import * as server from 'vk-helpers/server';
      import * as browser from 'vk-helpers/browser';
      import bridge from '@vkontakte/vk-bridge';
      const require = createRequire(import.meta.url);
      assert.equal(typeof globalThis.window, 'undefined');
      const options = ${JSON.stringify({ ...options, params: { action: "Привет !'()* +/%" } })};
      const expected = ${JSON.stringify(original({ action: "Привет !'()* +/%" }))};
      for (const api of [root, server, require('vk-helpers'), require('vk-helpers/server')]) {
        assert.equal(api.generateSignature(options), expected.sign);
        assert.equal(api.checkRequestSignature({...options, signature: expected.sign}), true);
      }
      bridge.send = async (method, value) => {
        assert.equal(method, 'VKWebAppCreateHash');
        assert.deepEqual(value, {payload:expected.payload});
        return {sign:expected.sign,ts:options.ts};
      };
      for (const api of [root, browser, require('vk-helpers'), require('vk-helpers/browser')]) {
        assert.deepEqual(await api.getHashForParamsFromVK(options.params), {sign:expected.sign,ts:options.ts});
      }
    `;
    writeFileSync(join(temp, 'consumer.mjs'), assertions);
    execFileSync(process.execPath, [join(temp, 'consumer.mjs')], { cwd: temp, timeout: 15000 });
    const { rollup } = await import('rollup');
    const bundle = await rollup({ input: join(target, 'dist/browser.js'), external: ['@vkontakte/vk-bridge'] });
    try {
      const { output } = await bundle.generate({format:'es'});
      assert.ok(!/node:crypto|createHmac|VKWebAppInit/.test(output[0].code));
      assert.deepEqual(output[0].imports, ['@vkontakte/vk-bridge']);
    } finally { await bundle.close(); }
  } finally { rmSync(temp, {recursive:true,force:true}); }
});

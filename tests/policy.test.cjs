const { test } = require('node:test');
const assert = require('node:assert/strict');
const { TOOLS, isTool, isAllowedDocument, isExternalHttpUrl, mayUseHid } = require('../dist/policy.js');
const { HidChooser } = require('../dist/chooser.js');

test('documents require exact per-tool HTTPS origin', () => {
  for (const tool of Object.keys(TOOLS)) {
    const host = new URL(TOOLS[tool].url).host;
    assert.ok(isAllowedDocument(tool, `https://${host}/path?a=1#hash`));
    assert.ok(isAllowedDocument(tool, `https://${host}:443/`));
    for (const value of [`http://${host}/`, `https://${host}.evil.test/`,
      `https://evil.test/${host}`, `https://${host}@evil.test`, `https://user@${host}`,
      `https://${host}:8443/`, `https://sub.${host}/`, `https://${host}./`,
      'javascript:alert(1)', 'data:text/html,hello', 'file:///etc/passwd',
      `blob:https://${host}/id`, 'about:blank', '//usevia.app', 'broken',
      ...Object.entries(TOOLS).filter(([other]) => other !== tool).map(([, value]) => value.url)]) {
      assert.equal(isAllowedDocument(tool, value), false, value);
    }
  }
});

test('only literal tool identifiers and http(s) external URLs', () => {
  for (const value of ['via', 'vial', 'venom', 'wootility']) assert.ok(isTool(value));
  for (const value of ['__proto__', null, {}, 'VIA', '']) assert.equal(isTool(value), false);
  for (const value of ['https://docs.qmk.fm/', 'http://localhost/help']) assert.ok(isExternalHttpUrl(value));
  for (const value of ['mailto:a@b.com', 'file:///tmp/test', 'javascript:alert(1)', 'data:text/html,x', 'https://user:pass@example.com']) assert.equal(isExternalHttpUrl(value), false);
});

test('HID gate requires current contents, main frame, matching requesting URL AND origin', () => {
  for (const [tool, {url, origin}] of Object.entries(TOOLS)) {
    assert.ok(mayUseHid(tool, url, origin, true, true));
    assert.ok(mayUseHid(tool, url, `${origin}/`, true, true));
    for (const untrustedOrigin of [`${origin}/evil`, `${origin}/?query`, `${origin}/#hash`, 'https://evil.test']) {
      assert.equal(mayUseHid(tool, url, untrustedOrigin, true, true), false);
    }
    assert.equal(mayUseHid(tool, url, origin, false, true), false);
    assert.equal(mayUseHid(tool, url, origin, true, false), false);
    for (const [other, site] of Object.entries(TOOLS)) {
      if (tool === other) continue;
      assert.equal(mayUseHid(tool, site.url, origin, true, true), false);
      assert.equal(mayUseHid(tool, url, site.origin, true, true), false);
    }
  }
});

const device = (id) => ({deviceId:id, name:'Keyboard', vendorId:1, productId:2});
test('empty picker cancels once and never implicitly selects', () => {
  const chooser = new HidChooser(), calls = [];
  const state = chooser.begin([], id => calls.push(id));
  assert.equal(chooser.choose(state.token, 'missing'), false);
  assert.deepEqual(calls, []);
  assert.equal(chooser.cancel(state.token), true);
  assert.equal(chooser.cancel(state.token), false);
  assert.deepEqual(calls, [undefined]);
});
test('hotplug removes stale selections; explicit selection completes once', () => {
  const chooser = new HidChooser(), calls = [];
  const state = chooser.begin([device('a')], id => calls.push(id));
  chooser.remove('a');
  assert.equal(chooser.choose(state.token, 'a'), false);
  chooser.add(device('b'));
  assert.equal(chooser.choose(state.token, 'b'), true);
  assert.equal(chooser.choose(state.token, 'b'), false);
  assert.deepEqual(calls, ['b']);
});
test('replacement cancels previous request and rejects old UI tokens', () => {
  const chooser = new HidChooser(), calls = [];
  const old = chooser.begin([device('a')], id => calls.push(['old', id]));
  const next = chooser.begin([device('a')], id => calls.push(['new', id]));
  assert.deepEqual(calls, [['old', undefined]]);
  assert.equal(chooser.choose(old.token, 'a'), false);
  assert.equal(chooser.cancel(old.token), false);
  assert.equal(chooser.choose(next.token, 'a'), true);
  assert.deepEqual(calls, [['old', undefined], ['new', 'a']]);
});

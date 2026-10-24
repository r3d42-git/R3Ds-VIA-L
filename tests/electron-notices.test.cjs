const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync } = require('node:fs');
const { join } = require('node:path');
const { tmpdir } = require('node:os');
const helpers = import('../scripts/electron-notices.mjs');

function fixture(version, bootstrap) {
  const directory = mkdtempSync(join(tmpdir(), 'via-l-electron-notices-'));
  const packagePath = join(directory, 'package.json');
  writeFileSync(packagePath, JSON.stringify({ version }));
  const requireModule = name => {
    assert.equal(name, 'electron');
    bootstrap(directory);
    return join(directory, 'dist/Electron.app/Contents/MacOS/Electron');
  };
  requireModule.resolve = name => {
    assert.equal(name, 'electron/package.json');
    return packagePath;
  };
  return { directory, requireModule };
}

function writeNotices(directory) {
  mkdirSync(join(directory, 'dist'), { recursive: true });
  for (const name of ['LICENSE', 'LICENSES.chromium.html']) writeFileSync(join(directory, 'dist', name), name);
}

test('lazy Electron bootstrap runs before notice lookup on a fresh install', async () => {
  const { prepareElectronNotices } = await helpers;
  const { directory, requireModule } = fixture('45.0.0', directory => {
    assert.equal(existsSync(join(directory, 'dist')), false);
    writeNotices(directory);
  });
  try {
    assert.deepEqual(prepareElectronNotices('45.0.0', { requireModule }),
      ['LICENSE', 'LICENSES.chromium.html'].map(name => join(directory, 'dist', name)));
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('already installed Electron 44 notices remain supported', async () => {
  const { prepareElectronNotices } = await helpers;
  const { directory, requireModule } = fixture('44.0.0', () => {});
  try {
    writeNotices(directory);
    assert.equal(prepareElectronNotices('44.0.0', { requireModule }).length, 2);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('version mismatch fails before bootstrap and missing notices fail closed', async () => {
  const { prepareElectronNotices } = await helpers;
  let calls = 0;
  const { directory, requireModule } = fixture('45.0.0', () => { calls++; });
  try {
    assert.throws(() => prepareElectronNotices('44.0.0', { requireModule }), /does not match pinned version/);
    assert.equal(calls, 0);
    assert.throws(() => prepareElectronNotices('45.0.0', { requireModule }), /ENOENT/);
    assert.equal(calls, 1);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

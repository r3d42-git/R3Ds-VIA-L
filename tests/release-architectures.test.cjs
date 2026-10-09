const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, mkdirSync, writeFileSync, existsSync, rmSync } = require('node:fs');
const { join, resolve } = require('node:path');
const { tmpdir } = require('node:os');
const { createHash } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const helpers = import('../scripts/release-architectures.mjs');

test('architecture options reject unsupported, empty and duplicate values', async () => {
  const { architectureOption } = await helpers;
  assert.equal(architectureOption([]), undefined);
  assert.equal(architectureOption(['--arch=x64']), 'x64');
  for (const args of [['--arch=universal'], ['--arch='], ['--arch'], ['--arch=arm64', '--arch=x64']]) {
    assert.throws(() => architectureOption(args));
  }
});

test('verification maps Intel naming to Mach-O and rejects conflicting expectations', async () => {
  const { expectedArchitecture, machoArchitecture } = await helpers;
  assert.equal(machoArchitecture(expectedArchitecture('/tmp/VIA-L-1.2.3-macOS-x64.zip')), 'x86_64');
  assert.equal(machoArchitecture(expectedArchitecture('/tmp/VIA-L-1.2.3-macOS-arm64.zip')), 'arm64');
  assert.equal(expectedArchitecture('/tmp/download.zip', 'x64'), 'x64');
  assert.throws(() => expectedArchitecture('/tmp/download.zip'));
  assert.throws(() => expectedArchitecture('/tmp/VIA-L-1.2.3-macOS-x64.zip', 'arm64'));
});

test('default release contract isolates both apps, artifacts and notarization outputs', async () => {
  const { releaseArtifacts } = await helpers;
  const artifacts = releaseArtifacts('/tmp/release', '1.2.3');
  assert.deepEqual(artifacts.map(item => item.arch), ['arm64', 'x64']);
  for (const key of ['app', 'asset', 'submission', 'result']) assert.equal(new Set(artifacts.map(item => item[key])).size, 2);
  assert.equal(releaseArtifacts('/tmp/release', '1.2.3', ['x64']).length, 1);
});

test('publication refuses missing Intel artifact before any tag or release mutation', () => {
  const directory = mkdtempSync(join(tmpdir(), 'via-l-publish-test-'));
  try {
    const bin = join(directory, 'bin');
    mkdirSync(bin);
    writeFileSync(join(directory, 'package.json'), JSON.stringify({ version: '1.2.3' }));
    const out = join(directory, 'release/1.2.3');
    mkdirSync(out, { recursive: true });
    const asset = join(out, 'VIA-L-1.2.3-macOS-arm64.zip');
    writeFileSync(asset, 'fixture');
    writeFileSync(`${asset}.sha256`, `${createHash('sha256').update('fixture').digest('hex')}  VIA-L-1.2.3-macOS-arm64.zip\n`);
    const mutations = join(directory, 'mutations');
    const fixture = `#!${process.execPath}\nconst fs = require('node:fs');
const name = require('node:path').basename(process.argv[1]);
const args = process.argv.slice(2);
if (args.includes('tag') || args.includes('push') || (name === 'gh' && args.includes('create'))) fs.appendFileSync(${JSON.stringify(mutations)}, args.join(' '));
if (name === 'git') {
 if (args[0] === 'branch') console.log('main');
 if (args[0] === 'rev-parse') console.log('fixture-head');
 if (args[0] === 'ls-remote') console.log('fixture-head refs/heads/main');
 if (args[0] === 'remote') console.log('https://github.com/r3d42-git/R3Ds-VIA-L.git');
}
`;
    for (const name of ['git', 'node', 'gh']) writeFileSync(join(bin, name), fixture, { mode: 0o755 });
    const result = spawnSync(process.execPath, [resolve(__dirname, '../scripts/publish-release.mjs'), '--publish'], {
      cwd: directory, env: { ...process.env, PATH: `${bin}:${process.env.PATH}` }, encoding: 'utf8',
    });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /macOS-x64\.zip/);
    assert.equal(existsSync(mutations), false);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

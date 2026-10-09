import { execFileSync } from 'node:child_process';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join, basename, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { releaseArtifacts } from './release-architectures.mjs';

const run = (cmd, args) => execFileSync(cmd, args, { stdio: 'inherit' });
const output = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8' }).trim();
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const repo = 'r3d42-git/R3Ds-VIA-L';
const tag = `v${pkg.version}`;
const artifacts = releaseArtifacts(resolve('release', pkg.version), pkg.version);
const digest = file => createHash('sha256').update(readFileSync(file)).digest('hex');
if (output('git', ['branch', '--show-current']) !== 'main') throw new Error('Release branch must be main.');
if (output('git', ['status', '--porcelain'])) throw new Error('Commit the reviewed source first.');
const head = output('git', ['rev-parse', 'HEAD']);
const remote = output('git', ['ls-remote', 'origin', 'refs/heads/main']).split(/\s/)[0];
if (remote !== head) throw new Error('origin/main must match the reviewed local commit.');
const origin = output('git', ['remote', 'get-url', 'origin']);
if (!['https://github.com/r3d42-git/R3Ds-VIA-L.git', 'git@github.com:r3d42-git/R3Ds-VIA-L.git'].includes(origin)) throw new Error('Unexpected origin.');
for (const { asset } of artifacts) {
  if (readFileSync(`${asset}.sha256`, 'utf8') !== `${digest(asset)}  ${basename(asset)}\n`) throw new Error(`Checksum mismatch: ${asset}`);
  run('node', ['scripts/verify-release.mjs', asset]);
}
const checks = JSON.parse(output('gh', ['api', `repos/${repo}/commits/${head}/check-runs`]));
if (!checks.check_runs.some(check => check.name === 'test' && check.conclusion === 'success')) throw new Error('The exact commit needs a successful CI test check.');
if (process.argv.includes('--dry-run')) { console.log(`Ready: ${tag} at ${head}, ${artifacts.map(({ asset }) => basename(asset)).join(', ')}`); process.exit(0); }
if (!process.argv.includes('--publish')) throw new Error('Use --dry-run or --publish.');
run('git', ['tag', '-a', tag, '-m', `R3Ds VIA-L ${pkg.version}`]);
run('git', ['push', 'origin', tag]);
run('gh', ['release', 'create', tag, ...artifacts.flatMap(({ asset }) => [asset, `${asset}.sha256`]), '--repo', repo, '--verify-tag', '--title', `R3Ds VIA-L ${pkg.version}`, '--notes-file', 'RELEASE_NOTES.md']);
const temp = mkdtempSync(join(tmpdir(), 'via-l-public-'));
try {
  const release = JSON.parse(output('gh', ['api', `repos/${repo}/releases/tags/${tag}`]));
  for (const { asset } of artifacts) {
    run('gh', ['release', 'download', tag, '--repo', repo, '--pattern', basename(asset), '--pattern', `${basename(asset)}.sha256`, '--dir', temp]);
    const downloaded = join(temp, basename(asset));
    if (digest(downloaded) !== digest(asset)) throw new Error('Public download differs from local asset.');
    if (readFileSync(`${downloaded}.sha256`, 'utf8') !== `${digest(downloaded)}  ${basename(downloaded)}\n`) throw new Error('Public checksum mismatch.');
    const metadata = release.assets.find(entry => entry.name === basename(asset));
    if (metadata?.digest !== `sha256:${digest(asset)}`) throw new Error('GitHub digest mismatch.');
    const checksumMetadata = release.assets.find(entry => entry.name === `${basename(asset)}.sha256`);
    if (checksumMetadata?.digest !== `sha256:${digest(`${downloaded}.sha256`)}`) throw new Error('GitHub checksum-file digest mismatch.');
    run('node', ['scripts/verify-release.mjs', downloaded]);
    console.log(`Verified public download: ${metadata.browser_download_url}`);
  }
} finally { rmSync(temp, { recursive: true, force: true }); }

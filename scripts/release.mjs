import { execFileSync } from 'node:child_process';
import { readFileSync, mkdirSync, existsSync, writeFileSync } from 'node:fs';
import { resolve, basename, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { architectureOption, releaseArtifacts } from './release-architectures.mjs';

const run = (cmd, args) => execFileSync(cmd, args, { stdio: 'inherit' });
const selected = architectureOption(process.argv.slice(2));
if (process.platform !== 'darwin') throw new Error('This release profile requires macOS.');
if (!process.env.SIGNING_IDENTITY) throw new Error('Set SIGNING_IDENTITY to an installed Developer ID identity.');
const profile = process.env.NOTARY_PROFILE || 'VIA-L';
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const out = resolve('release', pkg.version);
const artifacts = releaseArtifacts(out, pkg.version, selected ? [selected] : undefined);
for (const artifact of artifacts) {
  for (const path of [artifact.asset, `${artifact.asset}.sha256`, dirname(artifact.app), artifact.submission, artifact.result]) {
    if (existsSync(path)) throw new Error(`Release output already exists; preserve it before retrying: ${path}`);
  }
}
mkdirSync(out, { recursive: true });
run('npm', ['test']);
for (const { arch, app, asset, submission, result: resultPath } of artifacts) {
  console.log(`Building ${arch}`);
  run('node', ['scripts/package.mjs', `--out=${out}`, `--arch=${arch}`, '--signed']);
  run('codesign', ['--verify', '--deep', '--strict', app]);
  run('ditto', ['-c', '-k', '--keepParent', app, submission]);
  const response = execFileSync('xcrun', ['notarytool', 'submit', submission, '--keychain-profile', profile, '--wait', '--output-format', 'json'], { encoding: 'utf8' });
  writeFileSync(resultPath, response);
  const result = JSON.parse(response);
  console.log(JSON.stringify(result, null, 2));
  if (result.status !== 'Accepted') throw new Error(`Notarization ${result.status}; inspect notarytool log ${result.id}.`);
  run('xcrun', ['stapler', 'staple', app]);
  run('xcrun', ['stapler', 'validate', app]);
  run('ditto', ['-c', '-k', '--keepParent', app, asset]);
  run('node', ['scripts/verify-release.mjs', asset]);
  const digest = createHash('sha256').update(readFileSync(asset)).digest('hex');
  writeFileSync(`${asset}.sha256`, `${digest}  ${basename(asset)}\n`);
  console.log(`Verified release: ${asset}`);
}

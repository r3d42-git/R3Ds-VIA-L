import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';

const run = (cmd, args) => execFileSync(cmd, args, { stdio: 'inherit' });
const asset = resolve(process.argv[2] || '');
if (!asset.endsWith('.zip')) throw new Error('Pass the final release ZIP.');
const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const temporary = mkdtempSync(join(tmpdir(), 'via-l-verify-'));
try {
  run('unzip', ['-tq', asset]);
  run('ditto', ['-xk', asset, temporary]);
  const app = join(temporary, 'VIA-L.app');
  const plist = join(app, 'Contents/Info.plist');
  const value = key => execFileSync('/usr/libexec/PlistBuddy', ['-c', `Print :${key}`, plist], { encoding: 'utf8' }).trim();
  if (value('CFBundleIdentifier') !== 'io.github.r3d42-git.via-l' || value('CFBundleShortVersionString') !== pkg.version) throw new Error('Bundle identity/version mismatch');
  run('codesign', ['--verify', '--deep', '--strict', '--verbose=2', app]);
  const signature = spawnSync('codesign', ['-dv', '--verbose=4', app], { encoding: 'utf8' });
  if (signature.status !== 0 || !signature.stderr.includes('Authority=Developer ID Application:') || !/flags=.*runtime/.test(signature.stderr)) throw new Error('Developer ID and Hardened Runtime are required.');
  console.log(signature.stderr);
  run('xcrun', ['stapler', 'validate', app]);
  run('spctl', ['--assess', '--type', 'execute', '--verbose=2', app]);
  const arch = execFileSync('lipo', ['-archs', join(app, 'Contents/MacOS/VIA-L')], { encoding: 'utf8' }).trim();
  if (arch !== 'arm64') throw new Error(`Unexpected architecture ${arch}`);
  console.log(`SHA256 ${createHash('sha256').update(readFileSync(asset)).digest('hex')}`);
} finally { rmSync(temporary, { recursive: true, force: true }); }

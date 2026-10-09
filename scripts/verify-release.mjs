import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, readFileSync, readdirSync, openSync, readSync, closeSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { architectureOption, expectedArchitecture, machoArchitecture } from './release-architectures.mjs';

const run = (cmd, args) => execFileSync(cmd, args, { stdio: 'inherit' });
const asset = resolve(process.argv[2] || '');
if (!asset.endsWith('.zip')) throw new Error('Pass the final release ZIP.');
const expected = machoArchitecture(expectedArchitecture(asset, architectureOption(process.argv.slice(3))));
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
  const required = [
    join(app, 'Contents/MacOS/VIA-L'),
    join(app, 'Contents/Frameworks/Electron Framework.framework/Versions/A/Electron Framework'),
    ...['', ' (GPU)', ' (Renderer)', ' (Plugin)'].map(suffix => join(app, `Contents/Frameworks/VIA-L Helper${suffix}.app/Contents/MacOS/VIA-L Helper${suffix}`)),
  ];
  const verified = new Set();
  const verifyBinary = path => {
    const arch = execFileSync('lipo', ['-archs', path], { encoding: 'utf8' }).trim();
    if (arch !== expected) throw new Error(`Unexpected architecture ${arch} in ${path}; expected ${expected}.`);
    verified.add(path);
  };
  for (const path of required) {
    if (!existsSync(path)) throw new Error(`Required executable missing: ${path}`);
    verifyBinary(path);
  }
  // Check actual files, skipping framework aliases, and include nested helper libraries.
  const inspect = directory => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) inspect(path);
      else if (entry.isFile() && !verified.has(path)) {
        const header = Buffer.alloc(4);
        const descriptor = openSync(path, 'r');
        try { readSync(descriptor, header, 0, 4, 0); } finally { closeSync(descriptor); }
        if (['feedface', 'cefaedfe', 'feedfacf', 'cffaedfe', 'cafebabe', 'bebafeca', 'cafebabf', 'bfbafeca'].includes(header.toString('hex'))) verifyBinary(path);
      }
    }
  };
  inspect(join(app, 'Contents/MacOS'));
  inspect(join(app, 'Contents/Frameworks'));
  console.log(`Verified ${verified.size} Mach-O files: ${expected}`);
  console.log(`SHA256 ${createHash('sha256').update(readFileSync(asset)).digest('hex')}`);
} finally { rmSync(temporary, { recursive: true, force: true }); }

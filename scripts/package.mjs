import { packager } from '@electron/packager';
import { readFileSync, mkdirSync, cpSync, mkdtempSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';

if (process.platform !== 'darwin') throw new Error('macOS-Paketierung bitte auf macOS ausführen.');
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const outArg = process.argv.slice(2).find(value => value.startsWith('--out='));
const out = resolve(outArg ? outArg.slice(6) : 'release');
const signed = process.argv.includes('--signed');
if (signed && !process.env.SIGNING_IDENTITY) throw new Error('SIGNING_IDENTITY is required.');
// Explicit input allowlist: no private notes, profiles, credentials or test data.
const staging = mkdtempSync(join(tmpdir(), 'via-l-package-'));
try {
  for (const file of ['package.json', 'LICENSE', 'THIRD_PARTY_NOTICES.md', 'dist']) {
    cpSync(file, join(staging, file), { recursive: true });
  }
  mkdirSync(out, { recursive: true });
  const paths = await packager({
    dir: staging, out, name: pkg.productName,
    platform: 'darwin', arch: process.arch,
    electronVersion: pkg.devDependencies.electron,
    appBundleId: 'io.github.r3d42-git.via-l',
    appCategoryType: 'public.app-category.utilities',
    appCopyright: 'Copyright © 2026 r3d42-git',
    icon: resolve('assets/AppIcon.icns'),
    extraResource: [resolve('node_modules/electron/dist/LICENSE'), resolve('node_modules/electron/dist/LICENSES.chromium.html')],
    asar: true, overwrite: true, prune: true,
    osxSign: signed ? {
      identity: process.env.SIGNING_IDENTITY,
      hardenedRuntime: true,
      preAutoEntitlements: false,
      optionsForFile: () => ({ entitlements: resolve('assets/entitlements.plist'), hardenedRuntime: true }),
    } : false,
  });
  console.log(signed ? 'Developer ID signed app:' : 'Local development app (not notarized):');
  paths.forEach(path => console.log(path));
} finally { rmSync(staging, { recursive: true, force: true }); }

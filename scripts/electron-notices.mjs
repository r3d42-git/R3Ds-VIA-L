import { createRequire } from 'node:module';
import { readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);

export function prepareElectronNotices(expectedVersion, { requireModule = require } = {}) {
  const packagePath = requireModule.resolve('electron/package.json');
  const { version } = JSON.parse(readFileSync(packagePath, 'utf8'));
  if (version !== expectedVersion) {
    throw new Error(`Installed Electron ${version} does not match pinned version ${expectedVersion}. Run npm ci.`);
  }

  // Electron 45 installs dist lazily on require; Electron 44 already has it.
  // This resolves/downloads the installed binary without launching it. Packager
  // independently selects the target architecture, so do not pass arch here.
  requireModule('electron');
  return ['LICENSE', 'LICENSES.chromium.html'].map(name => {
    const path = join(dirname(packagePath), 'dist', name);
    if (!statSync(path).isFile()) throw new Error(`Missing Electron notice file: ${path}`);
    return path;
  });
}

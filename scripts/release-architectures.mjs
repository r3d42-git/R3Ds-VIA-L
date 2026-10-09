import { basename, join } from 'node:path';

export const architectures = Object.freeze(['arm64', 'x64']);

export function validateArchitecture(arch) {
  if (!architectures.includes(arch)) throw new Error(`Unsupported architecture ${arch}; use arm64 or x64.`);
  return arch;
}

export function architectureOption(args) {
  const options = args.filter(arg => arg === '--arch' || arg.startsWith('--arch='));
  if (options.length > 1) throw new Error('Pass --arch only once.');
  if (!options.length) return undefined;
  return validateArchitecture(options[0].slice('--arch='.length));
}

export function releaseArtifacts(out, version, selected = architectures) {
  return selected.map(arch => ({
    arch: validateArchitecture(arch),
    app: join(out, `VIA-L-darwin-${arch}`, 'VIA-L.app'),
    asset: join(out, `VIA-L-${version}-macOS-${arch}.zip`),
    submission: join(out, `notary-submission-${arch}.zip`),
    result: join(out, `notary-result-${arch}.json`),
  }));
}

export function expectedArchitecture(asset, explicit) {
  const match = /^VIA-L-.+-macOS-(arm64|x64)\.zip$/.exec(basename(asset));
  if (explicit !== undefined) validateArchitecture(explicit);
  if (match && explicit && match[1] !== explicit) throw new Error('Filename and --arch disagree.');
  if (!match && !explicit) throw new Error('Use a canonical release filename or pass --arch=arm64|x64.');
  return explicit || match[1];
}

export function machoArchitecture(arch) {
  return validateArchitecture(arch) === 'x64' ? 'x86_64' : 'arm64';
}

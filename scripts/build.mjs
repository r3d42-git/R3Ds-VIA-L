import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

const root = join(import.meta.dirname, '..');
// Only freshly generated output may enter a distributable app.
rmSync(join(root, 'dist'), { recursive: true, force: true });
execFileSync(join(root, 'node_modules', '.bin', 'tsc'), ['-p', join(root, 'tsconfig.json')], { cwd: root, stdio: 'inherit' });
execFileSync(join(root, 'node_modules', '.bin', 'tsc'), ['-p', join(root, 'tsconfig.renderer.json')], { cwd: root, stdio: 'inherit' });
mkdirSync(join(root, 'dist'), { recursive: true });
cpSync(join(root, 'src', 'index.html'), join(root, 'dist', 'index.html'));
cpSync(join(root, 'src', 'styles.css'), join(root, 'dist', 'styles.css'));
cpSync(join(root, 'assets', 'AppIcon.png'), join(root, 'dist', 'AppIcon.png'));

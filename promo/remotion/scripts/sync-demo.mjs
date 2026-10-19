import { cp, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// scripts/ -> remotion/ -> promo/ -> repository root
const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..', '..', '..');
const source = join(repo, 'docs', 'demo');
const target = join(here, '..', 'public', 'demo');

await mkdir(target, { recursive: true });
for (const mode of ['compact', 'standard', 'detailed', 'verbose']) {
  for (const ext of ['mp4', 'jpg']) {
    await cp(join(source, `${mode}.${ext}`), join(target, `${mode}.${ext}`));
  }
}
console.log('Copied four mode videos and posters into public/demo.');

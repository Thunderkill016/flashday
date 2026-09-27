// Syntax-checks every JS/MJS source, page glue and test file.
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

const roots = ['src', 'login', 'auth', 'public', 'tests', 'scripts'];
const files = ['product-bootstrap.js', 'vite.config.mjs'];

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(path);
    else if (/\.(js|mjs)$/.test(entry.name)) files.push(path);
  }
}
for (const root of roots) walk(root);

for (const file of files) {
  execFileSync(process.execPath, ['--check', file], { stdio: 'inherit' });
}
console.log(`typecheck: ${files.length} files OK`);

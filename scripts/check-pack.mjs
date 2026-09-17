import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';

const root = process.cwd();
const work = mkdtempSync(path.join(tmpdir(), 'react-use-reactive-pack-'));
const expectedFiles = ['package.json', 'index.js', 'index.d.ts', 'README.md', 'LICENSE'];

try {
  const packOut = execFileSync('npm', ['pack', '--json', '--pack-destination', work], {
    cwd: root,
    encoding: 'utf8',
  });
  const [result] = JSON.parse(packOut);
  if (!result?.filename) {
    throw new Error('npm pack --json did not report a filename');
  }

  const packedFiles = result.files.map((f) => f.path);
  const unexpected = packedFiles.filter((f) => !expectedFiles.includes(f));
  const missing = expectedFiles.filter((f) => !packedFiles.includes(f));
  if (unexpected.length > 0) {
    throw new Error(`unexpected files in package: ${unexpected.join(', ')}`);
  }
  if (missing.length > 0) {
    throw new Error(`missing published files: ${missing.join(', ')}`);
  }

  execFileSync('tar', ['-xzf', path.join(work, result.filename), '-C', work], { stdio: 'inherit' });

  const publishedEntry = readFileSync(path.join(work, 'package', 'index.js'), 'utf8');
  if (!publishedEntry.startsWith("'use client';")) {
    throw new Error("packed index.js must declare the 'use client' directive");
  }
  console.log("packed entry retains the 'use client' directive");

  const consumer = path.join(work, 'consumer');
  const consumerNodeModules = path.join(consumer, 'node_modules');
  mkdirSync(consumerNodeModules, { recursive: true });
  symlinkSync(path.join(root, 'node_modules/react'), path.join(consumerNodeModules, 'react'), 'dir');
  cpSync(path.join(work, 'package'), path.join(consumerNodeModules, 'react-use-reactive'), {
    recursive: true,
  });

  writeFileSync(
    path.join(consumer, 'check.mjs'),
    `import useReactive from 'react-use-reactive';
if (typeof useReactive !== 'function') {
  throw new Error('package entry does not export a function');
}
console.log('package entry import ok');
`
  );
  execFileSync('node', ['check.mjs'], { cwd: consumer, stdio: 'inherit' });

  console.log(`pack contents (${packedFiles.length} files): ${packedFiles.join(', ')}`);
} finally {
  rmSync(work, { recursive: true, force: true });
}
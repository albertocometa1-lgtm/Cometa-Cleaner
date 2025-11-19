import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { getBuildHash } from './get-build-hash.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const swPath = join(__dirname, '..', 'dist', 'service-worker.js');
const hash = getBuildHash();

try {
  const sw = await readFile(swPath, 'utf8');
  await writeFile(swPath, sw.replace(/__BUILD_HASH__/g, hash), 'utf8');
} catch (err) {
  console.warn('Unable to post-process service worker:', err);
}

const manifestPath = join(__dirname, '..', 'dist', 'build-meta.json');
await writeFile(manifestPath, JSON.stringify({ buildHash: hash, generatedAt: new Date().toISOString() }, null, 2));

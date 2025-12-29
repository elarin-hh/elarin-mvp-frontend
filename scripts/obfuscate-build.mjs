import { promises as fs } from 'node:fs';
import path from 'node:path';
import obfuscator from 'javascript-obfuscator';
import obfuscatorConfig from '../obfuscator.config.js';

const { obfuscate } = obfuscator;

const rootDir = process.cwd();
const buildDir = path.join(rootDir, 'build');
const appDir = path.join(buildDir, '_app', 'immutable');
const targetDirs = [
  path.join(appDir, 'entry'),
  path.join(appDir, 'nodes'),
  path.join(appDir, 'chunks')
];

const skipFilePatterns = [
  /service-worker\.js$/i,
  /sw\.js$/i,
  /workbox-.*\.js$/i,
  /vendor\..*\.js$/i
];

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function walk(dir, files) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(fullPath, files);
      continue;
    }
    if (entry.isFile() && fullPath.endsWith('.js')) {
      files.push(fullPath);
    }
  }
}

function shouldSkip(filePath) {
  const normalizedPath = filePath.replace(/\\/g, '/');
  return skipFilePatterns.some((pattern) => pattern.test(normalizedPath));
}

async function main() {
  if (!(await exists(buildDir))) {
    console.error(`Build directory not found: ${buildDir}`);
    process.exit(1);
  }

  const files = [];
  for (const dir of targetDirs) {
    if (await exists(dir)) {
      await walk(dir, files);
    }
  }

  const targets = files.filter((file) => !shouldSkip(file));
  if (targets.length === 0) {
    console.log('No JS files found to obfuscate.');
    return;
  }

  console.log(`Obfuscating ${targets.length} files...`);
  for (const file of targets) {
    const code = await fs.readFile(file, 'utf8');
    const result = obfuscate(code, obfuscatorConfig);
    await fs.writeFile(file, result.getObfuscatedCode(), 'utf8');
  }

  console.log('Obfuscation complete.');
}

main().catch((error) => {
  console.error('Obfuscation failed:', error);
  process.exit(1);
});

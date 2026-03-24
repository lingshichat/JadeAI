import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const ENV_LOCAL = path.join(ROOT, '.env.local');
const ENV = path.join(ROOT, '.env');
const ENV_EXAMPLE = path.join(ROOT, '.env.example');
const DATA_DIR = path.join(ROOT, 'data');

function log(message) {
  console.log(`[jadeai] ${message}`);
}

function ensureEnvFile() {
  if (fs.existsSync(ENV_LOCAL) || fs.existsSync(ENV)) {
    return;
  }

  fs.copyFileSync(ENV_EXAMPLE, ENV_LOCAL);
  log('Created .env.local from .env.example');
}

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function startDevStack() {
  const command = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
  const child = spawn(command, ['dev:stack'], {
    cwd: ROOT,
    env: process.env,
    stdio: 'inherit',
  });

  child.on('error', (error) => {
    console.error('[jadeai] Failed to start local dev stack:', error);
    process.exit(1);
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code ?? 0);
  });
}

function main() {
  ensureEnvFile();
  ensureDataDir();

  log('Starting local dev stack on http://localhost:3000');
  log('Database migrations and demo data will be prepared automatically on first launch');

  if (process.env.JADEAI_SKIP_START === '1') {
    log('Bootstrap complete; skipped starting services because JADEAI_SKIP_START=1');
    return;
  }

  startDevStack();
}

main();

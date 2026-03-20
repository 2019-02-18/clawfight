import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import type { Lobster } from './types.js';

const MEMORY_DIR = join(process.cwd(), 'memory', 'clawfight');

async function ensureDir(dir: string): Promise<void> {
  try {
    await access(dir);
  } catch {
    await mkdir(dir, { recursive: true });
  }
}

function getPath(filename: string): string {
  return join(MEMORY_DIR, filename);
}

export async function readLobster(): Promise<Lobster | null> {
  try {
    const data = await readFile(getPath('lobster.json'), 'utf-8');
    return JSON.parse(data) as Lobster;
  } catch {
    return null;
  }
}

export async function writeLobster(lobster: Lobster): Promise<void> {
  await ensureDir(MEMORY_DIR);
  await writeFile(getPath('lobster.json'), JSON.stringify(lobster, null, 2), 'utf-8');
}

export async function readSoul(): Promise<string | null> {
  try {
    return await readFile(getPath('soul.md'), 'utf-8');
  } catch {
    return null;
  }
}

export async function writeSoul(content: string): Promise<void> {
  await ensureDir(MEMORY_DIR);
  await writeFile(getPath('soul.md'), content, 'utf-8');
}

export async function appendLog(entry: string): Promise<void> {
  await ensureDir(MEMORY_DIR);
  const logPath = getPath('log.md');
  let existing = '';
  try {
    existing = await readFile(logPath, 'utf-8');
  } catch { /* file doesn't exist yet */ }

  const timestamp = new Date().toISOString();
  const line = `\n### ${timestamp}\n${entry}\n`;
  await writeFile(logPath, existing + line, 'utf-8');
}

export async function hasLobster(): Promise<boolean> {
  const lobster = await readLobster();
  return lobster !== null;
}

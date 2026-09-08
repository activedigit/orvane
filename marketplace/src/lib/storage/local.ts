import 'server-only';
import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '@/lib/config';
import type { StorageProvider } from './provider';

const root = () => path.resolve(process.cwd(), config.storage.localDir);

function safe(p: string) {
  const full = path.resolve(root(), p);
  if (!full.startsWith(root())) throw new Error('invalid storage path');
  return full;
}

export const localStorageProvider: StorageProvider = {
  name: 'local',
  async put(p, data) {
    const full = safe(p);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, data);
  },
  async get(p) {
    try {
      return await fs.readFile(safe(p));
    } catch {
      return null;
    }
  },
  async remove(p) {
    await fs.rm(safe(p), { force: true });
  },
};

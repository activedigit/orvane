import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

// Load .env.local first (Next.js convention), then .env as fallback.
for (const name of ['.env.local', '.env']) {
  const p = path.join(process.cwd(), name);
  if (fs.existsSync(p)) dotenv.config({ path: p });
}

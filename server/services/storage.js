import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

export async function ensureDir(dirPath) {
  await fs.promises.mkdir(dirPath, { recursive: true });
}

export function getUploadsRootAbs() {
  return path.resolve(ROOT, UPLOAD_DIR);
}

export async function savePLFile(plId, filename, buffer) {
  const dir = path.join(getUploadsRootAbs(), 'pl', String(plId));
  await ensureDir(dir);
  const ts = Date.now();
  const safe = (filename || 'file').replace(/[^\w.\-]/g, '_');
  const stored = `${ts}__${safe}`;
  const abs = path.join(dir, stored);
  await fs.promises.writeFile(abs, buffer);
  return { relative: `/uploads/pl/${plId}/${stored}`, absPath: abs };
}
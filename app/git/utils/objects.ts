import * as fs from 'fs';
import * as path from 'path';
import crypto from 'crypto';
import zlib from 'zlib';

export type GitObjectType = 'blob' | 'tree' | 'commit';

export function splitHash(hash: string): { dir: string; file: string } {
  return { dir: hash.slice(0, 2), file: hash.slice(2) };
}

export function objectPathFromHash(hash: string): string {
  const { dir, file } = splitHash(hash);
  return path.join(process.cwd(), '.git', 'objects', dir, file);
}

export function computeObject(type: GitObjectType, body: Buffer): { hash: string; storeData: Buffer } {
  const header = `${type} ${body.length}\x00`;
  const storeData = Buffer.concat([Buffer.from(header), body]);
  const hash = crypto.createHash('sha1').update(storeData).digest('hex');
  return { hash, storeData };
}

export function writeObject(type: GitObjectType, body: Buffer): string {
  const { hash, storeData } = computeObject(type, body);
  const { dir, file } = splitHash(hash);
  const objectsDir = path.join(process.cwd(), '.git', 'objects', dir);
  if (!fs.existsSync(objectsDir)) fs.mkdirSync(objectsDir, { recursive: true });
  const objPath = path.join(objectsDir, file);
  if (!fs.existsSync(objPath)) {
    const compressed = zlib.deflateSync(storeData);
    fs.writeFileSync(objPath, compressed);
  }
  return hash;
}

export function createBlobFromFile(filePath: string, write: boolean = true): string {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    throw new Error(`cannot open '${filePath}': No such file`);
  }
  const data = fs.readFileSync(filePath);
  if (write) {
    return writeObject('blob', data);
  } else {
    return computeObject('blob', data).hash;
  }
}

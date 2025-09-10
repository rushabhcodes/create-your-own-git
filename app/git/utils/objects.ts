import * as fs from 'fs';
import * as path from 'path';
import crypto from 'crypto';
import zlib from 'zlib';

export type GitObjectType = 'blob' | 'tree' | 'commit';

export function computeObject(type: GitObjectType, body: Buffer): { hash: string; storeData: Buffer } {
    const header = `${type} ${body.length}\x00`;
    const storeData = Buffer.concat([Buffer.from(header), body]);
    const hash = crypto.createHash('sha1').update(storeData).digest('hex');
    return { hash, storeData };
}


export function createObjectFromHash(hash: string, data: Buffer): void {
    const dir = hash.slice(0, 2);
    const file = hash.slice(2);
    const objectDir = path.join(process.cwd(), '.git', 'objects', dir);
    if (!fs.existsSync(objectDir)) fs.mkdirSync(objectDir, { recursive: true });
    const objectPath = path.join(objectDir, file);
    if (!fs.existsSync(objectPath)) {
        const compressed = zlib.deflateSync(data);
        fs.writeFileSync(objectPath, compressed);
    }
}

export function writeObject(type: GitObjectType, body: Buffer): string {
    const { hash, storeData } = computeObject(type, body);
    createObjectFromHash(hash, storeData);
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

export function readObject(hash: string): { type: GitObjectType; size: number; body: Buffer } {
    const dir = hash.slice(0, 2);
    const file = hash.slice(2);
    const p = path.join(process.cwd(), '.git', 'objects', dir, file);
    if (!fs.existsSync(p)) {
        throw new Error(`Not a valid object name ${hash}`);
    }
    const compressed = fs.readFileSync(p);
    const buf = zlib.inflateSync(compressed);
    const nulIdx = buf.indexOf(0x00);
    if (nulIdx === -1) {
        throw new Error(`Corrupt object ${hash}: missing header terminator`);
    }
    const header = buf.slice(0, nulIdx).toString('utf8');
    const [type, sizeStr] = header.split(' ');
    const size = parseInt(sizeStr, 10);
    const body = buf.slice(nulIdx + 1);
    if (body.length !== size) {
        throw new Error(`Corrupt object ${hash}: size mismatch`);
    }
    return { type: type as GitObjectType, size, body };
}

export type TreeEntry = { mode: string; type: 'tree' | 'blob'; hash: string; name: string };

/*
 * Parse a Git tree object body.
 *
 * Tree body layout (repeated for each entry):
 *   <mode ASCII> 0x20 <name UTF-8> 0x00 <20-byte raw SHA1>
 * 
 */

export function parseTreeEntries(body: Buffer): TreeEntry[] {
    const entries: TreeEntry[] = [];
    let offset = 0;
    while (offset < body.length) {
        const spaceIdx = body.indexOf(0x20, offset);
        if (spaceIdx === -1) throw new Error('corrupt tree (unterminated mode)');
    let mode = body.slice(offset, spaceIdx).toString('utf8');
    mode = mode.padStart(6, '0'); // normalize e.g., 40000 -> 040000

        const nullIdx = body.indexOf(0x00, spaceIdx + 1);
        if (nullIdx === -1) throw new Error('corrupt tree (unterminated name)');
        const name = body.slice(spaceIdx + 1, nullIdx).toString('utf8');

        const shaStart = nullIdx + 1;
        const shaEnd = shaStart + 20;
        if (shaEnd > body.length) throw new Error('corrupt tree (truncated sha1)');
        const hash = body.slice(shaStart, shaEnd).toString('hex');

        const entryType: 'tree' | 'blob' = mode.startsWith('04') ? 'tree' : 'blob';
        entries.push({ mode, type: entryType, hash, name });

        offset = shaEnd;
    }
    return entries;
}


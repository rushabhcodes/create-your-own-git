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


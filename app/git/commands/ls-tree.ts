import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

export default class LsTreeCommand {
    private flag: string;
    private objectHash: string;

    constructor(args: string[]) {
        this.flag = args.includes('--name-only') ? '--name-only' : '';
        this.objectHash = '';
        for (let i = 1; i < args.length; i++) {
            const a = args[i];
            if (!a.startsWith('-')) { this.objectHash = a; break; }
        }
    }

    execute(): void {
        if (!this.objectHash) {
            console.error('usage: git ls-tree [--name-only] <tree-ish>');
            process.exitCode = 1; return;
        }
        if (this.objectHash.length < 4 || /[^0-9a-f]/i.test(this.objectHash)) {
            console.error(`fatal: Not a valid object name ${this.objectHash}`);
            process.exitCode = 1; return;
        }
        if (this.flag && this.flag !== '--name-only') {
            console.error(`fatal: unknown option ${this.flag}`);
            process.exitCode = 1; return;
        }

        // Resolve commit -> tree if needed
        const resolvedTreeHash = this.resolveTreeish(this.objectHash);
        if (!resolvedTreeHash) return; // error already printed

        const treeObj = this.readObject(resolvedTreeHash);
        if (!treeObj) return; // error printed
        if (treeObj.type !== 'tree') {
            console.error(`fatal: object ${resolvedTreeHash} is not a tree`);
            process.exitCode = 1; return;
        }

        const entries = this.parseTreeEntries(treeObj.body, resolvedTreeHash);
        if (!entries) return; // error printed

        const nameOnly = this.flag === '--name-only';
        for (const e of entries) {
            if (nameOnly) {
                process.stdout.write(e.name + '\n');
            } else {
                process.stdout.write(`${e.mode} ${e.type} ${e.hash}\t${e.name}\n`);
            }
        }
    }

    // --- Helpers ---


    private readObject(hash: string): { type: string; size: number; body: Buffer } | null {
        const p = path.join(process.cwd(), '.git', 'objects', hash.slice(0,2), hash.slice(2));
        if (!fs.existsSync(p)) {
            console.error(`fatal: Not a valid object name ${hash}`);
            process.exitCode = 1; return null;
        }
        try {
            const compressed = fs.readFileSync(p);
            const buf = zlib.inflateSync(compressed);
            const nulIdx = buf.indexOf(0x00);
            if (nulIdx === -1) {
                this.corrupt(hash, 'no header'); return null;
            }
            const header = buf.slice(0, nulIdx).toString('utf8');
            const [type, sizeStr] = header.split(' ');
            const size = parseInt(sizeStr, 10);
            const body = buf.slice(nulIdx + 1);
            
            if (body.length !== size) {
                this.corrupt(hash, 'size mismatch'); return null;
            }
            return { type, size, body };

        } catch (e: any) {
            console.error(`fatal: error reading object ${hash}: ${e.message || e}`);
            process.exitCode = 1; return null;
        }
    }

    private resolveTreeish(hash: string): string | null {
        const obj = this.readObject(hash);
        if (!obj) return null;
        if (obj.type === 'tree') return hash;
        if (obj.type === 'commit') {
            // Parse commit body for leading header lines until blank
            const text = obj.body.toString('utf8');
            const lines = text.split('\n');
            for (const line of lines) {
                
                if (line.startsWith('tree ')) return line.slice(5).trim();
                if (line === '') break; // end of headers
            }
            console.error(`fatal: commit ${hash} missing tree`);
            process.exitCode = 1; return null;
        }
        console.error(`fatal: object ${hash} is not a tree or commit`);
        process.exitCode = 1; return null;
    }

    private parseTreeEntries(body: Buffer, treeHash: string): Array<{mode:string; type:string; hash:string; name:string}> | null {
        const entries: Array<{mode:string; type:string; hash:string; name:string}> = [];
        let offset = 0;

        // Each entry: <mode> <name>\0<20-byte SHA-1>

        while (offset < body.length) {
            // mode ends at the first space (0x20)
            const spaceIdx = body.indexOf(0x20, offset);
            if (spaceIdx === -1) { this.corrupt(treeHash, 'unterminated mode'); return null; }
            let mode = body.slice(offset, spaceIdx).toString('utf8');
            mode = mode.padStart(6, "0"); // normalize e.g. 40000 -> 040000

            // name ends at the next NUL (0x00)
            const nullIdx = body.indexOf(0x00, spaceIdx + 1);
            if (nullIdx === -1) { this.corrupt(treeHash, 'unterminated name'); return null; }
            const name = body.slice(spaceIdx + 1, nullIdx).toString('utf8');

            // next 20 bytes are the raw SHA-1
            const shaStart = nullIdx + 1;
            const shaEnd = shaStart + 20;
            if (shaEnd > body.length) { this.corrupt(treeHash, 'truncated sha1'); return null; }
            const hash = body.slice(shaStart, shaEnd).toString('hex');

            const entryType = mode.startsWith('04') ? 'tree' : 'blob';

            entries.push({ mode, type: entryType, hash, name });

            offset = shaEnd;
        }

        return entries;
    }

    private corrupt(treeHash: string, reason: string) {
        console.error(`fatal: corrupt tree ${treeHash} (${reason})`);
        process.exitCode = 1;
    }
}
import * as fs from 'fs';
import * as path from 'path';
import zlib from 'zlib';
import crypto from 'crypto';

export default class HashObjectCommand {
    private writeFlag: boolean = false;
    private filePath: string = '';

    constructor(allArgs: string[]) {
        // allArgs is full process argv slice (e.g. ['hash-object','-w','file'])
        // We ignore index 0 (command name)
        const args = allArgs.slice(1);
        if (args.length === 0) {
            console.error('usage: git hash-object [-w] <file>');
            process.exitCode = 1;
            return;
        }
        if (args[0] === '-w') {
            this.writeFlag = true;
            if (args.length < 2) {
                console.error('fatal: missing <file> argument');
                process.exitCode = 1;
                return;
            }
            this.filePath = args[1];

        } else if (args[0].startsWith('-')) {
            console.error(`fatal: unknown option ${args[0]}`);
            process.exitCode = 1;
            return;

        } else {
            this.filePath = args[0];
        }
    }

    execute(): void {
        if (!this.filePath) return; // prior error

        if (!fs.existsSync(this.filePath) || !fs.statSync(this.filePath).isFile()) {
            console.error(`fatal: cannot open '${this.filePath}': No such file`);
            process.exitCode = 1;
            return;
        }
        try {
            path.join(process.cwd(), ".git", "objects",);
            const data = fs.readFileSync(this.filePath);
            const header = `blob ${data.length}\x00`;
            const store = Buffer.concat([Buffer.from(header), data]);
            const hash = crypto.createHash('sha1').update(store).digest('hex');

            if (this.writeFlag) {
                const dir = hash.slice(0, 2);
                const file = hash.slice(2);
                const objectsDir = path.join(process.cwd(), '.git', 'objects', dir);

                if (!fs.existsSync(objectsDir)) fs.mkdirSync(objectsDir, { recursive: true });

                const objectPath = path.join(objectsDir, file);
                
                if (!fs.existsSync(objectPath)) {
                    const compressed = zlib.deflateSync(store);
                    fs.writeFileSync(objectPath, compressed);
                }
            }
            console.log(hash);
            
        } catch (e: any) {
            console.error(`fatal: error hashing object: ${e.message || e}`);
            process.exitCode = 1;
        }
    }
}
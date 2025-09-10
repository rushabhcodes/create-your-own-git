import * as fs from 'fs';
import { createBlobFromFile } from '../utils/objects';

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
            const hash = createBlobFromFile(this.filePath, this.writeFlag);
            console.log(hash);
            
        } catch (e: any) {
            console.error(`fatal: error hashing object: ${e.message || e}`);
            process.exitCode = 1;
        }
    }
}
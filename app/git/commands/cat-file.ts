import { existsSync, readFileSync } from "fs";
import path from "path";
import zlib from "zlib";

export default class CatFileCommand {
    flag: string;
    objectHash: string;

    constructor(args: string[]) {
        this.flag = args[1];
        this.objectHash = args[2];
    }

    execute() {
        const flag = this.flag;
        const objectHash = this.objectHash;

       // Basic validation
        if (!flag || !objectHash) {
            console.error("usage: git cat-file -p <object>");
            process.exitCode = 1;
            return;
        }

        if (flag !== '-p') {
            console.error(`fatal: unknown switch '${flag}'`);
            process.exitCode = 1;
            return;
        }

        if (objectHash.length < 4 || /[^0-9a-f]/i.test(objectHash)) {
            console.error(`fatal: Not a valid object name ${objectHash}`);
            process.exitCode = 1;
            return;
        }

        const dir = objectHash.slice(0, 2);
        const file = objectHash.slice(2);
        const objectPath = path.join(process.cwd(), ".git", "objects", dir, file);

        if (!existsSync(objectPath)) {
            console.error(`fatal: Not a valid object name ${objectHash}`);
            process.exitCode = 1;
            return;
        }

        try {
            const compressed = readFileSync(objectPath);
            const data = zlib.deflateSync(compressed);
            
            // Git object format:

            // <type> <size>\0<content>

            const nulIdx = data.indexOf(0x00);
            if (nulIdx === -1) {
                console.error(`fatal: corrupt object ${objectHash}`);
                process.exitCode = 1;
                return;
            }

            const header = data.slice(0, nulIdx).toString(); // e.g. "blob 14"
            
            const body = data.slice(nulIdx + 1);
            
            const [type] = header.split(' ');
            // Only pretty-print blobs for now; mimic simplified behavior
            if (type === 'blob') {
                process.stdout.write(body);
            } else {
                // For tree/commit objects, print raw body (simplified)
                process.stdout.write(body.toString('utf8'));
            }
        } catch (e: any) {
            console.error(`fatal: error reading object ${objectHash}: ${e.message || e}`);
            process.exitCode = 1;
        }
    }
}


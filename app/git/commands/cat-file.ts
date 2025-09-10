import { existsSync } from "fs";
import path from "path";
import { readObject } from "../utils/objects";

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
            const obj = readObject(objectHash);
            // -p should pretty-print the object body only
            if (obj.type === 'blob') {
                process.stdout.write(obj.body);
            } else if (obj.type === 'commit') {
                process.stdout.write(obj.body.toString('utf8'));
            } else if (obj.type === 'tree') {
                // Tree entries are in the format: "<mode> <type> <hash>\t<name>\n"
                process.stdout.write(obj.body.toString('utf8'));
            }
        } catch (e: any) {
            console.error(`fatal: error reading object ${objectHash}: ${e.message || e}`);
            process.exitCode = 1;
        }
    }
}


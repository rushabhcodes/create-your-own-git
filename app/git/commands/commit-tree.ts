import crypto from 'crypto';
import fs from 'fs';
import zlib from 'zlib';

export default class CommitTreeCommand {
    commitTreeHash: string = '';
    parentHash: string = '';
    commitMessage: string = '';

    constructor(args: string[]) {
        this.commitTreeHash = args[1];
        this.parentHash = args[3];
        this.commitMessage = args[5];
    }
    
    execute(): void {
        const commitBody = Buffer.concat([
            Buffer.from(`tree ${this.commitTreeHash}\n`),
            Buffer.from(`parent ${this.parentHash}\n`),
            Buffer.from(`author Rushabh <mail@rushabh.dev> ${Date.now()} +0530\n`),
            Buffer.from(`committer Rushabh <mail@rushabh,dev> ${Date.now()} +0530\n`),
            Buffer.from(`\n`),
            Buffer.from(`\n${this.commitMessage}\n`)
        ])

        const commitHeader = Buffer.from(`commit ${commitBody.length}\0`);

        const fullCommit = Buffer.concat([commitHeader, commitBody]);
        
        const hash = crypto.createHash('sha1').update(fullCommit).digest('hex');

        const dir = hash.slice(0, 2);
        const file = hash.slice(2);
        const objectDir = `.git/objects/${dir}`;
        if (!fs.existsSync(objectDir)) fs.mkdirSync(objectDir, { recursive: true });
        const objectPath = `${objectDir}/${file}`;
        if (!fs.existsSync(objectPath)) {
            const compressed = zlib.deflateSync(fullCommit);
            fs.writeFileSync(objectPath, compressed);
        }

        process.stdout.write(hash);

    }
}
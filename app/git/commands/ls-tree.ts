import { readObject, parseTreeEntries } from '../utils/objects';

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

    const treeObj = readObject(resolvedTreeHash);
        if (!treeObj) return; // error printed
        if (treeObj.type !== 'tree') {
            console.error(`fatal: object ${resolvedTreeHash} is not a tree`);
            process.exitCode = 1; return;
        }

        let entries;
        try {
            entries = parseTreeEntries(treeObj.body);
        } catch (e: any) {
            console.error(`fatal: corrupt tree ${resolvedTreeHash} (${e.message || e})`);
            process.exitCode = 1; return;
        }

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

    private resolveTreeish(hash: string): string | null {
    const obj = readObject(hash);
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

    // removed: local parseTreeEntries (now centralized in utils)

    private corrupt(treeHash: string, reason: string) {
        console.error(`fatal: corrupt tree ${treeHash} (${reason})`);
        process.exitCode = 1;
    }
}
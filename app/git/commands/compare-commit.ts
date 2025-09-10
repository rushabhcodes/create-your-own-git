import { readObject, parseTreeEntries } from '../utils/objects';

export default class CompareCommitCommand {
    commitHash1: string = '';
    commitHash2: string = '';
    filePath: string = '';

    constructor(args: string[]) {
        this.commitHash1 = args[1];
        this.commitHash2 = args[2];
        this.filePath = args[3];
    }

    execute(): void {
        if (!this.commitHash1 || !this.commitHash2 || !this.filePath) {
            console.error('usage: git compare-commit <commit-hash-1> <commit-hash-2> <file-path>');
            process.exitCode = 1;
            return;
        }

        const getFileContentFromCommit = (commitHash: string, filePath: string): string | null => {
            let commitObj;
            try {
                commitObj = readObject(commitHash);
            } catch (e: any) {
                console.error(`fatal: ${e.message || e}`);
                process.exitCode = 1; return null;
            }
            if (commitObj.type !== 'commit') {
                console.error(`fatal: object ${commitHash} is not a commit`);
                process.exitCode = 1; return null;
            }
            const bodyStr = commitObj.body.toString('utf8');
            const treeLine = bodyStr.split('\n').find(line => line.startsWith('tree '));
            if (!treeLine) {
                console.error(`fatal: commit ${commitHash} has no tree`);
                process.exitCode = 1;
                return null;
            }
            const treeHash = treeLine.split(' ')[1];
            
            const getFileFromTree = (treeHash: string, filePath: string): string | null => {
                let treeObj;
                try {
                    treeObj = readObject(treeHash);
                } catch (e: any) {
                    console.error(`fatal: ${e.message || e}`);
                    process.exitCode = 1; return null;
                }
                if (treeObj.type !== 'tree') {
                    console.error(`fatal: object ${treeHash} is not a tree`);
                    process.exitCode = 1;
                    return null;
                }
                let entries: ReturnType<typeof parseTreeEntries>;
                try {
                    entries = parseTreeEntries(treeObj.body);
                } catch (e: any) {
                    console.error(`fatal: corrupt tree ${treeHash} (${e.message || e})`);
                    process.exitCode = 1; return null;
                }
                for (const e of entries) {
                    if (e.name === filePath) {
                        let blobObj;
                        try {
                            blobObj = readObject(e.hash);
                        } catch (err: any) {
                            console.error(`fatal: ${err.message || err}`);
                            process.exitCode = 1; return null;
                        }
                        if (blobObj.type !== 'blob') {
                            console.error(`fatal: object ${e.hash} is not a blob`);
                            process.exitCode = 1; return null;
                        }
                        return blobObj.body.toString();
                    }
                }
                console.error(`fatal: file '${filePath}' not found in tree ${treeHash}`);
                process.exitCode = 1;
                return null;
            }

            return getFileFromTree(treeHash, filePath);
        }

        const content1 = getFileContentFromCommit(this.commitHash1, this.filePath);
        const content2 = getFileContentFromCommit(this.commitHash2, this.filePath);
        
        if (content1 === null || content2 === null) return; // errors already reported

        if (content1 === content2) {
            console.log(`File '${this.filePath}' is identical in both commits.`);
        } else {
            console.log(`File '${this.filePath}' differs between commits.`);
            console.log(`--- Commit ${this.commitHash1}`);
            console.log(content1);
            console.log(`--- Commit ${this.commitHash2}`);
            console.log(content2);
        }
    }
}
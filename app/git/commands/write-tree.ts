import fs from "fs";
import path from "path";
import { createBlobFromFile, createObjectFromHash } from "../utils/objects";
import crypto from "crypto";
import zlib from "zlib";
import { create } from "domain";

export default class WriteTreeCommand {
    constructor() { }

    execute() {
        // recursively traverse the working directory
        // for each file, create a blob object and store it in .git/objects
        // create a tree object that references all the blobs and subtrees
        // store the tree object in .git/objects
        // print the hash of the root tree object
        function recursiveCreateTree(basePath: string): string | null {
            const entries = fs.readdirSync(basePath);
            const treeEntries = [];
            for (const entry of entries) {
                if (entry === '.git') continue; // skip .git directory
                const fullPath = path.join(basePath, entry);
                const stats = fs.statSync(fullPath);
                if (stats.isDirectory()) {
                    const shaHash = recursiveCreateTree(fullPath);
                    treeEntries.push({
                        mode: "040000",
                        basename: path.basename(fullPath),
                        shaHash,
                    },);
                } else if (stats.isFile()) {
                    const shaHash = createBlobFromFile(fullPath);
                    treeEntries.push({
                        mode: "100644",
                        basename: path.basename(fullPath),
                        shaHash,
                    },);
                }

            }

            if (entries.length == 0 || treeEntries.length === 0) {
                // empty tree
                return null;
            }

            const treeBody = treeEntries.reduce((acc, treeEntry) => {
                const { mode, basename, shaHash } = treeEntry;
                if (!shaHash) return acc; // skip if shaHash is null
                return Buffer.concat([acc,
                    Buffer.from(`${mode} ${basename}\0`),
                    Buffer.from(shaHash, 'hex',),
                ],);
            }, Buffer.alloc(0));

            const treeBuffer = Buffer.concat([
                Buffer.from(`tree ${treeBody.length}\0`),
                treeBody,
            ],);

            const treeHash = crypto.createHash('sha1').update(treeBuffer).digest('hex');

            createObjectFromHash(treeHash, treeBuffer);

            return treeHash;
        }

        const treeSha = recursiveCreateTree(process.cwd());

        process.stdout.write(treeSha!);
    }


}
import * as fs from 'fs';
import zlib from 'zlib';
import crypto from 'crypto';
import path from 'path';

const args = process.argv.slice(2);
const command = args[0];

enum Commands {
    Init = "init",
    CatFile = "cat-file",
    HashObject = "hash-object",
    LsTree = "ls-tree",
    WriteTree = "write-tree",
    CommitTree = "commit-tree",
}

function splitHash(hash: string): { dir: string; file: string } {
    return { dir: hash.slice(0, 2), file: hash.slice(2) };
}

function objectPath(hash: string): string {
    const { dir, file } = splitHash(hash);
    return `.git/objects/${dir}/${file}`;
}

interface GitObject {
    type: string;
    size: number;
    body: Buffer;
}

function readRawObject(hash: string): Buffer {
    return zlib.unzipSync(fs.readFileSync(objectPath(hash)));
}

function readObject(hash: string): GitObject {
    const data = readRawObject(hash);
    const nulIdx = data.indexOf(0x00);
    if (nulIdx === -1) throw new Error("Corrupt object: missing header terminator");
    const header = data.slice(0, nulIdx).toString(); // e.g. "blob 14"
    const [type, sizeStr] = header.split(' ');
    const size = parseInt(sizeStr, 10);
    const body = data.slice(nulIdx + 1);
    if (body.length !== size) {
        // Not throwing hard (Git sometimes tolerates) but we'll enforce for consistency
        throw new Error(`Size mismatch for ${hash}: expected ${size} got ${body.length}`);
    }
    return { type, size, body };
}

function writeObject(type: 'blob' | 'tree' | 'commit', body: Buffer): string {
    const header = `${type} ${body.length}\x00`;
    const storeData = Buffer.concat([Buffer.from(header), body]);
    const hash = crypto.createHash('sha1').update(storeData).digest('hex');
    const { dir, file } = splitHash(hash);
    const dirPath = `.git/objects/${dir}`;
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
    const compressed = zlib.deflateSync(storeData);
    fs.writeFileSync(`${dirPath}/${file}`, compressed);
    return hash;
}

function buildTree(dir: string): string {
    const entries: { mode: string; name: string; hash: string }[] = [];
    for (const dirent of fs.readdirSync(dir, { withFileTypes: true })) {
        const name = dirent.name;
        if (name === '.git') continue;
        const fullPath = path.join(dir, name);
        if (dirent.isFile()) {
            const data = fs.readFileSync(fullPath);
            const blobHash = writeObject('blob', data);
            entries.push({ mode: '100644', name, hash: blobHash });
        } else if (dirent.isDirectory()) {
            const subHash = buildTree(fullPath);
            if (subHash) {
                entries.push({ mode: '40000', name, hash: subHash });
            }
        }
    }

    entries.sort((a, b) => a.name.localeCompare(b.name));
    const bodyBuffers: Buffer[] = [];
    for (const e of entries) {
        const meta = Buffer.from(`${e.mode} ${e.name}\x00`);
        const shaRaw = Buffer.from(e.hash, 'hex');
        bodyBuffers.push(Buffer.concat([meta, shaRaw]));
    }
    const body = Buffer.concat(bodyBuffers);
    return writeObject('tree', body);
}

switch (command) {
    case Commands.Init:
        // You can use print statements as follows for debugging, they'll be visible when running tests.
        console.error("Logs from your program will appear here!");

        // Uncomment this block to pass the first stage
        fs.mkdirSync(".git", { recursive: true });
        fs.mkdirSync(".git/objects", { recursive: true });
        fs.mkdirSync(".git/refs", { recursive: true });
        fs.writeFileSync(".git/HEAD", "ref: refs/heads/main\n");
        console.log("Initialized git directory");
        break;

    case Commands.CatFile:
        // Find the value for the "-p" flag in args
        const pIndex = args.indexOf("-p");
        if (pIndex === -1 || pIndex + 1 >= args.length) {
            throw new Error("Missing or invalid -p argument");
        }
    const hash = args[pIndex + 1];
    const obj = readObject(hash);
    // For cat-file -p we just print the body for now (blob or tree raw).
    process.stdout.write(obj.body.toString());

        break;

    case Commands.HashObject:

        const wIndex = args.indexOf("-w");
        if (wIndex === -1 || wIndex + 1 >= args.length) {
            throw new Error("Missing or invalid -w argument");
        }

        const filePath = args[wIndex + 1];
        const fileData = fs.readFileSync(filePath);
        const hashHex = writeObject('blob', fileData);
        console.log(hashHex);

        break;

    case Commands.LsTree:

        const nameOnlyFlag = args.includes("--name-only");
       
        let treeHash: string | undefined;
        for (let i = 1; i < args.length; i++) {
            const a = args[i];
            if (!a.startsWith('-')) { treeHash = a; break; }
        }

        if (!treeHash) {
            throw new Error("Missing tree hash argument");
        }

        const treeObj = readObject(treeHash);
        const body = treeObj.body;
        let offset = 0;
        while (offset < body.length) {
            const spaceIdx = body.indexOf(0x20, offset); // ' '
            const nullIdx2 = body.indexOf(0x00, spaceIdx);
            if (spaceIdx === -1 || nullIdx2 === -1) break; // malformed
            let mode = body.slice(offset, spaceIdx).toString();
            if (mode.length === 5) {
                mode = '0' + mode;
            }
            const name = body.slice(spaceIdx + 1, nullIdx2).toString();
            const shaBytes = body.slice(nullIdx2 + 1, nullIdx2 + 21); // 20 bytes
            const sha = shaBytes.toString('hex');
            if (nameOnlyFlag) {
                console.log(name);
            } else {
                console.log(`${mode} ${sha}\t${name}`);
            }
            offset = nullIdx2 + 21;
        }
        break;

    case Commands.WriteTree: {
        const treeHash = buildTree('.');
        console.log(treeHash);
        break;
    }

    case Commands.CommitTree: {
        if (args.length < 2) throw new Error("Missing tree SHA");
        const treeSha = args[1];
        const pIdx = args.indexOf('-p');
        const parentSha = pIdx !== -1 && pIdx + 1 < args.length ? args[pIdx + 1] : undefined;
        const mIdx = args.indexOf('-m');
        if (mIdx === -1 || mIdx + 1 >= args.length) throw new Error("Missing -m <message>");
        const message = args[mIdx + 1];
        const authorName = 'Coder';
        const authorEmail = 'coder@example.com';
        const timestamp = Math.floor(Date.now() / 1000);
        const timezone = '+0000';
        let lines = [`tree ${treeSha}`];
        if (parentSha) lines.push(`parent ${parentSha}`);
        const ident = `${authorName} <${authorEmail}> ${timestamp} ${timezone}`;
        lines.push(`author ${ident}`);
        lines.push(`committer ${ident}`);
        lines.push(''); // blank line before message
        lines.push(message);
        const body = Buffer.from(lines.join('\n') + '\n');
        const commitHash = writeObject('commit', body);
        console.log(commitHash);
        break;
    }

    default:
        throw new Error(`Unknown command ${command}`);
}

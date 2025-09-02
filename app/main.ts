import * as fs from 'fs';
import zlib from 'zlib';
import crypto from 'crypto';

const args = process.argv.slice(2);
const command = args[0];

enum Commands {
    Init = "init",
    CatFile = "cat-file",
    HashObject = "hash-object",
    LsTree = "ls-tree",
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
        const dir = hash.slice(0, 2);
        const file = hash.slice(2);

        const objectPath = `.git/objects/${dir}/${file}`;

        const compressedData = fs.readFileSync(objectPath);

        const data = zlib.unzipSync(compressedData)

        const new_data = data.slice(data.indexOf("\x00") + 1)

        process.stdout.write(new_data.toString());

        break;

    case Commands.HashObject:
        const wIndex = args.indexOf("-w");
        if (wIndex === -1 || wIndex + 1 >= args.length) {
            throw new Error("Missing or invalid -w argument");
        }

        const filePath = args[wIndex + 1];
        const fileData = fs.readFileSync(filePath);

        const header = `blob ${fileData.length}\x00`;
        const storeData = Buffer.concat([Buffer.from(header), fileData]);

        const hashBuffer = crypto.createHash('sha1').update(storeData).digest();
        const hashHex = hashBuffer.toString('hex');

        const dirName = hashHex.slice(0, 2);
        const fileName = hashHex.slice(2);

        const objectDir = `.git/objects/${dirName}`;
        if (!fs.existsSync(objectDir)) {
            fs.mkdirSync(objectDir);
        }

        const compressedStoreData = zlib.deflateSync(storeData);
        fs.writeFileSync(`${objectDir}/${fileName}`, compressedStoreData);

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

        const treeDir = treeHash.slice(0, 2);
        const treeFile = treeHash.slice(2);

        const treeObjectPath = `.git/objects/${treeDir}/${treeFile}`;
        
        const treeCompressedData = fs.readFileSync(treeObjectPath);
        const fullData = zlib.unzipSync(treeCompressedData);
        const nullIdx = fullData.indexOf(0x00);
        if (nullIdx === -1) {
            throw new Error("Invalid tree object (no header terminator)");
        }
        const body = fullData.slice(nullIdx + 1); // binary body
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

    default:
        throw new Error(`Unknown command ${command}`);
}

import * as fs from 'fs';
import zlib from 'zlib';

const args = process.argv.slice(2);
const command = args[0];

enum Commands {
    Init = "init",
    CatFile = "cat-file",
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

    default:
        throw new Error(`Unknown command ${command}`);
}

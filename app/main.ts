import * as fs from 'fs';
import zlib from 'zlib';
import crypto from 'crypto';
import path from 'path';

import GitClient from './git/client';
import { CatFileCommand, HashObjectCommand, InitCommand, LsTreeCommand } from './git/commands';

const gitClient = new GitClient;


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


switch (command) {

    case Commands.Init:
        createGitDirectory()
        break;
    case Commands.CatFile:
        handleCatFileCommand()
        break;

    case Commands.HashObject:
        handleHashObjectCommand();
        break;

    case Commands.LsTree:
        handleLsTreeCommand();
        break;

    //     const nameOnlyFlag = args.includes("--name-only");

    //     let treeHash: string | undefined;
    //     for (let i = 1; i < args.length; i++) {
    //         const a = args[i];
    //         if (!a.startsWith('-')) { treeHash = a; break; }
    //     }

    //     if (!treeHash) {
    //         throw new Error("Missing tree hash argument");
    //     }

    //     const treeObj = readObject(treeHash);
    //     const body = treeObj.body;
    //     let offset = 0;
    //     while (offset < body.length) {
    //         const spaceIdx = body.indexOf(0x20, offset); // ' '
    //         const nullIdx2 = body.indexOf(0x00, spaceIdx);
    //         if (spaceIdx === -1 || nullIdx2 === -1) break; // malformed
    //         let mode = body.slice(offset, spaceIdx).toString();
    //         if (mode.length === 5) {
    //             mode = '0' + mode;
    //         }
    //         const name = body.slice(spaceIdx + 1, nullIdx2).toString();
    //         const shaBytes = body.slice(nullIdx2 + 1, nullIdx2 + 21); // 20 bytes
    //         const sha = shaBytes.toString('hex');
    //         if (nameOnlyFlag) {
    //             console.log(name);
    //         } else {
    //             console.log(`${mode} ${sha}\t${name}`);
    //         }
    //         offset = nullIdx2 + 21;
    //     }

    // case Commands.WriteTree:
    //     const treeHash = buildTree('.');
    //     console.log(treeHash);
    //     break;


    // case Commands.CommitTree: 
    //     if (args.length < 2) throw new Error("Missing tree SHA");
    //     const treeSha = args[1];
    //     const pIdx = args.indexOf('-p');
    //     const parentSha = pIdx !== -1 && pIdx + 1 < args.length ? args[pIdx + 1] : undefined;
    //     const mIdx = args.indexOf('-m');
    //     if (mIdx === -1 || mIdx + 1 >= args.length) throw new Error("Missing -m <message>");
    //     const message = args[mIdx + 1];
    //     const authorName = 'Coder';
    //     const authorEmail = 'coder@example.com';
    //     const timestamp = Math.floor(Date.now() / 1000);
    //     const timezone = '+0000';
    //     let lines = [`tree ${treeSha}`];
    //     if (parentSha) lines.push(`parent ${parentSha}`);
    //     const ident = `${authorName} <${authorEmail}> ${timestamp} ${timezone}`;
    //     lines.push(`author ${ident}`);
    //     lines.push(`committer ${ident}`);
    //     lines.push(''); // blank line before message
    //     lines.push(message);
    //     const body = Buffer.from(lines.join('\n') + '\n');
    //     const commitHash = writeObject('commit', body);
    //     console.log(commitHash);
    //     break;

    default:
        throw new Error(`Unknown command ${command}`);
}

function createGitDirectory() {
    const command = new InitCommand();
    gitClient.run(command)
}


function handleCatFileCommand() {
    const command = new CatFileCommand(args);
    gitClient.run(command)
}

function handleHashObjectCommand() {
    const command = new HashObjectCommand(args);
    gitClient.run(command);
}

function handleLsTreeCommand() {
    const command = new LsTreeCommand(args);
    gitClient.run(command);
}

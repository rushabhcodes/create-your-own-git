import * as fs from 'fs';
import zlib from 'zlib';
import crypto from 'crypto';
import path from 'path';

import GitClient from './git/client';
import { CatFileCommand, HashObjectCommand, InitCommand, LsTreeCommand, WriteTreeCommand } from './git/commands';

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

    case Commands.WriteTree:
        handleWriteTreeCommand();
        break;


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

function handleWriteTreeCommand() {
    const command = new WriteTreeCommand();
    gitClient.run(command);
}
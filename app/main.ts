import GitClient from './git/client';
import { CatFileCommand, CommitTreeCommand, HashObjectCommand, InitCommand, LsTreeCommand, WriteTreeCommand } from './git/commands';

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


    case Commands.CommitTree:
        handleCommitTreeCommand();
        break;

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

function handleCommitTreeCommand() {
    const command = new CommitTreeCommand(args);
    gitClient.run(command);
}
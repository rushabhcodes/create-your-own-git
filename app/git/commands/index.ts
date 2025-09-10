import CatFileCommand from "./cat-file";
import HashObjectCommand from "./hash-object";
import InitCommand from "./init";
import LsTreeCommand from "./ls-tree";
import WriteTreeCommand from "./write-tree";



export interface GitCommand {
    execute(): void;
}



export { CatFileCommand, InitCommand, HashObjectCommand, LsTreeCommand, WriteTreeCommand } ;
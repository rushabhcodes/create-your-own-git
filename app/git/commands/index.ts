import CatFileCommand from "./cat-file";
import InitCommand from "./init";




export interface GitCommand {
    execute(): void;
}



export {CatFileCommand, InitCommand};
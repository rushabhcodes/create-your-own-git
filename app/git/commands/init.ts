import fs from "fs";
import path from "path";

export default class InitCommand {
    execute() {
        console.log("Initializing new git repository");
        fs.mkdirSync(path.join(process.cwd(), ".git"), { recursive: true });
        fs.mkdirSync(path.join(process.cwd(), ".git", "objects"), { recursive: true });
        fs.mkdirSync(path.join(process.cwd(), ".git", "refs"), { recursive: true });
        fs.writeFileSync(path.join(process.cwd(), ".git", "HEAD"), "ref: refs/heads/main\n");
        console.log("Initialized git directory");
    }
}
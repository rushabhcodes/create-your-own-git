import type { GitCommand } from './commands';

export default class GitClient {
    run(command: GitCommand): void {
        try {
            command.execute();
        } catch (err: any) {
            const msg = err && err.message ? err.message : String(err);
            console.error(`fatal: ${msg}`);
            process.exitCode = 1;
        }
    }
}
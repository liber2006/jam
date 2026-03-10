import { execFileSync, execFile } from 'node:child_process';

/** Safe command execution — always uses execFileSync with argument arrays (no shell injection) */
export function execSync(command: string, args: string[], env?: Record<string, string>): string {
  return execFileSync(command, args, {
    encoding: 'utf-8',
    timeout: 10_000,
    env: { ...process.env, ...env },
  }).trim();
}

/** Async exec with timeout */
export function execAsync(
  command: string,
  args: string[],
  env?: Record<string, string>,
): Promise<{ stdout: string; exitCode: number }> {
  return new Promise((resolve) => {
    const child = execFile(
      command,
      args,
      { encoding: 'utf-8', timeout: 15_000, env: { ...process.env, ...env } },
      (error, stdout) => {
        resolve({ stdout: stdout?.trim() ?? '', exitCode: error ? (error as NodeJS.ErrnoException & { code?: number }).code ?? 1 : 0 });
      },
    );
    child.on('error', () => resolve({ stdout: '', exitCode: 1 }));
  });
}

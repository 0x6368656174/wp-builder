import { spawn } from 'child_process';

export function runCommand(commandStr: string, options: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const cmd = spawn(commandStr, options, { cwd });
    cmd.stdout.on('data', data => process.stdout.write(data));
    cmd.stderr.on('data', data => process.stderr.write(data));

    cmd.on('close', code => {
      if (code === 0) {
        resolve();
      } else {
        reject(code);
      }
    });
  });
}

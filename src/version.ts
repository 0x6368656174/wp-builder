import { short } from 'git-rev-sync';

export function version(isDevelopment: boolean) {
  return isDevelopment ? 'dev' : short(process.cwd());
}
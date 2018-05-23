import { short } from 'git-rev-sync';

export function version(isDevelopment: boolean) {
  try {
    return isDevelopment ? 'dev' : short(process.cwd());
  } catch (e) {
    return 'dev';
  }
}

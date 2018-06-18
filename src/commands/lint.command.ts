import { Options } from 'yargs';

export const command = 'lint [files..]';
export const describe = 'Lint project';
export const builder: { [key: string]: Options } = {
  files: {
    alias: 'f',
    default: [],
    description: 'Files to lint',
    type: 'array',
  },
  fix: {
    default: false,
    description: 'Fix errors',
    type: 'boolean',
  },
};
export async function handler(argv: any) {
  const run = require('./lint.command-handler');
  return run.handler(argv);
}

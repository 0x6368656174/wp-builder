import { Options } from 'yargs';

export const command = 'prettify [files..]';
export const describe = 'Prettify project style';
export const builder: { [key: string]: Options } = {
  showAll: {
    default: false,
    description: 'Show all processed files',
    type: 'boolean',
  },
};

export async function handler(argv: any) {
  const run = require('./prettify.command-handler');
  return run.handler(argv);
}

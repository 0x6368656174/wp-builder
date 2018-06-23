import { Options } from 'yargs';

export const command = 'init';
export const describe = 'Init new project';
export const builder: {[key: string]: Options} = { };

export async function handler(argv: any) {
  const run = require('./init.command-handler');
  return run.handler(argv);
}

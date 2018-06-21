import { Options } from 'yargs';

export const command = 'build';
export const describe = 'Build site';
export const builder: {[key: string]: Options} = {
  deployUrl: {
    describe: 'URL where files will be deployed',
    type: 'string',
  },
  prod: {
    alias: 'p',
    default: false,
    describe: 'Build in production mode',
    type: 'boolean',
  },
  theme: {
    alias: 't',
    describe: 'Theme for build',
    type: 'string',
  },
};

export function handler(argv: any) {
  const run = require('./build.command-handler');
  return run.handler(argv);
}

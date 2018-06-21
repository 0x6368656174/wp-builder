import { Options } from 'yargs';

export const command = 'serve';
export const describe = 'Run site local';
export const builder: {[key: string]: Options} = {
  deployUrl: {
    describe: 'URL where files will be deployed',
    type: 'string',
  },
  host: {
    default: 'localhost',
    describe: 'Host',
    type: 'string',
  },
  port: {
    default: 4200,
    describe: 'Port',
    type: 'number',
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
  updatePort: {
    default: 4201,
    describe: 'Port for webpack live update server',
    type: 'number',
  },
};

export function handler(argv: any) {
  const run = require('./serve.command-handler');
  return run.handler(argv);
}

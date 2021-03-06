import { Options } from 'yargs';

export const command = 'serve';
export const describe = 'Run site local';
export const builder: {[key: string]: Options} = {
  'deploy-url': {
    describe: 'URL where files will be deployed',
    type: 'string',
  },
  'host': {
    default: 'localhost',
    describe: 'Host',
    type: 'string',
  },
  'live-reload': {
    default: true,
    describe: 'Reload page after file changes',
    type: 'boolean',
  },
  'port': {
    default: 4200,
    describe: 'Port',
    type: 'number',
  },
  'prod': {
    alias: 'p',
    default: false,
    describe: 'Build in production mode',
    type: 'boolean',
  },
  'theme': {
    alias: 't',
    describe: 'Theme for build',
    type: 'string',
  },
  'webpack-port': {
    default: 4201,
    describe: 'Port for webpack live update server',
    type: 'number',
  },
};

export function handler(argv: any) {
  const run = require('./serve.command-handler');
  return run.handler(argv);
}

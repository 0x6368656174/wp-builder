import { Options } from 'yargs';

export const command = 'ssh-deploy';
export const describe = 'Deploy all dist files to remote SSH-server. To create dist files use "wpbuild build".';
export const builder: {[key: string]: Options} = {
  'archive-folder': {
    alias: 'a',
    describe: 'Remote folder for archive',
    type: 'string',
  },
  'backup-folder': {
    alias: 'b',
    demand: true,
    describe: 'Remote folder for backup',
    type: 'string',
  },
  'dist': {
    default: 'dist',
    describe: 'Dist path',
    type: 'string',
  },
  'exclude': {
    describe: 'List of excluded files and folders',
    type: 'array',
  },
  'host': {
    alias: 'h',
    demand: true,
    describe: 'SSH host',
    type: 'string',
  },
  'keep-clean': {
    default: false,
    describe: 'Remove all temporary files from remote server after success deployment',
    type: 'boolean',
  },
  'method': {
    default: 'ssh-copy',
    describe: 'Deploy method (ssh-copy, rsync)',
    type: 'string',
  },
  'password': {
    alias: 'p',
    describe: 'SSH password',
    type: 'string',
  },
  'port': {
    default: 22,
    describe: 'SSH port',
    type: 'number',
  },
  'remote-folder': {
    alias: 'f',
    demand: true,
    describe: 'Remote folder to upload',
    type: 'string',
  },
  'ssh-host-key-checking': {
    default: false,
    describe: 'SSH StrictHostKeyChecking connect param',
    type: 'boolean',
  },
  'ssh-private-key': {
    alias: 'i',
    describe: 'Private key for either key-based or hostbased user authentication',
    type: 'string',
  },
  'user': {
    alias: 'u',
    demand: true,
    describe: 'SSH user',
    type: 'string',
  },
};

export function handler(argv: any) {
  const run = require('./ssh-deploy.command-handler');
  return run.handler(argv);
}

#!/usr/bin/env node

import * as yargs from 'yargs';

import * as buildCommand from './build.command';
import * as initCommand from './init.command';
import * as serveCommand from './serve.command';

const argv = yargs.usage('Usage: $0 [command]')
  .command(buildCommand)
  .command(serveCommand)
  .command(initCommand)
  .version('1.0.13')
  .locale('en')
  .help('help')
  .epilog('(c) 2018 Pavel Puchkov <0x6368656174@gmail.com> https://github.com/0x6368656174/wp-builder')
  .argv;

if (argv._.length === 0) {
  yargs.showHelp();
  process.exit(0);
}

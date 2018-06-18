#!/usr/bin/env node

import * as yargs from 'yargs';

import * as buildCommand from './commands/build.command';
import * as initCommand from './commands/init.command';
import * as lintCommand from './commands/lint.command';
import * as prettifyCommand from './commands/prettify.command';
import * as serveCommand from './commands/serve.command';

const argv = yargs.usage('Usage: $0 [command]')
  .command(buildCommand)
  .command(serveCommand)
  .command(initCommand)
  .command(lintCommand)
  .command(prettifyCommand)
  .demandCommand(1, 'You need at least one command before moving on')
  .version('1.0.22')
  .locale('en')
  .help('help')
  .epilog('(c) 2018 Pavel Puchkov <0x6368656174@gmail.com> https://github.com/0x6368656174/wp-builder')
  .argv;

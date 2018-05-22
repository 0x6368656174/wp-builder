#!/usr/bin/env node

import * as yargs from 'yargs';

import * as buildCommand from './build.command';
import * as serveCommand from './serve.command';

yargs.usage('Usage: $0 [command]')
  .command(buildCommand)
  .command(serveCommand)
  .version('1.0.0')
  .locale('en')
  .help('help')
  .epilog('(c) 2018 Pavel Puchkov <0x6368656174@gmail.com> https://github.com/0x6368656174/wp-build');

yargs.showHelp();

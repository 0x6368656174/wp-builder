import { fork } from 'child_process';
import { join } from 'path';
import {log, screen, text, bigtext} from 'blessed';
import {readConfig} from '../../config-read';

interface IArgv {
  host: string;
  port: number;
  'webpack-port': number;
  prod: boolean;
  theme?: string;
  'deploy-url'?: string;
  liveReload: boolean;
}

export function handler(argv: IArgv) {
  const mode = argv.prod ? 'production' : 'development';
  const theme = argv.theme;
  const config = readConfig();
  const themeName = theme || config.defaultTheme;

  const style = {
    border: {
      fg: 'white',
    },
    scrollbar: {
      bg: 'white',
    },
  };

  const blessedScreen = screen({
    smartCSR: true,
    autoPadding: false,
    title: `WPBUILD: ${themeName} (${mode}) - http://${argv.host}:${argv.port}`,
  });
  // Quit on Escape, q, or Control-C.
  blessedScreen.key(['escape', 'q', 'C-c'], () => {
    php.kill('SIGTERM');
    webpack.kill();

    process.exit(0);
  });

  const title = bigtext({
    parent: blessedScreen,
    top: 0,
    width: '100%',
  });

  text({
    parent: title,
    content: `WPBUILD: ${themeName} (${mode}) - http://${argv.host}:${argv.port}`,
    top: 0,
    left: 'center',
  });

  const webpackLogger = log({
    parent: blessedScreen,
    top: 2,
    label: `WebPack (localhost:${argv['webpack-port']})`,
    scrollOnInput: true,
    alwaysScroll: true,
    width: '50%',
    height: '100%-2',
    border: 'line',
    tags: true,
    keys: true,
    vi: true,
    mouse: true,
    scrollbar: {
      ch: ' ',
    },
    style,
  });

  const phpLogger = log({
    parent: blessedScreen,
    label: `PHP (localhost:${argv.port})`,
    scrollOnInput: true,
    alwaysScroll: true,
    width: '50%',
    top: 2,
    height: '100%-2',
    border: 'line',
    right: '0',
    tags: true,
    keys: true,
    vi: true,
    mouse: true,
    scrollbar: {
      ch: ' ',
    },
    style,
  });

  const processConfig = JSON.stringify({
    theme,
    mode,
    liveReloadEnable: argv.liveReload,
    webpackPort: argv['webpack-port'],
    deployUrl: argv['deploy-url'],
    host: argv.host,
    port: argv.port,
  });

  const php = fork(join(__dirname, 'php-process'), [processConfig], {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'pipe',
  });
  php.stdout.on('data', data => phpLogger.log(data.toString()));
  php.stderr.on('data', data => phpLogger.log(`{red-fg}${data.toString()}{/}`));

  const webpack = fork(join(__dirname, 'webpack-process'), [processConfig], {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'pipe',
  });
  webpack.stdout.on('data', data => webpackLogger.log(data.toString()));
  webpack.stderr.on('data', data => webpackLogger.log(`{red-fg}${data.toString()}{/}`));

  blessedScreen.render();

  process.on('exit', () => {
    php.kill('SIGTERM');
    webpack.kill();
  });
}

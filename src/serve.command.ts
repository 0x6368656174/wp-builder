import { spawn } from 'child_process';
import { join } from 'path';
import * as webpack from 'webpack';
import * as WebpackDevServer from 'webpack-dev-server';
import * as WriteFileWebpackPlugin from 'write-file-webpack-plugin';
import { Options } from 'yargs';
import { readConfig } from './config-read';
import { statsConfig } from './stats';
import { webpackConfig } from './webpack-config';

export const command = 'serve';
export const describe = 'Run site local';
export const builder: {[key: string]: Options} = {
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

interface IArgv {
  host: string;
  port: number;
  updatePort: number;
  prod: boolean;
  theme?: string;
}

export function handler(argv: IArgv) {
  process.stdout.write(`Starting serve on http://${argv.host}:${argv.port}...`);
  const mode = argv.prod ? 'production' : 'development';
  const theme = argv.theme;

  const config = readConfig();
  const dist = join(process.cwd(), config.build.outputPath);
  const router = join(__dirname, 'router.php');
  const themeName = config.defaultTheme;
  const publicPath = `/wp-content/themes/${themeName}/`;

  const php = spawn('php', ['-S', `${argv.host}:${argv.port}`, '-t', dist, router], {cwd: process.cwd(), env: process.env});
  php.stdout.on('data', data => process.stdout.write(`PHP: ${data}`));
  php.stderr.on('data', data => process.stderr.write(`PHP: ${data}`));

  const wpConfig = webpackConfig({mode, theme, serve: true});
  if (!wpConfig.plugins) {
    wpConfig.plugins = [];
  }
  wpConfig.plugins.push(new (WriteFileWebpackPlugin as any)());
  const compiler = webpack(wpConfig);
  const server = new WebpackDevServer(compiler, {
    contentBase: dist,
    stats: statsConfig,
    watchOptions: {
      aggregateTimeout: 300,
      poll: 1000,
    },
  });

  server.listen(argv.updatePort);
}

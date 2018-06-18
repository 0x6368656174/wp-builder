import { spawn } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import * as webpack from 'webpack';
import * as WebpackDevServer from 'webpack-dev-server';
import * as WriteFileWebpackPlugin from 'write-file-webpack-plugin';
import { readConfig } from '../config-read';
import { statsConfig } from '../stats';
import { webpackConfig } from '../webpack-config';

interface IArgv {
  host: string;
  port: number;
  updatePort: number;
  prod: boolean;
  theme?: string;
}

function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min)) + min;
}

interface ICreateRouterParams {
  theme: string;
  host: string;
  updatePort: number;
}

function createRouterPhp(params: ICreateRouterParams): string {
  let routerData = readFileSync(join(__dirname, 'router.php'), 'utf-8');
  routerData = routerData.replace('%THEME%', params.theme);
  routerData = routerData.replace('%HOST%', params.host);
  routerData = routerData.replace('%UPDATE_PORT%', params.updatePort.toString());
  const filePath = join(tmpdir(), `wp-build-router-${getRandomInt(1000, 9999)}.php`);
  writeFileSync(filePath, routerData);
  return filePath;
}

export function handler(argv: IArgv) {
  process.stdout.write(`Starting serve on http://${argv.host}:${argv.port}...`);
  const mode = argv.prod ? 'production' : 'development';
  const theme = argv.theme;

  const config = readConfig();
  const dist = join(process.cwd(), config.build.outputPath);
  const themeName = theme || config.defaultTheme;

  const router = createRouterPhp({theme: themeName, host: argv.host, updatePort: argv.updatePort});

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

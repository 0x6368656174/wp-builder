import { spawn } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { readConfig } from '../../config-read';

const processConfig = JSON.parse(process.argv[2]);

const {theme, host, port, webpackPort} = processConfig;

function getRandomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min)) + min;
}

interface ICreateRouterParams {
  theme: string;
  host: string;
  updatePort: number;
}

function createRouterPhp(params: ICreateRouterParams): string {
  let routerData = readFileSync(join(__dirname, '..', '..', 'router.php'), 'utf-8');
  routerData = routerData.replace('%THEME%', params.theme);
  routerData = routerData.replace('%HOST%', params.host);
  routerData = routerData.replace('%UPDATE_PORT%', params.updatePort.toString());
  const filePath = join(tmpdir(), `wp-build-router-${getRandomInt(1000, 9999)}.php`);
  writeFileSync(filePath, routerData);
  return filePath;
}

const config = readConfig();
const dist = join(process.cwd(), config.build.outputPath);
const themeName = theme || config.defaultTheme;

const router = createRouterPhp({theme: themeName, host, updatePort: webpackPort});

const php = spawn('php', ['-S', `${host}:${port}`, '-t', dist, router], {cwd: process.cwd(), env: process.env});
php.stdout.pipe(process.stdout);
php.stderr.pipe(process.stdout);

([`exit`, `SIGINT`, `SIGUSR1`, `SIGUSR2`, `uncaughtException`, `SIGTERM`] as any[]).forEach(eventType => {
  process.on(eventType, () => php.kill());
});

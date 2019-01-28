import { join } from 'path';
import * as webpack from 'webpack';
import * as WebpackDevServer from 'webpack-dev-server';
import * as WriteFileWebpackPlugin from 'write-file-webpack-plugin';
import { readConfig } from '../../config-read';
import { statsConfig } from '../../stats';
import { webpackConfig } from '../../webpack-config';

const processConfig = JSON.parse(process.argv[2]);

const { theme, mode, liveReloadEnable, webpackPort, deployUrl } = processConfig;

const config = readConfig();
const dist = join(process.cwd(), config.build.outputPath);

const wpConfig = webpackConfig({mode, theme, liveReloadEnable, deployUrl});
if (!wpConfig.plugins) {
  wpConfig.plugins = [];
}
wpConfig.plugins.push(new (WriteFileWebpackPlugin as any)());
const compiler = webpack(wpConfig);
const server = new WebpackDevServer(compiler, {
  contentBase: dist,
  overlay: true,
  stats: statsConfig as any, // FIXME: Проверить типы
  watchOptions: {
    aggregateTimeout: 300,
    poll: 1000,
  },
});

server.listen(webpackPort);

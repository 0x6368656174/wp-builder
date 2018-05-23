import * as webpack from 'webpack';
import {webpackConfig} from './webpack-config';

export const command = 'build';
export const describe = 'Build site';
export const builder = {
  prod: {
    alias: 'p',
    default: false,
    describe: 'Build in production mode',
  },
};

interface IArgv {
  prod: boolean;
}

export function handler(argv: IArgv) {
  const mode = argv.prod ? 'production' : 'development';

  webpack(webpackConfig({mode}), (err: any, stats: any) => {
    if (err) {
      process.stderr.write(err + '\n');
      process.exit(1);
    }

    process.stdout.write(stats.toString({
      asserts: false,
      assetsSort: '!size',
      children: false,
      chunkModules: false,
      chunkOrigins: false,
      chunks: false,
      colors: true,
      entrypoints: false,
      modules: false,
    }) + '\n');

    process.exit(0);
  });
}

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
      console.error(err);
      return;
    }

    console.log(stats.toString({
      // chunks: false,
      colors: true,
    }));

    process.exit(1);
  });
}

import * as webpack from 'webpack';
import { Options } from 'yargs';
import { statsConfig } from './stats';
import { webpackConfig } from './webpack-config';

export const command = 'build';
export const describe = 'Build site';
export const builder: {[key: string]: Options} = {
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
};

interface IArgv {
  prod: boolean;
  theme?: string;
}

export function handler(argv: IArgv) {
  const mode = argv.prod ? 'production' : 'development';
  const theme = argv.theme;

  webpack(webpackConfig({mode, theme}), (err: any, stats: any) => {
    if (err) {
      process.stderr.write(err + '\n');
      process.exit(1);
    }

    process.stdout.write(stats.toString(statsConfig) + '\n');

    process.exit(0);
  });
}

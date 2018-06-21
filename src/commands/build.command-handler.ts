import * as webpack from 'webpack';
import { statsConfig } from '../stats';
import { webpackConfig } from '../webpack-config';

interface IArgv {
  prod: boolean;
  theme?: string;
  deployUrl?: string;
}

export function handler(argv: IArgv) {
  const mode = argv.prod ? 'production' : 'development';
  const theme = argv.theme;

  webpack(webpackConfig({mode, theme, deployUrl: argv.deployUrl}), (err: any, stats: any) => {
    if (err) {
      process.stderr.write(err + '\n');
      process.exit(1);
    }

    process.stdout.write(stats.toString(statsConfig) + '\n');

    process.exit(0);
  });
}

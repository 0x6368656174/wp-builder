import { existsSync } from 'fs';
import { join } from 'path';
import * as webpack from 'webpack';
import { readConfig } from './config-read';

export class SuppressChunksPlugin {
  public apply(compiler: webpack.Compiler) {
    const wpConfig = readConfig();
    const project = wpConfig.themes[wpConfig.defaultTheme];
    const context = join(process.cwd(), project.root);

    const skipChunkNames = ['style', 'vendors', 'commons', 'runtime'];
    const breakpoints = Object.keys(project.breakpoints || {}).map(breakpoint => `style.${breakpoint}`);
    skipChunkNames.push(...breakpoints);

    compiler.hooks.shouldEmit.tap('SuppressChunksPlugin', (compilation: webpack.compilation.Compilation) => {
      for (const chunk of compilation.chunks) {
        if (skipChunkNames.indexOf(chunk.name) !== -1) {
          continue;
        }

        const jsFile = join(context, chunk.name + '.js');
        const tsFile = join(context, chunk.name + '.ts');
        if (!existsSync(jsFile) && !existsSync(tsFile)) {
          // Удалим js и js.map
          const js = chunk.files.filter((file: string) => file.match(/\.js$/));
          const jsMap = chunk.files.filter((file: string) => file.match(/\.js\.map$/));
          delete compilation.assets[js];
          delete compilation.assets[jsMap];
        }
      }

      // // Удалим js и js.map для стилей
      // delete compilation.assets['style.js'];
      // delete compilation.assets['style.js.map'];
      return true;
    });
  }
}

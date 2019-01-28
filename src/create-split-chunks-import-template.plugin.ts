import { existsSync, writeFileSync } from 'fs';
import * as mkdirp from 'mkdirp';
import { join, parse } from 'path';
import { Compiler } from 'webpack';
import * as webpack from 'webpack';
import Compilation = webpack.compilation.Compilation;
import { version } from './version';

export class CreateSplitChunksImportTemplatePlugin {
  private chunkNames = ['runtime', 'vendors', 'commons'];

  private sort(leftFileName: string, rightFileName: string): number {
    const leftBaseName = parse(leftFileName).name;
    const rightBaseName = parse(rightFileName).name;

    return this.chunkNames.indexOf(leftBaseName) > this.chunkNames.indexOf(rightBaseName) ? 1 : -1;
  }

  apply(compiler: Compiler) {
    const isDevelopment = compiler.options.mode === 'development';
    const versionString = `?ver=${version(isDevelopment)}`;

    const jsChunkNames = this.chunkNames.map(chunk => chunk + '.js');
    const cssChunkNames = this.chunkNames.map(chunk => chunk + '.css');

    compiler.hooks.afterEmit.tap('CreateSplitChunksImportTemplatePlugin',  (compilation: Compilation) => {
      const assets = Object.keys(compilation.assets);
      const js = [];
      const css = [];
      for (const asset of assets) {
        if (jsChunkNames.indexOf(asset) !== -1) {
          js.push(asset);
        }
        if (cssChunkNames.indexOf(asset) !== -1) {
          css.push(asset);
        }
      }

      const twig = js
          .sort((left, right) => this.sort(left, right))
          .map(script => `<script type="text/javascript" src="{{ __theme_path }}/${script}${versionString}" defer></script>`)
          .join('\n')
        + '\n\n'
        + css
          .sort((left, right) => this.sort(left, right))
          .map(style => `<link rel="stylesheet"  type="text/css" href="{{ __theme_path }}/${style}${versionString}">`)
          .join('\n');

      const outputPath = (compiler.options.output || {}).path || '';
      const viewsFolder = join(outputPath, 'Resources', 'views');
      if (!existsSync(viewsFolder)) {
        mkdirp.sync(viewsFolder);
      }
      writeFileSync(join(viewsFolder, '__split-chunks.twig'), twig);
      return true;
    });
  }
}

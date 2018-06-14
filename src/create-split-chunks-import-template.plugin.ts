import { writeFileSync } from 'fs';
import * as mkdirp from 'make-dir';
import { join } from 'path';
import { Compiler } from 'webpack';
import * as webpack from 'webpack';
import Compilation = webpack.compilation.Compilation;
import { version } from './version';

export class CreateSplitChunksImportTemplatePlugin {
  public apply(compiler: Compiler) {
    const isDevelopment = compiler.options.mode === 'development';
    const versionString = `?ver=${version(isDevelopment)}`;

    const chunkNames = ['vendors', 'commons', 'runtime'];
    const jsChunkNames = chunkNames.map(chunk => chunk + '.js');
    const cssChunkNames = chunkNames.map(chunk => chunk + '.css');

    compiler.hooks.afterEmit.tap('CreateSplitChunksImportTemplatePlugin', async (compilation: Compilation) => {
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
          .map(script => `<script type="text/javascript" src="{{ theme.path }}/${script}${versionString}" defer></script>`)
          .join('\n')
        + css
          .map(style => `<link rel="stylesheet"  type="text/css" href="{{ theme.path }}/${style}${versionString}">`)
          .join('\n');

      const outputPath = (compiler.options.output || {}).path || '';
      await mkdirp(join(outputPath, 'views'));
      writeFileSync(join(outputPath, 'views', '_split-chunks.twig'), twig);
      return true;
    });
  }
}

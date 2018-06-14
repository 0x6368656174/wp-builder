import { writeFileSync } from 'fs';
import * as mkdirp from 'make-dir';
import { basename, extname, join } from 'path';
import { Compiler } from 'webpack';
import * as webpack from 'webpack';
import Compilation = webpack.compilation.Compilation;
import { readConfig } from './config-read';

export class JqueryDepedensePlugin {
  public apply(compiler: Compiler) {
    const wpConfig = readConfig();

    const ignoreNames = ['style.js', 'vendors.js', 'commons.js', 'runtime.js'];

    compiler.hooks.afterEmit.tap('CreateSplitChunksImportTemplatePlugin', async (compilation: Compilation) => {
      const assets = Object.keys(compilation.assets);
      let hasJs = false;
      for (const asset of assets) {
        const assetName = basename(asset);
        if (extname(assetName) !== '.js') {
          continue;
        }

        if (ignoreNames.indexOf(assetName) === -1) {
          hasJs = true;
          break;
        }
      }

      if (!hasJs) {
        return true;
      }

      const php = `<?php

add_action( 'wp_enqueue_scripts', function () {
  wp_register_script('${wpConfig.defaultTheme}-jquery-script', '', array('jquery'));
  wp_enqueue_script('${wpConfig.defaultTheme}-jquery-script');
});`;

      const outputPath = (compiler.options.output || {}).path || '';
      await mkdirp(join(outputPath, 'functions.php.d'));
      writeFileSync(join(outputPath, 'functions.php.d', '_JQuery.php'), php);
      return true;
    });
  }
}
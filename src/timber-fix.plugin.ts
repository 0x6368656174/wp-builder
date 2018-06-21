import { existsSync, writeFileSync } from 'fs';
import * as mkdirp from 'make-dir';
import { join } from 'path';
import { Compiler } from 'webpack';
import * as webpack from 'webpack';
import Compilation = webpack.compilation.Compilation;

export class TimberFixPlugin {
  public apply(compiler: Compiler) {
    compiler.hooks.afterEmit.tap('TimberFixPlugin', async (compilation: Compilation) => {

      const php = `<?php

declare(strict_types=1);

use Timber\\URLHelper;
use Timber\\Theme;

add_filter('timber/context', function ($context) {
  /** @var Theme $theme */
  $theme = $context['theme'];
  $context['__theme_path'] = URLHelper::get_rel_url($theme->link(), true);

  return $context;
});`;

      const outputPath = (compiler.options.output || {}).path || '';
      const functionsFolder = join(outputPath, 'functions.php.d');
      if (!existsSync(functionsFolder)) {
        await mkdirp(functionsFolder);
      }
      writeFileSync(join(functionsFolder, '__timber-fix.php'), php);
      return true;
    });
  }
}

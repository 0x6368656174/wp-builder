import { existsSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';
import { Compiler } from 'webpack';
import * as webpack from 'webpack';
import Compilation = webpack.compilation.Compilation;
import {JqueryDependencePlugin} from './jquery-dependence.plugin';
import {TimberFixPlugin} from './timber-fix.plugin';
import {readConfig} from './config-read';
import * as mkdirp from 'mkdirp';

export class FunctionsPhpPlugin {
  public apply(compiler: Compiler) {
    compiler.hooks.afterEmit.tap('FunctionsPhpPlugin',  (compilation: Compilation) => {

      const outputPath = (compiler.options.output || {}).path || '';

      // Допишим require_once в functions.php
      const functionsFilePath = join(outputPath, 'functions.php');

      let content = `<?php

/** AUTO GENERATED BY functions-php.plugin **/
declare(strict_types=1);

require_once __DIR__.'/../../../vendor/autoload.php';

use Timber\\Timber;

$timber = new Timber();
$timber::$dirname = ['Resources/views', 'views'];

`;

      const wpConfig = readConfig();
      const themeName = wpConfig.defaultTheme;
      const theme = wpConfig.themes[themeName];
      const context = join(process.cwd(), theme.root);

      if (existsSync(join(context, 'functions.php'))) {
        content += `require_once __DIR__.'/__functions.php';\n`;
      }
      content += `/** END **/\n`;

      content += JqueryDependencePlugin.getContent(compiler, compilation);
      content += TimberFixPlugin.getContent();

      if (!existsSync(outputPath)) {
        mkdirp.sync(outputPath);
      }
      writeFileSync(functionsFilePath, content);
      return true;
    });
  }
}
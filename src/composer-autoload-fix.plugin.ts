import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { Compiler } from 'webpack';
import * as webpack from 'webpack';
import Compilation = webpack.compilation.Compilation;

export class ComposerAutoloadFixPlugin {
  public apply(compiler: Compiler) {
    compiler.hooks.afterEmit.tap('ComposerAutoloadFixPlugin', async (compilation: Compilation) => {
      const staticAutoloadPath = join(process.cwd(), 'dist', 'vendor', 'composer', 'autoload_static.php');
      const staticAutoload = readFileSync(staticAutoloadPath, 'utf-8');
      const fixedStaticAutoload = staticAutoload.replace(/'\/\.\.\/\.\.\/\.\.'\s*\.\s*'\/dist/g, "'/../..' . '");
      writeFileSync(staticAutoloadPath, fixedStaticAutoload);

      const psr4AutoloadPath = join(process.cwd(), 'dist', 'vendor', 'composer', 'autoload_psr4.php');
      const psr4Autoload = readFileSync(psr4AutoloadPath, 'utf-8');
      const fixedPsr4Autoload = psr4Autoload.replace(/\$baseDir\s*\.\s*'\/dist\//g, "$baseDir . '/");
      writeFileSync(psr4AutoloadPath, fixedPsr4Autoload);
    });
  }
}

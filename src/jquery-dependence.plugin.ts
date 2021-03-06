import { basename, extname } from 'path';
import * as webpack from 'webpack';
import { readConfig } from './config-read';

export class JqueryDependencePlugin {
  public static getContent(compiler: webpack.Compiler, compilation: webpack.compilation.Compilation) {
    const wpConfig = readConfig();

    const ignoreNames = ['style.js', 'vendors.js', 'commons.js', 'runtime.js'];

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

    // Допишим require_once в functions.php
    return `
/** AUTO GENERATED BY jquery-dependence.plugin **/
add_action( 'wp_enqueue_scripts', function () {
  wp_register_script('${wpConfig.defaultTheme}-jquery-script', '', array('jquery'));
  wp_enqueue_script('${wpConfig.defaultTheme}-jquery-script');
});
/** END **/
`;
  }
}

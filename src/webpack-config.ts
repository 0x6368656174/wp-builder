import * as CleanWebpackPlugin from 'clean-webpack-plugin';
import * as CopyWebpackPlugin from 'copy-webpack-plugin';
import * as cssnano from 'cssnano';
import * as ExtractTextPlugin from 'extract-text-webpack-plugin';
import { existsSync, readFileSync } from 'fs';
import * as glob from 'glob';
import * as ExtractCssPlugin from 'mini-css-extract-plugin';
import { join, normalize, resolve } from 'path';
import * as postcssPresetEnv from 'postcss-preset-env';
import * as webpack from 'webpack';
import * as WebpackNotifier from 'webpack-notifier';
import {ComposerAutoloadFixPlugin} from './composer-autoload-fix.plugin';
import { readConfig } from './config-read';
import { CreateSplitChunksImportTemplatePlugin } from './create-split-chunks-import-template.plugin';
import SplitChunksOptions = webpack.Options.SplitChunksOptions;
import {FunctionsPhpPlugin} from './functions-php.plugin';
import { SuppressChunksPlugin } from './suppress-chunks.plugin';
import { version } from './version';

interface IConfigParams {
  mode: 'development' | 'production';
  liveReloadEnable?: boolean;
  theme?: string;
  deployUrl?: string;
}

function testConfig() {
  // const wpConfig = readConfig();

  // for (const [themeName, theme] of Object.entries(wpConfig.themes)) {
  //   const breakpoints = Object.keys(theme.breakpoints || {});
  //
  //   if (breakpoints.indexOf('common') !== -1) {
  //     throw new Error(`Breakpoint name "common" is reserved!`
  //       + ` Check breakpoints in "${themeName}" theme in wp-config.json`);
  //   }
  // }
}

export function webpackConfig(params: IConfigParams): webpack.Configuration {
  // Проверим конфигу
  testConfig();

  const isDevelopment = params.mode === 'development';
  const liveReloadEnable = params.liveReloadEnable || false;
  const wpConfig = readConfig();

  const themeName = params.theme || wpConfig.defaultTheme;
  const theme = wpConfig.themes[themeName];

  if (!theme) {
    throw new Error(`Not found configuration for theme "${themeName}"`);
  }

  const context = join(process.cwd(), theme.root);

  const outputPublicPath = `/wp-content/themes/${themeName}/`;
  const outputPath = resolve(process.cwd(), wpConfig.build.outputPath, outputPublicPath.substr(1));

  const extractTwigPlugin = new ExtractTextPlugin({
    filename: '[name].twig',
  });

  const extractStylePlugin = new ExtractCssPlugin({
    filename: '[name].css',
  });

  const postcssCssNextPlugins = [
    (postcssPresetEnv as any)(),
  ];

  if (!isDevelopment) {
    postcssCssNextPlugins.push((cssnano as any)({autoprefixer: false}));
  }

  function createSplitChunks(): SplitChunksOptions {
    // const breakpoints = Object.keys(theme.breakpoints || {});
    // const breakpointEnds = breakpoints.map(breakpoint => {
    //   return [
    //     `.${breakpoint}.scss`,
    //     `.${breakpoint}.sass`,
    //     `.${breakpoint}.css`,
    //   ];
    // });
    // const breakpointFlatEnds = flatten(breakpointEnds);

    const chunks: SplitChunksOptions = {
      cacheGroups: {
        // В commons.js будет содержаться все, что используется больше чем в 2 модулях
        commons: {
          chunks: 'initial',
          minChunks: 2,
          minSize: 0,
          name: 'commons',
          priority: -10,
          test: /\.[jt]s$/,
        },
        // editorStyle: {
        //   chunks: 'all',
        //   enforce: true,
        //   name: 'editor-style',
        //   test: m => m.constructor.name === 'CssModule' && recursiveIssuerName(m) === 'editor-style',
        // },
        // // Все стили вынесем в style.css
        // style: {
        //   chunks: 'all',
        //   enforce: true,
        //   name: 'style',
        //   priority: -10,
        //   test: m => {
        //     if (m.constructor.name !== 'CssModule') {
        //       return false;
        //     }
        //
        //     if (recursiveIssuerName(m) === 'editor-style') {
        //       return false;
        //     }
        //
        //     const fileName = m.issuer.resource.toLowerCase();
        //
        //     for (const breakpointEnd of breakpointFlatEnds) {
        //       if (fileName.endsWith(breakpointEnd)) {
        //         return false;
        //       }
        //     }
        //
        //     return true;
        //   },
        // },
        // В vendors.js будет содержаться все, что из node_modules
        vendors: {
          chunks: 'all',
          minSize: 0,
          name: 'vendors',
          test: /[\\/]node_modules[\\/]/,
        },
      },
    };

    // for (const breakpoint of breakpoints) {
    //   (chunks.cacheGroups as any)[`style.${breakpoint}`] = {
    //     chunks: 'all',
    //     enforce: true,
    //     name: `style.${breakpoint}`,
    //     priority: -10,
    //     test: (m: any) => {
    //       if (m.constructor.name !== 'CssModule') {
    //         return false;
    //       }
    //
    //       if (recursiveIssuerName(m) === 'editor-style') {
    //         return false;
    //       }
    //
    //       const fileName = m.issuer.resource.toLowerCase();
    //
    //       for (const breakpointEnd of breakpointFlatEnds) {
    //         if (fileName.endsWith(breakpointEnd)) {
    //           return true;
    //         }
    //       }
    //
    //       return false;
    //     },
    //   };
    // }

    return chunks;
  }

  function nodeModulesPath() {
    const main = require.main;
    if (!main) {
      throw new Error('Not found main');
    }

    return main.paths;
  }

  function styleBannerContent() {
    const styleCssContent = readFileSync(resolve(context, 'style.css'), 'utf-8');
    const versionString = version(isDevelopment);
    return styleCssContent.replace(/Version:.*/, `Version: ${versionString}`);
  }

  const outputPluginsPath = resolve(process.cwd(), wpConfig.build.outputPath, `wp-content/plugins/`);
  function getPlugins() {
    if (!theme.usedPlugins) {
      return [];
    }
    return theme.usedPlugins.map(plugin => {
      if (!wpConfig.plugins) {
        throw new Error('Not found plugins section in config');
      }

      const pluginConfig = wpConfig.plugins[plugin];
      if (!pluginConfig) {
        throw new Error(`Not found plugin "${plugin}" section in config`);
      }

      return {
        from: join(process.cwd(), pluginConfig.root, '**/*'),
        to: join(outputPluginsPath, plugin),
      };
    });
  }

  function getAsserts() {
    const asserts = theme.asserts || [];
    return asserts.map(assert => {
      return {
        from: assert,
        to: outputPath,
      };
    });
  }

  function recursiveIssuerName(m: any): string | false {
    if (m.issuer) {
      return recursiveIssuerName(m.issuer);
    } else if (m.name) {
      return m.name;
    } else {
      return false;
    }
  }

  function testCss(file: string, breakpoint: string = ''): string | false {
    breakpoint = breakpoint ? `.${breakpoint}` : '';
    const scssFile = file.replace(/\.twig$/, `${breakpoint}.scss`);
    const sassFile = file.replace(/\.twig$/, `${breakpoint}.sass`);
    const cssFile = file.replace(/\.twig$/, `${breakpoint}.css`);

    if (existsSync(scssFile)) {
      return scssFile;
    } else if (existsSync(sassFile)) {
      return sassFile;
    } else if (existsSync(cssFile)) {
      return cssFile;
    }

    return false;
  }

  return {
    context,
    devtool: isDevelopment ? 'source-map' : false,
    entry: () => {
      const styleEntry: string[] = [];
      // Прочитаем брекйпоинты
      const breakpoints = Object.keys(theme.breakpoints || {});
      const breakpointsEntries: {[key: string]: string[]} = {};
      for (const breakpoint of breakpoints) {
        breakpointsEntries[breakpoint] = [];
      }
      // Добавим шаблоны и скрипты для них
      const files = glob.sync(`${context}/**/*.twig`);
      const entries = files.map(file => {
        const result = [file];

        const tsFile = file.replace(/\.twig$/, '.ts');
        const jsFile = file.replace(/\.twig$/, '.js');
        if (existsSync(tsFile)) {
          result.push(tsFile);
        } else if (existsSync(jsFile)) {
          result.push(jsFile);
        }

        const originalStyleTest = testCss(file);
        if (originalStyleTest) {
          styleEntry.push(originalStyleTest);
          // result.push(originalStyleTest);
        }

        for (const breakpoint of breakpoints) {
          const breakpointTest = testCss(file, breakpoint);
          if (breakpointTest) {
            // result.push(breakpointTest);
            breakpointsEntries[breakpoint].push(breakpointTest);
          }
        }

        const filePath = file.replace(new RegExp(`^${context}/`), '');
        const fileName = filePath.replace(/\.twig$/, '');

        return {[fileName]: result};
      });

      // Добавим стили
      entries.push({style: styleEntry});
      for (const [breakpointName, entryFiles] of Object.entries(breakpointsEntries)) {
        entries.push({[`style.${breakpointName}`]: entryFiles});
      }

      // Добавим стили редактора
      const editorStyleScss = join(context, 'editor-style.scss');
      const editorStyleSass = join(context, 'editor-style.sass');
      const editorStyleCss = join(context, 'editor-style.css');
      if (existsSync(editorStyleScss)) {
        entries.push({'editor-style': [editorStyleScss]});
      } else if (existsSync(editorStyleSass)) {
        entries.push({'editor-style': [editorStyleSass]});
      } else if (existsSync(editorStyleCss)) {
        entries.push({'editor-style': [editorStyleCss]});
      }

      // FIXME: Убрать any, когда в определнии вебпака починят EntryFunc
      return entries.reduce((result, val) => {
        return {...result, ...val};
      }, {}) as any;
    },
    // Будем использовать jQuery WordPress'a
    externals: {
      jquery: 'jQuery',
    },
    mode: isDevelopment ? 'development' : 'production',
    module: {
      rules: [
        {
          test: /\.twig$/,
          use: extractTwigPlugin.extract({
              use: [
                {
                  loader: 'html-loader',
                },
                {
                  loader: 'add-assets.loader',
                  options: {
                    liveReloadEnable,
                    mode: isDevelopment ? 'development' : 'production',
                  },
                },
              ],
            },
          ),
        },
        {
          exclude: /(node_modules|bower_components)/,
          test: /\.js$/,
          use: {
            loader: 'babel-loader',
            options: {
              babelrc: false,
              cacheDirectory: true,
              plugins: ['@babel/plugin-transform-runtime'],
              presets: ['@babel/preset-env'],
            },
          },
        },
        {
          test: /\.ts$/,
          use: [
            {
              loader: 'ts-loader',
            },
          ],
        },
        {
          test: /\.s?[ac]ss$/,
          use: [
            ExtractCssPlugin.loader,
            {
              loader: 'css-loader',
              options: {
                sourceMap: isDevelopment,
              },
            },
            {
              loader: 'postcss-loader',
              options: {
                plugins: postcssCssNextPlugins,
                sourceMap: isDevelopment,
              },
            },
            {
              // Используем, для того, чтоб в scss правильно резелвились url()
              loader: 'resolve-url-loader',
            },
            {
              loader: 'sass-loader',
              options: {
                // Для Sass-loader source map должен геренироваться всегда, иначен е будет работать resolve-url-loader
                sourceMap: true,
              },
            },
          ],
        },
        {
          test: /\.(png|jpg|jpeg|gif|svg|ttf|woff|woff2|eot)$/,
          use: [
            {
              loader: 'url-loader',
              options: {
                limit: 8192,
                outputPath: 'assets/',
              },
            },
          ],
        },
      ],
    },
    optimization: {
      runtimeChunk: 'single',
      splitChunks: createSplitChunks(),
    },
    output: {
      filename: '[name].js',
      path: outputPath,
      publicPath: params.deployUrl ? normalize(join('/', params.deployUrl, outputPublicPath)) : outputPublicPath,
    },
    performance: {
      hints: false, // Уберем предупреждения
    },
    plugins: [
      extractTwigPlugin,
      extractStylePlugin,
      new webpack.BannerPlugin({
        banner: styleBannerContent(),
        raw: true,
        test: /^style.css/,
      }),
      new SuppressChunksPlugin(),
      new FunctionsPhpPlugin(),
      new CopyWebpackPlugin([
        ...getAsserts(),
        ...getPlugins(),
        {
          from: 'functions.php',
          to: join(outputPath, '__functions.php'),
        },
        {
          from: '**/*.php',
          ignore: ['functions.php'],
          to: outputPath,
        },
        {
          from: 'screenshot.png',
          to: outputPath,
        },
      ]),
      new CleanWebpackPlugin([outputPath], {root: join(process.cwd(), wpConfig.build.outputPath), verbose: false}),
      new CreateSplitChunksImportTemplatePlugin(),
      new ComposerAutoloadFixPlugin(),
      // // Добавим глобальный объявления для jQuery
      new webpack.ProvidePlugin({
        '$'                : 'jquery',
        'jQuery'           : 'jquery',
        'window.$'         : 'jquery',
        'window.jQuery'    : 'jquery',
      }),
      new WebpackNotifier({
        title: 'wp-build',
      }),
    ],
    resolve: {
      // Добавим ts, чтоб правильно компилировался TypeScript
      extensions: ['.ts', '.js', '.json'],
    },
    resolveLoader: {
      // Модули (лоадеры) будем искать в node_modules и в папке со скриптом
      modules: [...nodeModulesPath(), __dirname],
    },
    target: 'web',
  };
}

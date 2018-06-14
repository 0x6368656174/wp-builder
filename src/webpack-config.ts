import * as CleanWebpackPlugin from 'clean-webpack-plugin';
import * as CopyWebpackPlugin from 'copy-webpack-plugin';
import { CreateSplitChunksImportTemplatePlugin } from './create-split-chunks-import-template.plugin';
import { JqueryDepedensePlugin } from './jquery-depedense.plugin';
import * as cssnano from 'cssnano';
import * as ExtractTextPlugin from 'extract-text-webpack-plugin';
import { existsSync, readFileSync } from 'fs';
import * as glob from 'glob';
import * as ExtractCssPlugin from 'mini-css-extract-plugin';
import { join, resolve } from 'path';
import * as postcssPresetEnv from 'postcss-preset-env';
import { Configuration } from 'webpack';
import * as webpack from 'webpack';
import { readConfig } from './config-read';
import { SuppressChunksPlugin } from './suppress-chunks.plugin';
import { version } from './version';

interface IConfigParams {
  mode: 'development' | 'production';
  serve?: boolean;
  theme?: string;
}

export function webpackConfig(params: IConfigParams): Configuration {
  const isDevelopment = params.mode === 'development';
  const serve = params.serve || false;
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

  function getAsserts() {
    const asserts = theme.asserts || [];
    return asserts.map(assert => {
      return {
        from: assert,
        to: outputPath,
      };
    });
  }

  function recursiveIssuer(m: any): string | false {
    if (m.issuer) {
      return recursiveIssuer(m.issuer);
    } else if (m.name) {
      return m.name;
    } else {
      return false;
    }
  }

  return {
    context,
    devtool: isDevelopment ? 'source-map' : false,
    entry: () => {
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

        const scssFile = file.replace(/\.twig$/, '.scss');
        const sassFile = file.replace(/\.twig$/, '.sass');
        const cssFile = file.replace(/\.twig$/, '.css');
        if (existsSync(scssFile)) {
          result.push(scssFile);
        } else if (existsSync(sassFile)) {
          result.push(sassFile);
        } else if (existsSync(cssFile)) {
          result.push(cssFile);
        }

        const filePath = file.replace(new RegExp(`^${context}/`), '');
        const fileName = filePath.replace(/\.twig$/, '');

        return {[fileName]: result};
      });

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
                    mode: isDevelopment ? 'development' : 'production',
                    serve,
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
                minimize: !isDevelopment,
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
          test: /\.(png|jpg|gif|svg|ttf|woff|woff2|eot)$/,
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
      splitChunks: {
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
          editorStyle: {
            chunks: 'all',
            enforce: true,
            name: 'editor-style',
            test: m => m.constructor.name === 'CssModule' && recursiveIssuer(m) === 'editor-style',
          },
          // Все стили вынесем в style.css
          style: {
            chunks: 'all',
            enforce: true,
            name: 'style',
            priority: -10,
            test: m => m.constructor.name === 'CssModule' && recursiveIssuer(m) !== 'editor-style',
          },
          // В vendors.js будет содержаться все, что из node_modules
          vendors: {
            chunks: 'all',
            minSize: 0,
            name: 'vendors',
            test: /[\\/]node_modules[\\/]/,
          },
        },
      },
    },
    output: {
      filename: '[name].js',
      path: outputPath,
      publicPath: outputPublicPath,
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
      new CreateSplitChunksImportTemplatePlugin(),
      new JqueryDepedensePlugin(),
      new CopyWebpackPlugin([
        ...getAsserts(),
        {
          from: `**/*.php`,
          to: outputPath,
        },
        {
          from: `screenshot.png`,
          to: outputPath,
        },
      ]),
      new CleanWebpackPlugin([outputPath], {root: join(process.cwd(), wpConfig.build.outputPath), verbose: false}),
      // // Добавим глобальный объявления для jQuery
      new webpack.ProvidePlugin({
        '$'                : 'jquery',
        'jQuery'           : 'jquery',
        'window.$'         : 'jquery',
        'window.jQuery'    : 'jquery',
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

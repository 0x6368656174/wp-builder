import * as cssnano from 'cssnano';
import * as ExtractTextPlugin from 'extract-text-webpack-plugin';
import {existsSync, readFileSync} from 'fs';
import { short } from 'git-rev-sync';
import * as glob from 'glob';
import * as ExtractCssPlugin from 'mini-css-extract-plugin';
import { join, resolve } from 'path';
import * as postcssCssNext from 'postcss-cssnext';
import { Configuration } from 'webpack';
import * as webpack from 'webpack';
import { readConfig } from './config-read';

interface IConfigParams {
  mode: 'development' | 'production';
}

export function webpackConfig(params: IConfigParams): Configuration {
  const isDevelopment = params.mode === 'development';

  const wpConfig = readConfig();
  const project = wpConfig.projects[wpConfig.defaultProject];
  const context = join(process.cwd(), project.root);

  const themeName = project.build.themeName || 'project-theme';
  const outputPublicPath = `/wp-content/themes/${themeName}/`;
  const outputPath = resolve(process.cwd(), project.build.outputPath, outputPublicPath.substr(1));

  const extractTwigPlugin = new ExtractTextPlugin({
    filename: '[name].twig',
  });

  const extractStylePlugin = new ExtractCssPlugin({
    filename: '[name].css',
  });

  const postcssCssNextPlugins = [
    (postcssCssNext as any)(),
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
    const version = !isDevelopment ? short(process.cwd()) : 'dev';
    return styleCssContent.replace(/Version:.*$/, `Version: ${version}`);
  }

  return {
    context: process.cwd(),
    devtool: 'source-map',
    entry: () => {
      // Добавим шаблоны и скрипты для них
      const files = glob.sync(`${context}/**/*.twig`);
      const entries = files.map(file => {
        const result = [file];

        // if (!onlyTwig) {
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
        // }

        const filePath = file.replace(new RegExp(`^${context}/`), '');
        const fileName = filePath.replace(/\.twig$/, '');

        if (result.length === 1) {
          return {[fileName]: result[0]};
        } else {
          return {[fileName]: result};
        }
      });

      // Добавим стили редактора
      const editorStyleCss = project.style || 'editor-style.css';
      if (existsSync(join(context, editorStyleCss))) {
        entries.push({'editor-style': resolve(context, editorStyleCss)});
      }

      // FIXME: Убрать any, когда в определнии вебпака починят EntryFunc
      return entries.reduce((result, val) => {
        return {...result, ...val};
      }, {}) as any;
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
                  },
                },
              ],
            },
          ),
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
              },
            },
            {
              loader: 'postcss-loader',
              options: {
                plugins: postcssCssNextPlugins,
              },
            },
            {
              loader: 'resolve-url-loader',
            },
            {
              loader: 'sass-loader',
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
      splitChunks: {
        cacheGroups: {
          // В commons.js будет содержаться все, что используется больше чем в 2 модулях
          commons: {
            chunks: 'initial',
            minChunks: 2,
            minSize: 0,
            name: 'commons',
            priority: -10,
          },
          // Все стили вынесем в style.css
          styles: {
            chunks: 'all',
            enforce: true,
            name: 'style',
            test: /\.s?[ac]ss$/,
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
        test: /style.css/,
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

import { existsSync } from 'fs';
import { getOptions } from 'loader-utils';
import { basename, join } from 'path';
import { readConfig } from './config-read';
import * as webpack from 'webpack';
import LoaderContext = webpack.loader.LoaderContext;
import {version} from './version';

function isBase(resourceBaseName: string, mainTemplates: string[]) {
  return mainTemplates.indexOf(resourceBaseName) !== -1;
}

module.exports = function(this: LoaderContext, content: string): string {
  const options = getOptions(this);

  const wpConfig = readConfig();
  const project = wpConfig.themes[wpConfig.defaultTheme];
  const context = join(process.cwd(), project.root);
  const outputPath = '{{ theme.path }}';
  const isDevelopment = options.mode === 'development';
  const versionString = `?v=${version(isDevelopment)}`;

  const resourceBaseName = basename(this.resourcePath);

  let jsDistFile;

  const jsFile = this.resourcePath.replace(/\.twig$/, '.js');
  const tsFile = this.resourcePath.replace(/\.twig$/, '.ts');
  if (existsSync(jsFile) || existsSync(tsFile)) {
    jsDistFile = this.resourcePath.replace(context, outputPath).replace(/\.twig$/, '.js');
  }

  const script = `<script  type="text/javascript" src="${jsDistFile}${versionString}" defer></script>\n`;

  if (isBase(resourceBaseName, project.mainTemplates)) {
    let headScripts = '';

    // Добавим vendors.js
    headScripts += `<script type="text/javascript" src="{{ theme.path }}/vendors.js${versionString}" defer></script>\n`;

    // Добавим commons.js
    headScripts += `<script type="text/javascript" src="{{ theme.path }}/commons.js${versionString}" defer></script>\n`;

    // Если dev, то добавим скрипт вебпака
    if (isDevelopment) {
      headScripts += '<script type="text/javascript" src="http://localhost:4201/webpack-dev-server.js" defer></script>\n';
    }

    // Добавим скрипты в head
    content = content.replace('</head>', `${headScripts}</head>`);

    let baseScripts = '';

    // Если есть скрип для base, то добавим его
    if (jsDistFile) {
      baseScripts += script;
    }

    // Добавим блок для js
    baseScripts = `{% block js %}\n${baseScripts}{% endblock %}\n`;

    // Добавим срипты
    content = content.replace('</body>', `${baseScripts}</body>`);

    content = content.replace('</head>',
      `<link rel="stylesheet"  type="text/css" href='{{ theme.path }}/style.css${versionString}'>\n</head>`);
  } else {
    // Для остальных шаблонов
    if (jsDistFile) {
      // Если шаблон расширяет другой шаблон
      if (/{%\s+extends/.test(content)) {
        // Переопределим блок js и добавим в него скрипт
        content += `{% block js %}\n{{ parent() }}\n${script}{% endblock %}\n`;
      } else {
        // Создалим блок js и добавим в него скрипт
        content += `{% block js %}\n${script}{% endblock %}\n`;
        // content += `{% block js %}{% endblock %}\n`;
        // content += script;
      }
    }
  }

  return content;
};

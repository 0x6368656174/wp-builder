import { existsSync } from 'fs';
import { getOptions } from 'loader-utils';
import { basename, join } from 'path';
import { readConfig } from './config-read';
import * as webpack from 'webpack';
import LoaderContext = webpack.loader.LoaderContext;
import { version } from './version';

function isBase(resourceBaseName: string, mainTemplates: string[]) {
  return mainTemplates.indexOf(resourceBaseName) !== -1;
}

module.exports = function(this: LoaderContext, content: string): string {
  const options = getOptions(this);

  const wpConfig = readConfig();
  const project = wpConfig.themes[wpConfig.defaultTheme];
  const context = join(process.cwd(), project.root);
  const outputPath = '{{ __theme_path }}';
  const isDevelopment = options.mode === 'development';
  const liveReloadEnable = options.liveReloadEnable;
  const versionString = `?ver=${version(isDevelopment)}`;
  const breakpoints = project.breakpoints || {};
  const breakpointNames = Object.keys(breakpoints);

  const resourceBaseName = basename(this.resourcePath);

  let jsDistFile;

  const jsFile = this.resourcePath.replace(/\.twig$/, '.js');
  const tsFile = this.resourcePath.replace(/\.twig$/, '.ts');
  if (existsSync(jsFile) || existsSync(tsFile)) {
    jsDistFile = this.resourcePath.replace(context, outputPath).replace(/\.twig$/, '.js');
  }

  const script = `<script  type="text/javascript" src="${jsDistFile}${versionString}" defer></script>\n`;

  if (isBase(resourceBaseName, project.mainTemplates)) {
    // Добавим vendors, runtime, common
    content = content.replace('</head>', `{% include '__split-chunks.twig'%}\n</head>`);

    let headScripts = '';

    // // Добавим runtime.js
    // headScripts += `<script type="text/javascript" src="${outputPath}/runtime.js${versionString}" defer></script>\n`;
    //
    // // Добавим vendors.js
    // headScripts += `<script type="text/javascript" src="${outputPath}/vendors.js${versionString}" defer></script>\n`;
    //
    // // Добавим commons.js
    // headScripts += `<script type="text/javascript" src="${outputPath}/commons.js${versionString}" defer></script>\n`;

    // Добавим style.js, т.к. иначе WebPack не запустит все, что зависит от style
    headScripts += `<script type="text/javascript" src="${outputPath}/style.js${versionString}" defer></script>\n`;

    // Добавим style.js для всех breakpoints
    for (const breakpoint of breakpointNames) {
      headScripts +=
        `<script type="text/javascript" src="${outputPath}/style.${breakpoint}.js${versionString}" defer></script>\n`;
    }

    // Если liveReloadEnable, то добавим скрипт вебпака
    if (liveReloadEnable) {
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

    let headStyles = '';

    // // Добавим vendors.css
    // headStyles += `<link rel="stylesheet"  type="text/css" href="{{ __theme_path }}/vendors.css${versionString}">\n`;

    // Добавим style.css
    headStyles += `<link rel="stylesheet"  type="text/css" href="${outputPath}/style.css${versionString}">\n`;

    // Добавим style.css для всех breakpoints
    for (const breakpoint of breakpointNames) {
      headStyles +=
        `<link rel="stylesheet" type="text/css" href="${outputPath}/style.${breakpoint}.css${versionString}"`
        + ` media="${breakpoints[breakpoint]}">\n`;
    }

    // Добавим стили
    content = content.replace('</head>', `${headStyles}</head>`);
  } else {
    // Для остальных шаблонов
    if (jsDistFile) {
      // Если шаблон расширяет другой шаблон
      const block = /{%\s+extends/.test(content)
        ? `{% block js %}\n{{ parent() }}\n${script}{% endblock %}\n`
        : `{% block js %}\n${script}{% endblock %}\n`;

      const rx = /{%\s*block\s+js\s*%}\s*{%\s*endblock\s*%}/;
      if (rx.test(content)) {
        // Если в шаблоне указан блок для JS, то заменим его
        content = content.replace(rx, block);
      } else {
        // Иначе добавим блок в конец шаблона
        content += block;
      }
    }
  }

  return content;
};

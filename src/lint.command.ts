import { CLIEngine } from 'eslint';
import * as glob from 'glob';
import { extname, isAbsolute, join } from 'path';
import { lint } from 'stylelint';
import { Options } from 'yargs';
import {readConfig} from './config-read';

import {existsSync} from 'fs';
interface IArgv {
  files: string[];
  fix: boolean;
}

export const command = 'lint';
export const describe = 'Lint project';
export const builder: { [key: string]: Options } = {
  files: {
    alias: 'f',
    default: [],
    description: 'Files to lint',
    type: 'array',
  },
  fix: {
    default: false,
    description: 'Fix errors',
    type: 'boolean',
  },
};

async function lintStyles(styles: string[], fix: boolean): Promise<boolean> {
  process.stdout.write('LINT STYLES...\n');

  const defaultConfigFile = join(__dirname, 'starter', '.stylelintrc');
  const configFile = join(process.cwd(), '.stylelintrc');

  const result = await lint({
    configFile: existsSync(configFile) ? configFile : defaultConfigFile,
    files: styles,
    fix,
    formatter: 'string',
  });
  process.stdout.write(result.output);

  const goodStyles = result.results.filter(f => !f.errored);
  for (const file of goodStyles) {
    process.stdout.write(`Style ${file.source} looks good👌\n`);
  }

  return !result.errored;
}

async function lintJs(js: string[], fix: boolean): Promise<boolean> {
  process.stdout.write('\nLINT JS...\n');

  const defaultConfigFile = join(__dirname, 'starter', '.eslintrc');
  const configFile = join(process.cwd(), '.eslintrc');

  const cli = new CLIEngine({
    configFile: existsSync(configFile) ? configFile : defaultConfigFile,
    fix,
  });
  const result = cli.executeOnFiles(js);
  const formatter = cli.getFormatter('stylish');
  process.stdout.write(formatter(result.results));

  const goodJs = result.results.filter(f => f.errorCount === 0 && f.warningCount === 0);
  for (const file of goodJs) {
    process.stdout.write(`JS ${file.filePath} looks good👌\n`);
  }

  if (fix) {
    CLIEngine.outputFixes(result);
  }

  return result.errorCount === 0 && result.warningCount === 0;
}

export async function handler({ files, fix }: IArgv) {
  if (files.length === 0) {
    files = glob.sync(join(process.cwd(), 'src', '**/*'));
  }

  files = files.map(file => {
    return isAbsolute(file) ? file : join(process.cwd(), file);
  });

  const styles = files.filter(file => {
    const ext = extname(file);
    return ext === '.css' || ext === '.scss' || ext === '.sass';
  });

  const cssResult = await lintStyles(styles, fix);

  const js = files.filter(file => {
    const ext = extname(file);
    return ext === '.js';
  });

  const jsResult = await lintJs(js, fix);

  if (cssResult && jsResult) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

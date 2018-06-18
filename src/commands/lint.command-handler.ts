import { CLIEngine } from 'eslint';
import { existsSync, readFileSync } from 'fs';
import * as glob from 'glob';
import { extname, isAbsolute, join } from 'path';
import { lint } from 'stylelint';
import { Configuration, Linter } from 'tslint';

interface IArgv {
  files?: string[];
  showAll: boolean;
  fix: boolean;
}

async function lintStyles(styles: string[], fix: boolean, showAll: boolean): Promise<boolean> {
  process.stdout.write('Lint style files...\n');

  const defaultConfigFile = join(__dirname, '..', 'starter', '.stylelintrc');
  const configFile = join(process.cwd(), '.stylelintrc');

  const result = await lint({
    configFile: existsSync(configFile) ? configFile : defaultConfigFile,
    files: styles,
    fix,
    formatter: 'string',
  });
  process.stdout.write(result.output);

  if (showAll) {
    const goodStyles = result.results.filter(f => !f.errored);
    for (const file of goodStyles) {
      process.stdout.write(`Style ${file.source} looks good👌\n`);
    }
  }

  return !result.errored;
}

async function lintJs(js: string[], fix: boolean, showAll: boolean): Promise<boolean> {
  process.stdout.write('\nLint JavaScript files...\n');

  const defaultConfigFile = join(__dirname, '..', 'starter', '.eslintrc');
  const configFile = join(process.cwd(), '.eslintrc');

  const cli = new CLIEngine({
    configFile: existsSync(configFile) ? configFile : defaultConfigFile,
    fix,
  });
  const result = cli.executeOnFiles(js);
  const formatter = cli.getFormatter('stylish');
  process.stdout.write(formatter(result.results));

  if (showAll) {
    const goodJs = result.results.filter(f => f.errorCount === 0 && f.warningCount === 0);
    for (const file of goodJs) {
      process.stdout.write(`JS ${file.filePath} looks good👌\n`);
    }
  }

  if (fix) {
    CLIEngine.outputFixes(result);
  }

  return result.errorCount === 0 && result.warningCount === 0;
}

async function lintTs(ts: string[], fix: boolean, showAll: boolean): Promise<boolean> {
  process.stdout.write('\nLint TypeScript files...\n');

  const defaultConfigFile = join(__dirname, '..', 'starter', 'tslint.json');
  const configFile = join(process.cwd(), 'tslint.json');

  const options = {
    fix,
    formatter: 'stylish',
  };
  let result = true;
  const goods: string[] = [];

  for (const fileName of ts) {
    const linter = new Linter(options);
    const fileContents = readFileSync(fileName, 'utf-8');
    const configuration = Configuration.findConfiguration(configFile, fileName).results;
    linter.lint(fileName, fileContents, configuration);
    const lintResult = linter.getResult();
    if (lintResult.errorCount > 0 || lintResult.warningCount > 0) {
      result = false;
      process.stdout.write('\n' + lintResult.output + '\n');
    } else {
      goods.push(fileName);
    }
  }

  if (showAll) {
    for (const good of goods) {
      process.stdout.write(`TS ${good} looks good👌\n`);
    }
  }

  return result;
  //
  // const result = cli.executeOnFiles(js);
  // const formatter = cli.getFormatter('stylish');
  // process.stdout.write(formatter(result.results));
  //
  // const goodJs = result.results.filter(f => f.errorCount === 0 && f.warningCount === 0);
  // for (const file of goodJs) {
  //   process.stdout.write(`JS ${file.filePath} looks good👌\n`);
  // }
  //
  // if (fix) {
  //   CLIEngine.outputFixes(result);
  // }
  //
  // return result.errorCount === 0 && result.warningCount === 0;
}

export async function handler({ files, fix, showAll }: IArgv) {
  if (!files || files.length === 0) {
    files = glob.sync(join(process.cwd(), 'src', '**/*'));
  }

  files = files.map(file => {
    return isAbsolute(file) ? file : join(process.cwd(), file);
  });

  const styles = files.filter(file => {
    const ext = extname(file);
    return ext === '.css' || ext === '.scss' || ext === '.sass';
  });

  const cssResult = styles.length > 0 ? await lintStyles(styles, fix, showAll) : true;
  if (styles.length > 0 && cssResult) {
    process.stdout.write('All style looks good👌\n');
  }

  const js = files.filter(file => {
    const ext = extname(file);
    return ext === '.js';
  });

  const jsResult = js.length > 0 ? await lintJs(js, fix, showAll) : true;
  if (js.length > 0 && jsResult) {
    process.stdout.write('All JavaScript looks good👌\n');
  }

  const ts = files.filter(file => {
    const ext = extname(file);
    return ext === '.ts';
  });

  const tsResult = ts.length > 0 ? await lintTs(ts, fix, showAll) : true;
  if (ts.length > 0 && tsResult) {
    process.stdout.write('All TypeScript looks good👌\n');
  }

  if (cssResult && jsResult && tsResult) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

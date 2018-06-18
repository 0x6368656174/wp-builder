import { existsSync, readFileSync, writeFileSync } from 'fs';
import * as glob from 'glob';
import { extname, isAbsolute, join } from 'path';
import { format, Options as PrettierOptions } from 'prettier';
import { Options } from 'yargs';

interface IArgv {
  files: string[];
}

export const command = 'prettify';
export const describe = 'Prettify project style';
export const builder: { [key: string]: Options } = {
  files: {
    alias: 'f',
    default: [],
    description: 'Files to prettify',
    type: 'array',
  },
};

export async function handler({ files }: IArgv) {
  if (files.length === 0) {
    files = glob.sync(join(process.cwd(), 'src', '**/*'));
  }

  files = files.filter(file => {
    const ext = extname(file);
    switch (ext.toLowerCase()) {
      case '.css':
      case '.scss':
      case '.sass':
      case '.ts':
      case '.md':
      case '.json':
      case '.gql':
        return true;
    }
    return false;
  });

  files = files.map(file => {
    return isAbsolute(file) ? file : join(process.cwd(), file);
  });

  let options: PrettierOptions = {
    arrowParens: 'avoid',
    printWidth: 120,
    singleQuote: true,
    trailingComma: 'all',
  };

  const optionsFile = join(process.cwd(), '.prettierrc');
  if (existsSync(optionsFile)) {
    options = JSON.parse(readFileSync(optionsFile, 'utf-8'));
  }

  for (const file of files) {
    const data = readFileSync(file, 'utf-8');

    const ext = extname(file);
    let parser: 'babylon' | 'css' | 'typescript' | 'markdown' | 'json' | 'graphql' = 'babylon';
    switch (ext.toLowerCase()) {
      case '.css':
      case '.scss':
      case '.sass':
        parser = 'css';
        break;
      case '.ts':
        parser = 'typescript';
        break;
      case '.md':
        parser = 'markdown';
        break;
      case '.json':
        parser = 'json';
        break;
      case '.gql':
        parser = 'graphql';
        break;
    }

    options.parser = parser;

    const newData = format(data, options);
    if (data !== newData) {
      process.stdout.write(`File ${file} reformatted\n`);
      writeFileSync(file, newData);
    } else {
      process.stdout.write(`File ${file} already looks good👌\n`);
    }
  }

  process.exit(0);
}

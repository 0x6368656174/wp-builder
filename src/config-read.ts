import { existsSync } from 'fs';
import { join } from 'path';

interface IBuild {
  outputPath: string;
}

interface ITheme {
  root: string;
  asserts?: string[];
  mainTemplates: string[];
}

interface IConfig {
  project: string;
  build: IBuild;
  themes: {
    [name: string]: ITheme;
  };
  defaultTheme: string;
}

export function readConfig(): IConfig {
  const configPath = join(process.cwd(), 'wpbuild.json');
  if (!existsSync(configPath)) {
    throw new Error('Local workspace file (\'wpbuild.json\') could not be found.');
  }

  return require(configPath);
}

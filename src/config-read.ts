import { existsSync } from 'fs';
import { join } from 'path';

interface IBuild {
  outputPath: string;
}

interface IPlugin {
  root: string;
}

interface ITheme {
  root: string;
  asserts?: string[];
  mainTemplates: string[];
  breakpoints?: {
    [breakpoint: string]: string;
  };
  usedPlugins?: string[];
}

interface IConfig {
  project: string;
  build: IBuild;
  themes: {
    [name: string]: ITheme;
  };
  plugins?: {
    [name: string]: IPlugin;
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

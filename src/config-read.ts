import { existsSync } from 'fs';
import { join } from 'path';

interface IBuild {
  outputPath: string;
  themeName?: string;
}

interface IProject {
  root: string;
  style?: string;
  editorStyle?: string;
  build: IBuild;
}

interface IConfig {
  projects: {
    [name: string]: IProject;
  };
  defaultProject: string;
}

export function readConfig(): IConfig {
  const configPath = join(process.cwd(), 'wpbuild.json');
  if (!existsSync(configPath)) {
    throw new Error('Local workspace file (\'wpbuild.json\') could not be found.');
  }

  const config = require(configPath);

  return config;
}

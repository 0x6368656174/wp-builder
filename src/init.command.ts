import * as camelcase from 'camelcase';
import { spawn } from 'child_process';
import { lstatSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import * as glob from 'glob';
import { basename, join, relative } from 'path';
import { createInterface } from 'readline';
import * as svg2png from 'svg2png';
import { Options } from 'yargs';

export const command = 'init';
export const describe = 'Init empty project';
export const builder: {[key: string]: Options} = { };

interface IArgv {
  prod: boolean;
  theme?: string;
}

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function question(query: string, defaultValue?: string): Promise<string> {
  const result = await new Promise(resolve => {
    rl.question(query, answer => resolve(answer));
  });

  if (result) {
    return result as string;
  } else if (defaultValue !== undefined) {
    return defaultValue;
  } else {
    return question(query);
  }
}

export async function handler(argv: IArgv) {
  const projectName = await question('Project name [my-project]: ', 'my-project');
  const projectThemeName = await question(`Project theme name [${projectName}-theme]: `, projectName + '-theme');
   // FIXME: Убрать any, когда починят definition
  const projectThemeNamePascalCase = (camelcase as any)(projectThemeName, { pascalCase: true });
  const projectDescription = await question('Project description []: ', '');
  const projectHomePage = await question('Project home page [http://example.com]: ', 'http://example.com');
  const authorName = await question('Author name [User]: ', 'User');
  const authorEmail = await question('Author email [user@example.com]: ', 'user@example.com');
  const authorHomePage = await question('Author home page [http://example.com]: ', 'http://example.com');
  const configureDbAnswer = await question('Configure Data Base (Yes/No) [Yes]: ', 'Yes');
  let dbHost: string | undefined;
  let dbPort: string | undefined;
  let dbName: string | undefined;
  let dbUser: string | undefined;
  let dbPassword: string | undefined;
  if (configureDbAnswer.toLowerCase() === 'yes' || configureDbAnswer.toLowerCase() === 'y') {
    dbHost = await question('Database host [localhost]: ', 'localhost');
    dbPort = await question('Database port [3306]: ', '3306');
    dbName = await question('Database name [WP]: ', 'WP');
    dbUser = await question('Database user [root]: ', 'root');
    dbPassword = await question('Database password []: ', '');
  }
  rl.close();

  const globResult = glob.sync(join(__dirname, 'starter', '**/*'), { dot: true });
  const directories = globResult.filter(file => {
    const stat = lstatSync(file);
    return stat.isDirectory();
  });
  const files = globResult.filter(file => {
    const stat = lstatSync(file);
    return stat.isFile();
  });

  const dir = join(process.cwd(), projectName);
  mkdirSync(dir);
  process.stdout.write(`Created directory ${dir}\n`);

  for (const directory of directories) {
    const newDirPath = relative(join(__dirname, 'starter'), directory)
      .replace('%PROJECT_THEME_NAME%', projectThemeName);
    const newDirFullPath = join(dir, newDirPath);
    mkdirSync(newDirFullPath);
    process.stdout.write(`Created directory ${newDirFullPath}\n`);
  }

  for (const file of files) {
    const newFileName = basename(file) !== '_gitignore' ? file : file.replace('_gitignore', '.gitignore');
    const newFilePath = relative(join(__dirname, 'starter'), newFileName)
      .replace('%PROJECT_THEME_NAME%', projectThemeName);
    const newFileFullPath = join(dir, newFilePath);
    const fileContent = readFileSync(file, 'utf-8');
    const newFileContent = fileContent
      .replace(/\%PROJECT_NAME\%/g, projectName)
      .replace(/\%PROJECT_THEME_NAME\%/g, projectThemeName)
      .replace(/\%PROJECT_THEME_NAME_PASCAL_CASE\%/g, projectThemeNamePascalCase)
      .replace(/\%PROJECT_DESCRIPTION\%/g, projectDescription)
      .replace(/\%PROJECT_HOME_PAGE\%/g, projectHomePage)
      .replace(/\%AUTHOR_NAME\%/g, authorName)
      .replace(/\%AUTHOR_EMAIL\%/g, authorEmail)
      .replace(/\%AUTHOR_HOME_PAGE\%/g, authorHomePage);

    writeFileSync(newFileFullPath, newFileContent);
    process.stdout.write(`Created file ${newFileFullPath}\n`);
  }

  await runCommand('composer', ['install'], dir);
  await runCommand('npm', ['install'], dir);

  await createScreenshot(dir, projectThemeName);
  await runCommand('git', ['init'], dir);
  await runCommand('git', ['add', '.'], dir);
  await runCommand('git', ['commit', '--author="Pavel Puchkov <0x6368656174@gmail.com>"',
    '-m', '"Initial commit"'], dir);

  if (configureDbAnswer.toLowerCase() === 'yes' || configureDbAnswer.toLowerCase() === 'y') {
    configureDb({
      host: dbHost || 'localhost',
      name: dbName || 'database_name_here',
      password: dbPassword || 'password_here',
      port: parseInt(dbPort || '3306', 10),
      user: dbUser || 'username_here',
    }, dir);
  }
}

function runCommand(commandStr: string, options: string[], cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const cmd = spawn(commandStr, options, { cwd });
    cmd.stdout.on('data', data => process.stdout.write(data));
    cmd.stderr.on('data', data => process.stderr.write(data));

    cmd.on('close', code => {
      if (code === 0) {
        resolve();
      } else {
        reject(code);
      }
    });
  });
}

async function createScreenshot(dir: string, projectThemeName: string) {
  const svgBuffer = new Buffer(`<svg>
    <rect width="100%" height="100%" fill="white"/>
    <text y="450" font-size="30" font-family="Arial, sans-serif">
       <tspan x="600" text-anchor="middle">${projectThemeName}</tspan>
   </text>
</svg>`);

  const pngBuffer = await svg2png(svgBuffer, { width: 1200, height: 900 });
  writeFileSync(join(dir, 'src', projectThemeName, 'screenshot.png'), pngBuffer);
}

interface IConfigureDb {
  host: string;
  port: number;
  name: string;
  user: string;
  password: string;
}

function configureDb(config: IConfigureDb, dir: string) {
  const filePath = join(dir, 'dist', 'wp-config.php');
  const wpConfig = readFileSync(filePath, 'utf-8');
  const newWpConfig = wpConfig
    .replace('database_name_here', config.name)
    .replace('username_here', config.user)
    .replace('password_here', config.password)
    .replace('localhost', config.host);
  writeFileSync(filePath, newWpConfig);
}

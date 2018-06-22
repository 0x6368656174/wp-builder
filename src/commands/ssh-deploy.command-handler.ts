import { createReadStream, existsSync, mkdtempSync, rmdirSync, unlinkSync, readFileSync} from 'fs';
import * as moment from 'moment';
import { tmpdir } from 'os';
import { basename, dirname, join, normalize} from 'path';
import { Client, SFTPWrapper } from 'ssh2';
import { FileEntry } from 'ssh2-streams';
import { create } from 'tar';
import { readConfig } from '../config-read';
import { version } from '../version';
import { generate } from 'shortid';
import chalk from 'chalk';

interface IArgv {
  archiveFolder: string;
  exclude: string[];
  host: string;
  password?: string;
  port: number;
  remoteFolder: string;
  backupFolder: string;
  user: string;
  keepClean: boolean;
  dist: string;
  privateKey?: string;
}

async function pack(excludes: string[], dist: string): Promise<string> {
  const config = readConfig();
  const project = config.project || 'project';
  const tmpFolder = mkdtempSync(join(tmpdir(), 'wp-build-'));
  const fileName = join(tmpFolder, `${project}-${version(false)}.tgz`);
  const excludePatch = excludes.map(e => normalize(e));
  await create({
    cwd: join(process.cwd(), dist),
    file: fileName,
    filter: (path, enty) => {
      for (const exclude of excludePatch) {
        if (path.startsWith('./' + exclude)) {
          return false;
        }
      }
      return true;
    },
    gzip: true,
  }, ['.']);

  return fileName;
}

function connect(argv: IArgv): Promise<Client> {
  let privateKey: string;

  if (argv.privateKey) {
    if (!existsSync(argv.privateKey)) {
      throw new Error(`Not found ${argv.privateKey}`);
    }

    privateKey = readFileSync(argv.privateKey, 'utf-8');
  }

  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on('ready', () => {
      resolve(conn);
    }).connect({
      host: argv.host,
      password: argv.password,
      port: argv.port,
      privateKey,
      username: argv.user,
    });
  });
}

function exec(client: Client, command: string): Promise<void> {
  return new Promise((resolve, reject) => {
    process.stdout.write(chalk`{cyan SSH exec:} ${command}\n`);

    client.exec(command, (err, stream) => {
      if (err) {
        reject(err);
      }

      stream
        .on('close', (code: number) => {
          if (code !== 0) {
            reject(new Error(`SSH command exit witch code ${code}`));
          }
          resolve();
        })
        .on('data', (data: string) => {
        process.stdout.write(data);
      }).stderr.on('data', (data: string) => {
        process.stderr.write(data);
      });
    });
  });
}

function getSftp(client: Client): Promise<SFTPWrapper> {
  return new Promise((resolve, reject) => {
    client.sftp(((err, sftp1) => {
      if (err) {
        reject(err);
      }

      resolve(sftp1);
    }));
  });
}

function sftpUpload(sftp: SFTPWrapper, localFile: string, remoteFile: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const readStream = createReadStream(localFile);
    const writeStream = sftp.createWriteStream(remoteFile);

    writeStream.on('error', (err: any) => reject(err));
    writeStream.on('close', () => {
      resolve();
    });

    readStream.pipe(writeStream);
  });
}

function sftpReadDir(sftp: SFTPWrapper, dir: string): Promise<FileEntry[]> {
  return new Promise((resolve, reject) => {
    sftp.readdir(dir, (err, list) => {
      if (err) {
        reject(err);
      }

      resolve(list);
    });
  });
}

export async function handler(argv: IArgv) {
  const config = readConfig();
  const project = config.project || 'project';

  process.stdout.write(`Connect to remote SSH-server ${argv.user}@${argv.host}...\n`);
  const conn = await connect(argv);
  process.stdout.write(`Connect to remote SSH-server ${argv.user}@${argv.host} success\n\n`);

  const backupFolder = argv.backupFolder;
  process.stdout.write(`Create backup folder ${backupFolder}...\n`);
  await exec(conn, `mkdir -p ${backupFolder}`);
  process.stdout.write(`Create backup folder ${backupFolder} success\n\n`);

  const backup = join(backupFolder, `${project}-${moment().toISOString()}`);
  process.stdout.write(`Try copy ${argv.remoteFolder} to backup ${backup}...\n`);
  await exec(conn, `cp -r ${argv.remoteFolder} ${backup} || :`);
  process.stdout.write(`Try copy ${argv.remoteFolder} to backup ${backup} success\n\n`);

  const excluded = argv.exclude.map(e => normalize(e));

  const excludeTmpDirs: {[key: string]: string} = {};

  for (const exclude of excluded) {
    const tempDir = join('/', 'tmp', `wpbuild-${generate()}`);
    process.stdout.write(`Create temp dir ${tempDir}...\n`);
    await exec(conn, `mkdir -p ${tempDir}`);
    excludeTmpDirs[exclude] = tempDir;
    process.stdout.write(`Create temp dir ${tempDir} success...\n\n`);
  }

  for (const exclude of excluded) {
    const from = join(argv.remoteFolder, exclude);
    const to = join(excludeTmpDirs[exclude], basename(exclude));
    process.stdout.write(`Try move ${from} to ${to}...\n`);
    await exec(conn, `mv ${from} ${to} || :`);
    process.stdout.write(`Try move ${from} to ${to} success\n\n`);
  }

  process.stdout.write(`Remove remote dir ${argv.remoteFolder}...\n`);
  await exec(conn, `rm -rf ${argv.remoteFolder}`);
  process.stdout.write(`Remove remote dir ${argv.remoteFolder} success\n\n`);

  process.stdout.write(`Create archive folder ${argv.archiveFolder}...\n`);
  await exec(conn, `mkdir -p ${argv.archiveFolder}`);
  process.stdout.write(`Create archive folder ${argv.archiveFolder} success\n\n`);

  process.stdout.write(`Create remove folder ${argv.remoteFolder}...\n`);
  await exec(conn, `mkdir -p ${argv.remoteFolder}`);
  process.stdout.write(`Create remove folder ${argv.remoteFolder} success\n\n`);

  process.stdout.write('Open SFTP session...\n');
  const sfpt = await getSftp(conn);
  process.stdout.write('Open SFTP session success\n\n');

  process.stdout.write(`Pack dist folder ${join(process.cwd(), argv.dist)}...\n`);
  const archive = await pack(argv.exclude, argv.dist);
  process.stdout.write(`Pack dist folder ${join(process.cwd(), argv.dist)} to ${archive} success\n\n`);

  const remoteArchive = join(argv.archiveFolder, basename(archive));
  process.stdout.write(`Upload ${archive} to ${remoteArchive}...\n`);
  await sftpUpload(sfpt, archive, remoteArchive);
  process.stdout.write(`Upload ${archive} to ${remoteArchive} success\n\n`);

  process.stdout.write(`Remove ${archive}...\n`);
  unlinkSync(archive);
  process.stdout.write(`Remove ${archive} success\n\n`);

  const archiveFolder = dirname(archive);
  process.stdout.write(`Remove ${archiveFolder}...\n`);
  rmdirSync(archiveFolder);
  process.stdout.write(`Remove ${archiveFolder} success\n\n`);

  process.stdout.write(`Unpack ${remoteArchive} to ${argv.remoteFolder}...\n`);
  await exec(conn, `tar -xzf ${remoteArchive} -C ${argv.remoteFolder}`);
  process.stdout.write(`Unpack ${remoteArchive} to ${argv.remoteFolder} success\n\n`);

  for (const exclude of excluded) {
    const tempDir = excludeTmpDirs[exclude];
    const from = join(tempDir, basename(exclude));
    const to = join(argv.remoteFolder, exclude);
    process.stdout.write(`Try move ${from} to ${to}...\n`);
    await exec(conn, `mv ${from} ${to} || :`);
    process.stdout.write(`Try move ${from} to ${to} success\n\n`);

    process.stdout.write(`Remove temp dir ${tempDir}...\n`);
    await exec(conn, `rm -r ${tempDir}`);
    process.stdout.write(`Remove temp dir ${tempDir} success\n\n`);
  }

  process.stdout.write(`Deploy finished\n`);

  if (argv.keepClean) {
    process.stdout.write(`Try remove backup ${backup}...\n`);
    await exec(conn, `rm -rf ${backup}`);
    process.stdout.write(`Try remove backup ${backup} success...\n\n`);

    process.stdout.write(`Try remove archive ${remoteArchive}...\n`);
    await exec(conn, `rm -rf ${remoteArchive}`);
    process.stdout.write(`Try remove archive ${remoteArchive} success...\n\n`);
  }

  conn.end();

  process.exit(0);
}

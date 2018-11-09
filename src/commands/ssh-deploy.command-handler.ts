import chalk from 'chalk';
import {spawn} from 'child_process';
import { createReadStream, existsSync, mkdtempSync, readFileSync, rmdirSync, unlinkSync} from 'fs';
import * as moment from 'moment';
import { tmpdir } from 'os';
import { basename, dirname, join, normalize} from 'path';
import { generate } from 'shortid';
import { Client, SFTPWrapper } from 'ssh2';
import { FileEntry } from 'ssh2-streams';
import { create } from 'tar';
import { readConfig } from '../config-read';
import { version } from '../version';

interface IArgv {
  'archive-folder'?: string;
  exclude: string[];
  host: string;
  password?: string;
  port: number;
  'remote-folder': string;
  'backup-folder': string;
  user: string;
  'keep-clean': boolean;
  dist: string;
  'ssh-private-key'?: string;
  method: 'ssh-copy' | 'rsync';
  'ssh-host-key-checking': boolean;
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
  const privateKeyPath = argv['ssh-private-key'];
  let privateKey: string;

  if (privateKeyPath) {
    if (!existsSync(privateKeyPath)) {
      throw new Error(`Not found ${privateKeyPath}`);
    }

    privateKey = readFileSync(privateKeyPath, 'utf-8');
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

  const backupFolder = argv['backup-folder'];
  process.stdout.write(`Create backup folder ${backupFolder}...\n`);
  await exec(conn, `mkdir -p ${backupFolder}`);
  process.stdout.write(`Create backup folder ${backupFolder} success\n\n`);
  const backup = join(backupFolder, `${project}-${moment().toISOString()}`);

  const remoteFolder = argv['remote-folder'];
  process.stdout.write(`Try copy ${remoteFolder} to backup ${backup}...\n`);
  await exec(conn, `cp -r ${remoteFolder} ${backup} || :`);
  process.stdout.write(`Try copy ${remoteFolder} to backup ${backup} success\n\n`);

  const archiveFolder = argv['archive-folder'];
  const keepClean = argv['keep-clean'];

  switch (argv.method) {
    case 'ssh-copy': {
      if (!archiveFolder) {
        throw new Error('In ssh-copy deploy method --archive-folder command argument required');
      }

      process.stdout.write('Open SFTP session...\n');
      const sfpt = await getSftp(conn);
      process.stdout.write('Open SFTP session success\n\n');

      process.stdout.write(`Create archive folder ${archiveFolder}...\n`);
      await exec(conn, `mkdir -p ${archiveFolder}`);
      process.stdout.write(`Create archive folder ${archiveFolder} success\n\n`);

      process.stdout.write(`Pack dist folder ${join(process.cwd(), argv.dist)}...\n`);
      const archive = await pack(argv.exclude, argv.dist);
      process.stdout.write(`Pack dist folder ${join(process.cwd(), argv.dist)} to ${archive} success\n\n`);

      const remoteArchive = join(archiveFolder, basename(archive));
      process.stdout.write(`Upload ${archive} to ${remoteArchive}...\n`);
      await sftpUpload(sfpt, archive, remoteArchive);
      process.stdout.write(`Upload ${archive} to ${remoteArchive} success\n\n`);

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
        const from = join(remoteFolder, exclude);
        const to = join(excludeTmpDirs[exclude], basename(exclude));
        process.stdout.write(`Try move ${from} to ${to}...\n`);
        await exec(conn, `mv ${from} ${to} || :`);
        process.stdout.write(`Try move ${from} to ${to} success\n\n`);
      }

      process.stdout.write(`Remove remote dir ${remoteFolder}...\n`);
      await exec(conn, `rm -rf ${remoteFolder}`);
      process.stdout.write(`Remove remote dir ${remoteFolder} success\n\n`);

      process.stdout.write(`Create remove folder ${remoteFolder}...\n`);
      await exec(conn, `mkdir -p ${remoteFolder}`);
      process.stdout.write(`Create remove folder ${remoteFolder} success\n\n`);

      process.stdout.write(`Remove ${archive}...\n`);
      unlinkSync(archive);
      process.stdout.write(`Remove ${archive} success\n\n`);

      const archiveFolderDir = dirname(archive);
      process.stdout.write(`Remove ${archiveFolderDir}...\n`);
      rmdirSync(archiveFolderDir);
      process.stdout.write(`Remove ${archiveFolderDir} success\n\n`);

      process.stdout.write(`Unpack ${remoteArchive} to ${remoteFolder}...\n`);
      await exec(conn, `tar -xzf ${remoteArchive} -C ${remoteFolder}`);
      process.stdout.write(`Unpack ${remoteArchive} to ${remoteFolder} success\n\n`);

      for (const exclude of excluded) {
        const tempDir = excludeTmpDirs[exclude];
        const from = join(tempDir, basename(exclude));
        const to = join(remoteFolder, exclude);
        process.stdout.write(`Try move ${from} to ${to}...\n`);
        await exec(conn, `mv ${from} ${to} || :`);
        process.stdout.write(`Try move ${from} to ${to} success\n\n`);

        process.stdout.write(`Remove temp dir ${tempDir}...\n`);
        await exec(conn, `rm -r ${tempDir}`);
        process.stdout.write(`Remove temp dir ${tempDir} success\n\n`);
      }

      if (keepClean) {
        process.stdout.write(`Try remove archive ${remoteArchive}...\n`);
        await exec(conn, `rm -rf ${remoteArchive}`);
        process.stdout.write(`Try remove archive ${remoteArchive} success...\n\n`);
      }
    }                break;
    case 'rsync': {
      const sshPrivateKey = argv['ssh-private-key'];

      if (sshPrivateKey) {
        if (!existsSync(sshPrivateKey)) {
          throw new Error(`Not found ${sshPrivateKey}`);
        }
      }

      const sshHost = argv.host;
      const sshPassword = argv.password;
      const sshPort = argv.port;
      const sshUsername = argv.user;
      const dist = join(process.cwd(), argv.dist) + '/';

      const sshHostKeyChecking = argv['ssh-host-key-checking'];
      const sshParams = `-oStrictHostKeyChecking=${sshHostKeyChecking ? 'yes' : 'no'}`;

      const rsh = sshPrivateKey
        ? `ssh -p ${sshPort} -i ${sshPrivateKey} ${sshParams}`
        : `sshpass -p ${sshPassword} ssh -p ${sshPort} ${sshParams}`;

      const excluded = argv.exclude.map(e => normalize(e));
      const exclude = excluded.map(e => `--exclude="${e}"`);

      const rsyncArgs = [
        '--verbose',
        '--recursive',
        '--links',
        '--times',
        '--update',
        '--compress',
        '--checksum',
        '--delete-after',
        `--rsh="${rsh}"`,
        ...exclude,
        dist,
        `${sshUsername}@${sshHost}:${remoteFolder}`,
      ];
      const rsyncCommand = `rsync ${rsyncArgs.join(' ')}`;

      process.stdout.write(`Run rsync "${rsyncCommand}"...\n`);
      await (new Promise((resolve, reject) => {
        const rsync = spawn('rsync', rsyncArgs, {
          shell: true,
        });

        rsync.stdout.on('data', data => {
          process.stdout.write(data.toString());
        });

        rsync.stderr.on('data', data => {
          process.stderr.write(data.toString());
        });

        rsync.on('exit', code => {
          if (code !== 0) {
            reject(`Rsync complete with code = ${code}\n`);
          }

          resolve();
        });
      }));
      process.stdout.write(`Rsync success...\n\n`);
    }             break;
  }

  if (keepClean) {
    process.stdout.write(`Try remove backup ${backup}...\n`);
    await exec(conn, `rm -rf ${backup}`);
    process.stdout.write(`Try remove backup ${backup} success...\n\n`);
  }

  process.stdout.write(`Deploy finished\n`);

  conn.end();

  process.exit(0);
}

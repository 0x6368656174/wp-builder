import { createInterface } from 'readline';
import { Options } from 'yargs';

export const command = 'init';
export const describe = 'Init new project';
export const builder: {[key: string]: Options} = { };

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

export async function handler(argv: any) {
  const run = require('./init.command-handler');
  return run.handler(argv);
}

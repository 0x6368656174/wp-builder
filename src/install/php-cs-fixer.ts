import { createWriteStream } from 'fs';
import { join } from 'path';
import * as simpleGet from 'simple-get';

const output = createWriteStream(join(__dirname, '..', 'commands', 'php-cs-fixer'));

(simpleGet as any)('https://cs.sensiolabs.org/download/php-cs-fixer-v2.phar', (err: any, response: any) => {
  if (err) {
    throw err;
  }

  if (response.statusCode !== 200) {
    throw new Error(`Status ${response.statusCode}`);
  }

  response.pipe(output);
});
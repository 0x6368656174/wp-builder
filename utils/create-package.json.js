const fs = require('fs');
const path = require('path');

const packageJson = require(path.join(process.cwd(), 'package.json'));
packageJson.scripts = {
  install: 'node install/php-cs-fixer.js'
};
packageJson.devDependencies = undefined;

fs.writeFileSync(path.join(process.cwd(), 'dist', 'package.json'), JSON.stringify(packageJson, null, 2));

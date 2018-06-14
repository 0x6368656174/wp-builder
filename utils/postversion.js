const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(process.cwd(), 'src', 'starter', 'package.json');
const data = fs.readFileSync(packageJsonPath, 'utf-8');
const patchData = data.replace(/"@0x6368656174\/wp-builder": "[^"]+"/, `"@0x6368656174/wp-builder": "^${process.argv[2]}"`);
fs.writeFileSync(packageJsonPath, patchData);

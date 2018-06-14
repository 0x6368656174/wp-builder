const fs = require('fs');
const path = require('path');

const version = process.argv[2];

const packageJsonPath = path.join(process.cwd(), 'src', 'starter', 'package.json');
const packageJsonData = fs.readFileSync(packageJsonPath, 'utf-8');
const packageJsonPatchData = packageJsonData.replace(/"@0x6368656174\/wp-builder": "[^"]+"/, `"@0x6368656174/wp-builder": "^${version}"`);
fs.writeFileSync(packageJsonPath, packageJsonPatchData);

const indexTsPath = path.join(process.cwd(), 'src', 'index.ts');
const indexTsData = fs.readFileSync(indexTsPath, 'utf-8');
const indexTsPatchData = indexTsData.replace(/.version\('[^']+'\)/, `.version('${version}')`);
fs.writeFileSync(indexTsPath, indexTsPatchData);

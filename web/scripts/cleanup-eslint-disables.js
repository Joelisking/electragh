// Node.js script to remove all lines containing the specific eslint-disable comment from marketplaceAPI.schemas.ts

const fs = require('fs');
const path = require('path');

const targetFile = path.join(
  __dirname,
  '../lib/api/marketplaceAPI.schemas.ts'
);
const disablePattern =
  /\/\/ eslint-disable-next-line @typescript-eslint\/no-redeclare/;

if (!fs.existsSync(targetFile)) {
  console.error(`File not found: ${targetFile}`);
  process.exit(1);
}

const lines = fs.readFileSync(targetFile, 'utf-8').split('\n');
const filtered = lines.filter((line) => !disablePattern.test(line));

fs.writeFileSync(targetFile, filtered.join('\n'));
console.log(
  'Removed unused eslint-disable-next-line @typescript-eslint/no-redeclare lines.'
);

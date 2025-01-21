import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get all PNG files from the logos directory
const logosDir = join(__dirname, '../public/logos');
const logoFiles = readdirSync(logosDir)
  .filter(file => file.endsWith('.png'))
  .sort();

// Create the TypeScript content
const content = `// This file is auto-generated. Do not edit manually.
export const logoList = ${JSON.stringify(logoFiles, null, 2)};
`;

// Write to the utils file
const outputFile = join(__dirname, '../src/utils/logoList.ts');
writeFileSync(outputFile, content);

console.log('Logo list updated successfully!'); 
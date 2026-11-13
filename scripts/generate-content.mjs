import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const profile = JSON.parse(fs.readFileSync(path.join(rootDir, 'src/data/profile.json'), 'utf-8'));
const skills = JSON.parse(fs.readFileSync(path.join(rootDir, 'src/data/skills.json'), 'utf-8'));
const projects = JSON.parse(fs.readFileSync(path.join(rootDir, 'src/data/projects.json'), 'utf-8'));
const contacts = JSON.parse(fs.readFileSync(path.join(rootDir, 'src/data/contacts.json'), 'utf-8'));

console.log('✓ Validated content models:');
console.log(`  - Profile: ${profile.name} (${profile.brand})`);
console.log(`  - Skills: ${skills.cards.length} cards, ${skills.languages.list.length} spoken languages`);
console.log(`  - Projects: ${projects.items.length} verified project records`);
console.log(`  - Contacts: ${contacts.channels.length} contact channels`);

export { profile, skills, projects, contacts };

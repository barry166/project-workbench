import { mkdir, writeFile } from 'node:fs/promises';
import { projects, validateProjects } from './projects.mjs';

validateProjects(projects);
await mkdir(new URL('../public/', import.meta.url), { recursive: true });
const payload = `// Generated from src/projects.mjs. Edit the source config, then run npm run build.\nexport const projects = ${JSON.stringify(projects)};\n`;
await writeFile(new URL('../public/projects-data.js', import.meta.url), payload);

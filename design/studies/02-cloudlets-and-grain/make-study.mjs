// Static concept-art composition only. No animation or live harness integration.
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const out = dirname(fileURLToPath(import.meta.url));
const source = join(out, '../01-light-clusters');
const cloud = await readFile(join(source, 'direction-a.svg'), 'utf8');
const grain = await readFile(join(source, 'direction-c.svg'), 'utf8');
const clipPattern = /<g clip-path="url\(#face\)">([\s\S]*?)<\/g>/g;
const layers = [...grain.matchAll(clipPattern)].map(match => {
  const circles = match[1].match(/<circle\b[^>]*\/>/g);
  if (!circles || circles.length < 1000) throw Error('Missing granular source layer');
  return circles.join('');
});
if (layers.length !== 3) throw Error('Expected three original face compositions');
let index = 0;
const svg = cloud
  .replace('BRIAR / LIGHT STUDIES / ROUND 01', 'BRIAR / LIGHT STUDIES / ROUND 02')
  .replace('A / Cloudlets', 'Cloudlets + fine granular light')
  .replace('Soft luminous pockets. Intimate, diffuse, deep.', 'Selected direction, refined: soft groupings with many small lights at different apparent depths.')
  .replace(clipPattern, (_match, body) => {
    const sheenAt = body.lastIndexOf('<path');
    if (sheenAt < 0) throw Error('Missing original glass reflection');
    const fineLights = `<g opacity=".72">${layers[index++]}</g>`;
    return `<g clip-path="url(#face)">${body.slice(0,sheenAt)}${fineLights}${body.slice(sheenAt)}</g>`;
  });
if (index !== 3) throw Error('Expected to compose exactly three faces');
await writeFile(join(out, 'hybrid.svg'), svg);
if (!process.argv.includes('--svg-only')) {
  const require = createRequire(import.meta.url);
  const sharp = require(process.env.BRIAR_SHARP_MODULE || 'sharp');
  await sharp(Buffer.from(svg)).png().toFile(join(out, 'hybrid.png'));
}
console.log('Generated the hybrid still study; original sheets unchanged.');

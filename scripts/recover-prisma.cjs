const fs = require('fs');
const path = require('path');

const routeJs = path.join(process.cwd(), '.next', 'server', 'app', 'api', 'polls', 'route.js');
const outFile = path.join(process.cwd(), 'lib', 'prisma.ts');

const raw = fs.readFileSync(routeJs, 'utf8');
const sourceMarker = 'sourceURL=webpack-internal:///(rsc)/./lib/prisma.ts';
const srcIdx = raw.indexOf(sourceMarker);
if (srcIdx < 0) throw new Error('Prisma sourceURL marker not found');

const mapPrefix = 'sourceMappingURL=data:application/json;charset=utf-8;base64,';
const mapIdx = raw.lastIndexOf(mapPrefix, srcIdx);
if (mapIdx < 0) throw new Error('Prisma source map prefix not found');

const b64Start = mapIdx + mapPrefix.length;
const b64End = raw.indexOf('\\n//# sourceURL=webpack-internal:///(rsc)/./lib/prisma.ts', b64Start);
if (b64End < 0) throw new Error('Prisma source map end marker not found');

const b64 = raw.slice(b64Start, b64End);
const mapJson = Buffer.from(b64, 'base64').toString('utf8');
const map = JSON.parse(mapJson);
const source = Array.isArray(map.sourcesContent) ? map.sourcesContent[0] : null;
if (!source) throw new Error('sourcesContent missing for prisma.ts');

fs.writeFileSync(outFile, source, 'utf8');
console.log('Recovered prisma.ts bytes=', fs.statSync(outFile).size);

const fs = require('fs');
const path = require('path');

const jsFile = path.join(process.cwd(), '.next', 'server', 'app', 'home', 'page.js');
const outFile = path.join(process.cwd(), 'app', 'home', 'page.tsx');
const marker = 'sourceURL=webpack-internal:///(rsc)/./app/home/page.tsx';
const mapPrefix = 'sourceMappingURL=data:application/json;charset=utf-8;base64,';

const raw = fs.readFileSync(jsFile, 'utf8');
const srcIdx = raw.indexOf(marker);
if (srcIdx < 0) throw new Error('marker not found: ' + marker);
const mapIdx = raw.lastIndexOf(mapPrefix, srcIdx);
if (mapIdx < 0) throw new Error('map prefix not found before marker');
const b64Start = mapIdx + mapPrefix.length;
const endMarker = '\\n//# sourceURL=webpack-internal:///(rsc)/./app/home/page.tsx';
const b64End = raw.indexOf(endMarker, b64Start);
if (b64End < 0) throw new Error('map end marker not found');
const b64 = raw.slice(b64Start, b64End);
const map = JSON.parse(Buffer.from(b64, 'base64').toString('utf8'));
if (!Array.isArray(map.sourcesContent) || !map.sourcesContent[0]) throw new Error('sourcesContent missing');
fs.writeFileSync(outFile, map.sourcesContent[0], 'utf8');
console.log('Recovered home/page.tsx bytes=', fs.statSync(outFile).size);

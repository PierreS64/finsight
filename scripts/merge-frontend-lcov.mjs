import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const reports = [
  ['coverage/web/lcov.info', 'frontend/web'],
  ['coverage/mobile/lcov.info', 'frontend/mobile'],
  ['coverage/frontend.lcov', ''],
];
const merged = [];

for (const [report, prefix] of reports) {
  const content = readFileSync(report, 'utf8');
  for (const raw of content.split('end_of_record')) {
    const source = /^SF:(.+)$/m.exec(raw)?.[1]?.trim();
    if (!source) continue;
    const normalized = source.replaceAll('\\', '/');
    const relative = prefix ? path.posix.join(prefix, normalized) : normalized;
    if (!relative.startsWith('frontend/') || !existsSync(relative)) continue;
    merged.push(raw.replace(/^SF:.+$/m, `SF:${relative}`).trim() + '\nend_of_record\n');
  }
}

if (!merged.length) throw new Error('No frontend coverage records to merge.');
mkdirSync('coverage', { recursive: true });
writeFileSync('coverage/merged-frontend.lcov', merged.join(''), 'utf8');
console.log(`Merged ${merged.length} frontend coverage records.`);

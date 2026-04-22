import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

const root = '/tmp/cc-agent/62081220/project/components';
const libRoot = '/tmp/cc-agent/62081220/project/lib';

function walk(dir) {
  const files = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) files.push(...walk(full));
    else if (['.ts', '.tsx'].includes(extname(full))) files.push(full);
  }
  return files;
}

const replacements = [
  // lib imports (1-3 levels deep)
  [/from '\.\.\/\.\.\/\.\.\/lib\//g, "from '@/lib/"],
  [/from '\.\.\/\.\.\/lib\//g, "from '@/lib/"],
  [/from '\.\.\/lib\//g, "from '@/lib/"],
  // types
  [/from '\.\.\/\.\.\/\.\.\/types\//g, "from '@/types/"],
  [/from '\.\.\/\.\.\/types\//g, "from '@/types/"],
  [/from '\.\.\/types\//g, "from '@/types/"],
  // i18n
  [/from '\.\.\/\.\.\/\.\.\/i18n\//g, "from '@/lib/i18n/"],
  [/from '\.\.\/\.\.\/i18n\//g, "from '@/lib/i18n/"],
  [/from '\.\.\/i18n\//g, "from '@/lib/i18n/"],
  // supabase singleton → new client
  [/from '@\/lib\/supabase'(?!\s*\/)/g, "from '@/lib/supabase/client'"],
  // old singleton usage pattern
  [/import \{ supabase \} from '@\/lib\/supabase\/client'/g,
   "import { createClient as _mkClient } from '@/lib/supabase/client';\nconst supabase = _mkClient();"],
];

let changed = 0;
for (const file of walk(root)) {
  let content = readFileSync(file, 'utf8');
  let original = content;

  for (const [pattern, replacement] of replacements) {
    content = content.replace(pattern, replacement);
  }

  if (content !== original) {
    writeFileSync(file, content, 'utf8');
    changed++;
    console.log('Updated:', file.replace('/tmp/cc-agent/62081220/project/', ''));
  }
}
console.log(`\nDone. Updated ${changed} files.`);

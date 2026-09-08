import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parsePattern } from '../src/app/features/reader/data/pattern-parser.ts';

const dir = 'src/app/features/reader/data/fixtures';

for (const file of readdirSync(dir)
  .filter((f) => f.endsWith('.txt'))
  .sort()) {
  const pattern = parsePattern(readFileSync(join(dir, file), 'utf8'));
  console.log('\n' + '='.repeat(72));
  console.log(file);
  console.log('='.repeat(72));

  if (!pattern.total) {
    console.log('  → aucune étape détectée (patron vide)');
    continue;
  }

  console.log(`titre     : ${pattern.title || '—'}`);
  console.log(`matériel  : ${pattern.materials.length} ligne(s)`);
  pattern.materials.forEach((m) => console.log(`            · ${m}`));
  console.log(`notes     : ${pattern.notes.length} ligne(s)`);
  pattern.notes.forEach((n) => console.log(`            · ${n}`));
  console.log(`étapes    : ${pattern.total}`);

  for (const piece of pattern.pieces) {
    console.log(`\n  ── ${piece.name || '(sans nom)'} — ${piece.steps.length} étapes`);
    for (const step of piece.steps) {
      console.log(`  [${step.label || '·'}] ${step.body}`);
      if (step.tip) console.log(`      💡 ${step.tip}`);
      if (step.reps) console.log(`      ↻ ${step.reps}`);
      step.notes.forEach((n) => console.log(`      ⌐ ${n}`));
      step.after?.forEach((n) => console.log(`      ⌙ ${n}`));
    }
  }
}

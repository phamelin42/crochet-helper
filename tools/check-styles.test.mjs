import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';

const script = resolve('tools/check-styles.mjs');

function controler(css) {
  const dir = mkdtempSync(join(tmpdir(), 'styles-'));
  mkdirSync(join(dir, 'src/app/features'), { recursive: true });
  mkdirSync(join(dir, 'src/styles'), { recursive: true });
  writeFileSync(join(dir, 'src/styles/lecteur.css'), css);
  return spawnSync('node', [script], { cwd: dir, encoding: 'utf8' });
}

test('un font-size en px fait échouer le contrôle', () => {
  for (const css of ['a { font-size: 17px; }', 'a { font-size: clamp(1rem, 4vw, 48px); }']) {
    const res = controler(css);
    assert.equal(res.status, 1, css);
    assert.match(res.stderr, /font-size en px/);
  }
});

test('un font-size en rem ou en em passe, comme un espacement en px', () => {
  const res = controler('a { font-size: 1.0625rem; padding: 12px; }\nb { font-size: 0.9em; }');
  assert.equal(res.status, 0, res.stderr);
});

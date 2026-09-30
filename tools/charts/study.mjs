import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadComposer } from './composer.mjs';
import { DIAGRAMS, expectedRounds } from './generate.mjs';
import { pipelineWeight, recognizeImages } from './recognize.mjs';

/**
 * Mesures de la fiche 37, reproductibles : `npm run etude:charts`.
 * Écrit un tableau (Markdown) sur la sortie et les images annotées dans
 * `tools/charts/out/`. Les seuils go / no-go sont ceux de la fiche.
 */

const FIXTURES = resolve('tools/fixtures/charts');
const REAL = join(FIXTURES, 'real');
const OUT = resolve('tools/charts/out');

export const THRESHOLDS = { synthetic: 0.9, real: 0.7, seconds: 5, chunkKo: 300 };

/**
 * Bonne classe **et** bonne position : chaque symbole attendu (tour, rang dans
 * le tour) est comparé au symbole reconnu à la même place.
 */
export function score(expected, recognized, countOf = () => 0) {
  const flat = (rounds) =>
    rounds.map((round) =>
      round.groups.flatMap((g) => g.tokens.flatMap((t) => Array(t.count).fill(t.symbol))),
    );
  const want = flat(expected);
  const got = flat(recognized);
  let total = 0;
  let right = 0;
  let roundsRight = 0;
  want.forEach((ids, r) => {
    total += ids.length;
    ids.forEach((id, i) => {
      if (got[r]?.[i] === id) right++;
    });
    // Un tour est juste si son compte de mailles l'est (la fiche 36 l'affiche entre parenthèses).
    if (recognized[r] && countOf(expected[r]) === countOf(recognized[r])) roundsRight++;
  });
  return {
    symbols: total,
    right,
    rounds: want.length,
    roundsRight,
    extraRounds: got.length - want.length,
  };
}

let composerPromise;
const composer = () => (composerPromise ??= loadComposer());
const pct = (n, d) => (d ? Math.round((1000 * n) / d) / 10 : 0);

function listReal() {
  if (!existsSync(REAL)) return [];
  return readdirSync(REAL)
    .filter((f) => /\.(png|jpe?g)$/i.test(f))
    .sort();
}

/** Relit `expected.txt` en tours : « Rnd 3: 6 sc, 2 hdc (8) » → jetons, par l'abréviation US. */
function parseExpected(text, symbols) {
  const byUs = new Map(symbols.map((s) => [s.us, s.id]));
  return text
    .split('\n')
    .filter((l) => /^(Rnd|Row|Tour|Rang)/.test(l))
    .map((line) => {
      const body = line.replace(/^[^:]*:\s*/, '').replace(/\s*\(\d+\)\s*$/, '');
      const tokens = body.split(/,\s*/).map((part) => {
        const m = part.match(/^(?:(\d+)\s+)?(.+)$/);
        return { symbol: byUs.get(m[2].trim()) ?? m[2].trim(), count: m[1] ? Number(m[1]) : 1 };
      });
      return { kind: /^(Row|Rang)/.test(line) ? 'row' : 'round', groups: [{ tokens, repeat: 1 }] };
    });
}

export async function runStudy({ traces = true } = {}) {
  const c = await composer();

  const jobs = [
    ...DIAGRAMS.map((d) => ({
      name: d.name,
      kind: 'synthétique',
      file: join(FIXTURES, `${d.name}.png`),
      expected: expectedRounds(d),
    })),
    ...listReal().map((f) => {
      const txt = join(REAL, f.replace(/\.[^.]+$/, '.expected.txt'));
      return {
        name: `real/${f}`,
        kind: 'réel',
        file: join(REAL, f),
        expected: existsSync(txt)
          ? parseExpected(readFileSync(txt, 'utf8'), c.CHART_SYMBOLS)
          : null,
      };
    }),
  ];
  const measured = jobs.filter((j) => j.expected);

  const { results, attempted } = await recognizeImages(measured.map((j) => j.file));
  if (traces) mkdirSync(OUT, { recursive: true });

  const rows = measured.map((job, i) => {
    const r = results[i];
    const s = score(job.expected, r.rounds, c.stitchCount);
    if (traces) {
      const safe = job.name.replace(/[^a-z0-9.-]/gi, '_');
      writeFileSync(join(OUT, `${safe}.png`), Buffer.from(r.trace.split(',')[1], 'base64'));
      writeFileSync(join(OUT, `${safe}.txt`), c.renderPattern(r.rounds, 'US') + '\n');
    }
    return {
      name: job.name,
      kind: job.kind,
      ...s,
      seconds: (r.timings.total - r.timings.templates) / 1000,
      seconds_with_templates: r.timings.total / 1000,
      layout: r.radial ? 'radial' : 'à plat',
    };
  });

  const of = (kind) => rows.filter((r) => r.kind === kind);
  const rate = (list) =>
    pct(
      list.reduce((a, r) => a + r.right, 0),
      list.reduce((a, r) => a + r.symbols, 0),
    );
  const weight = await pipelineWeight();
  const synthetic = rate(of('synthétique'));
  const real = of('réel').length ? rate(of('réel')) : null;
  const slowest = Math.max(...rows.map((r) => r.seconds_with_templates));

  return {
    rows,
    attempted,
    weight,
    synthetic,
    real,
    slowest,
    go:
      synthetic >= THRESHOLDS.synthetic * 100 &&
      real !== null &&
      real >= THRESHOLDS.real * 100 &&
      slowest < THRESHOLDS.seconds &&
      weight.gzip < THRESHOLDS.chunkKo * 1024,
    commit: gitCommit(),
    unlabeledReal: jobs.filter((j) => j.kind === 'réel' && !j.expected).map((j) => j.name),
  };
}

function gitCommit() {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' }).trim();
  } catch {
    return 'inconnu';
  }
}

export function table(study) {
  const lines = [
    '| Diagramme | Type | Disposition | Symboles justes | Tours au bon compte | Temps (s) |',
    '| --- | --- | --- | --- | --- | --- |',
  ];
  for (const r of study.rows) {
    lines.push(
      `| ${r.name} | ${r.kind} | ${r.layout} | ${r.right} / ${r.symbols} (${pct(r.right, r.symbols)} %) | ${r.roundsRight} / ${r.rounds}${r.extraRounds ? ` (+${r.extraRounds} en trop)` : ''} | ${r.seconds_with_templates.toFixed(2)} |`,
    );
  }
  return lines.join('\n');
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const study = await runStudy();
  console.log(table(study));
  console.log(`\nSynthétique : ${study.synthetic} % — réel : ${study.real ?? 'non mesuré'}`);
  console.log(`Plus long : ${study.slowest.toFixed(2)} s`);
  console.log(`Code : ${study.weight.raw} o minifié, ${study.weight.gzip} o gzip`);
  console.log(`Requêtes sortantes tentées : ${study.attempted}`);
  console.log(`Commit : ${study.commit} — décision : ${study.go ? 'GO' : 'NO-GO'}`);
  if (study.unlabeledReal.length)
    console.log(`Sans transcription : ${study.unlabeledReal.join(', ')}`);
}

// Mesure manuelle de la qualité de la mise en forme, avant d'activer la case
// (fiche 53). Hors CI : chaque lancement coûte quelques centimes.
//
//   ANTHROPIC_API_KEY=... node worker/eval/evaluer.mjs
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';
import { build } from 'esbuild';

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('ANTHROPIC_API_KEY manquante : le script ne tourne pas sans.');
  process.exit(1);
}

const racine = join(dirname(fileURLToPath(import.meta.url)), '..', '..');

// Le Worker et le parseur sont en TypeScript : on les empaquette en mémoire
// plutôt que de les recopier, pour mesurer le code réellement déployé.
async function charger(entree) {
  const { outputFiles } = await build({
    entryPoints: [join(racine, entree)],
    bundle: true,
    write: false,
    format: 'esm',
    platform: 'node',
  });
  const source = Buffer.from(outputFiles[0].text).toString('base64');
  return import(`data:text/javascript;base64,${source}`);
}

const { consigne } = await charger('worker/src/consigne.ts');
const { fidele } = await charger('worker/src/fidelite.ts');
const { parsePattern } = await charger('src/app/features/reader/data/pattern-parser.ts');

const PRIX = {
  'claude-haiku-5-5': { entree: 0.1, sortie: 0.5 },
  'claude-sonnet-5-5': { entree: 2, sortie: 10 },
};
const CONFIGS = [
  { modele: 'claude-haiku-5-5', effort: 'low' },
  { modele: 'claude-haiku-5-5', effort: 'medium' },
  { modele: 'claude-sonnet-5-5', effort: 'low' },
];

const dossier = join(racine, 'src/app/features/reader/data/fixtures');
const fixtures = readdirSync(dossier).filter((f) => f.endsWith('.txt'));
const etapes = (texte) => parsePattern(texte).pieces.reduce((n, p) => n + p.steps.length, 0);

const client = new Anthropic();
const lignes = [
  '| Fixture | Modèle | Effort | Fidèle | Étapes avant | Étapes après | Coût (USD) |',
  '| --- | --- | --- | --- | --- | --- | --- |',
];
let total = 0;

for (const fichier of fixtures) {
  const texte = readFileSync(join(dossier, fichier), 'utf8');
  for (const { modele, effort } of CONFIGS) {
    const message = await client.messages
      .stream({
        model: modele,
        max_tokens: 32000,
        system: consigne('en'),
        messages: [{ role: 'user', content: texte }],
        output_config: { effort },
      })
      .finalMessage();
    const sortie = message.content.map((b) => (b.type === 'text' ? b.text : '')).join('');
    const prix = PRIX[modele];
    const cout =
      (message.usage.input_tokens * prix.entree + message.usage.output_tokens * prix.sortie) / 1e6;
    total += cout;
    const termine = message.stop_reason === 'end_turn';
    lignes.push(
      `| ${fichier} | ${modele} | ${effort} | ${termine && fidele(texte, sortie) ? 'oui' : 'non'} | ${etapes(texte)} | ${etapes(sortie)} | ${cout.toFixed(4)} |`,
    );
  }
}

console.log(lignes.join('\n'));
console.log(`\nCoût total : ${total.toFixed(4)} USD`);

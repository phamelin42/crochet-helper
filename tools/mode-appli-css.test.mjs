import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

/**
 * Le mode appli est écrit deux fois dans `lecteur.css` (fiche 43) :
 * `@media (display-mode: standalone)` pour le premier affichage sans
 * JavaScript, `html[data-app]` pour la TWA. Chromium ne permet pas d'émuler
 * `display-mode` en test e2e : ce qui empêche les deux copies de diverger,
 * c'est ce contrôle.
 */
const css = readFileSync('src/styles/lecteur.css', 'utf8');

/** Contenu du bloc dont l'accolade ouvrante suit `debut`, accolades équilibrées. */
function bloc(debut) {
  const depart = css.indexOf(debut);
  assert.ok(depart >= 0, `« ${debut} » introuvable dans lecteur.css`);
  let profondeur = 0;
  for (let i = css.indexOf('{', depart); i < css.length; i++) {
    if (css[i] === '{') profondeur++;
    if (css[i] === '}' && --profondeur === 0) return css.slice(css.indexOf('{', depart) + 1, i);
  }
  throw new Error('accolade jamais refermée');
}

const normaliser = (texte) =>
  texte
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\s+/g, ' ')
    .trim();

test('mode appli : le bloc `standalone` et le bloc `html[data-app]` disent la même chose', () => {
  const media = normaliser(bloc('@media (display-mode: standalone) {'));
  const depart = css.indexOf('html[data-app] fil-app-chrome {');
  const fin = css.indexOf('html[data-focus] fil-app-chrome {');
  assert.ok(depart > 0 && fin > depart, 'bloc html[data-app] introuvable');
  const attribut = normaliser(css.slice(depart, fin)).replaceAll('html[data-app] ', '');
  assert.equal(attribut, media);
});

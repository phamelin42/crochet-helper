import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';

/**
 * `public/app-mode.js` pose les préférences d'affichage sur <html> avant le
 * premier rendu (sans lui, un fond sombre choisi pour sa vue passe 0,3 s en
 * blanc). Même clés et mêmes valeurs que `DisplayPrefsService`. Le script
 * tourne ici dans un contexte isolé avec un faux document et un faux stockage.
 */
const script = readFileSync('public/app-mode.js', 'utf8');

function executer({ local = {}, session = {}, localThrows = false } = {}) {
  const attributs = new Map();
  const stockage = (valeurs, leve) => ({
    getItem(cle) {
      if (leve) throw new Error('stockage refusé');
      return cle in valeurs ? valeurs[cle] : null;
    },
    setItem(cle, valeur) {
      valeurs[cle] = valeur;
    },
  });
  const contexte = {
    document: {
      documentElement: {
        setAttribute: (nom, valeur) => attributs.set(nom, valeur),
        removeAttribute: (nom) => attributs.delete(nom),
      },
    },
    location: { search: '' },
    localStorage: stockage(local, localThrows),
    sessionStorage: stockage(session, false),
  };
  vm.runInNewContext(script, contexte);
  return attributs;
}

test('fond sombre enregistré : data-dim="true" dès le script', () => {
  assert.equal(executer({ local: { 'fil.dim': 'true' } }).get('data-dim'), 'true');
});

test('fond clair ou absent : pas de data-dim', () => {
  assert.equal(executer({ local: { 'fil.dim': 'false' } }).has('data-dim'), false);
  assert.equal(executer().has('data-dim'), false);
});

for (const taille of ['lg', 'xl']) {
  test(`taille « ${taille} » enregistrée : data-text-size="${taille}"`, () => {
    const attributs = executer({ local: { 'fil.textSize': JSON.stringify(taille) } });
    assert.equal(attributs.get('data-text-size'), taille);
  });
}

for (const valeur of ['"base"', '"xxl"', '12', 'pas du json', '{"a":1}']) {
  test(`taille ${valeur} : ignorée, pas d'attribut`, () => {
    assert.equal(executer({ local: { 'fil.textSize': valeur } }).has('data-text-size'), false);
  });
}

test('stockage qui lève : aucune exception, aucun attribut', () => {
  assert.doesNotThrow(() => executer({ localThrows: true }));
  assert.equal(executer({ localThrows: true }).size, 0);
});

test('une préférence invalide ne bloque pas les autres ni le mode appli', () => {
  const attributs = executer({
    local: { 'fil.textSize': 'pas du json', 'fil.dim': 'true' },
    session: { 'fil.appMode': 'twa' },
  });
  assert.equal(attributs.get('data-dim'), 'true');
  assert.equal(attributs.has('data-app'), true);
});

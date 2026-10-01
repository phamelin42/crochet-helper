import assert from 'node:assert/strict';
import { createVerify, generateKeyPairSync } from 'node:crypto';
import { test } from 'node:test';
import { assertion, collecter, lireLignes } from './search-console.mjs';

test('assertion signée RS256, vérifiable avec la clé publique', () => {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const compte = {
    client_email: 'rapport@projet.iam.gserviceaccount.com',
    private_key: privateKey.export({ type: 'pkcs8', format: 'pem' }),
  };
  const [entete, charge, signature] = assertion(compte, 1_000).split('.');
  const ok = createVerify('RSA-SHA256')
    .update(`${entete}.${charge}`)
    .verify(publicKey, signature, 'base64url');
  assert.ok(ok);
  const contenu = JSON.parse(Buffer.from(charge, 'base64url').toString());
  assert.equal(contenu.exp - contenu.iat, 3600);
  assert.match(contenu.scope, /webmasters\.readonly$/);
});

test('lignes : forme stable, valeurs arrondies, lignes illisibles écartées', () => {
  const lignes = lireLignes({
    rows: [
      { keys: ['devis plombier'], clicks: 3, impressions: 120, ctr: 0.025, position: 8.456 },
      { keys: [42] },
      { pas: 'de clés' },
    ],
  });
  assert.deepEqual(lignes, [
    { cle: 'devis plombier', clics: 3, impressions: 120, ctr: 0.025, position: 8.5 },
  ]);
  assert.deepEqual(lireLignes(null), []);
});

test('sans secrets : ok false, pas d’exception', async () => {
  const sortie = await collecter({
    mois: '2026-09',
    env: {},
    fetch: () => assert.fail('aucun appel'),
  });
  assert.equal(sortie.ok, false);
});

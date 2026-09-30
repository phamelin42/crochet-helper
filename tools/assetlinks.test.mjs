import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { PACKAGE_NAME, construire, controler } from './assetlinks.mjs';

const EMPREINTE = Array.from({ length: 32 }, (_, i) =>
  i.toString(16).toUpperCase().padStart(2, '0'),
).join(':');

test('un tableau d’empreintes vide donne un fichier valide', () => {
  const brut = JSON.stringify(construire([]));
  assert.equal(controler(brut), null);
});

test('une empreinte valide est publiée pour le bon paquet', () => {
  const [entree] = construire([EMPREINTE]);
  assert.equal(entree.target.package_name, PACKAGE_NAME);
  assert.deepEqual(entree.target.sha256_cert_fingerprints, [EMPREINTE]);
  assert.equal(controler(JSON.stringify([entree])), null);
});

test('fichier absent, JSON invalide ou mauvais paquet : refusés', () => {
  assert.match(controler(null), /absent/);
  assert.match(controler('{pas du json'), /invalide/);
  assert.match(controler('[]'), /android_app/);
  assert.match(controler('[{"target":{"namespace":"android_app","package_name":"x"}}]'), /android_app/);
});

test('une empreinte mal formée est refusée, pas publiée', () => {
  assert.throws(() => construire(['abc']), /invalide/);
  assert.throws(() => construire(EMPREINTE), /tableau/);
  const [entree] = construire([]);
  entree.target.sha256_cert_fingerprints = ['abc'];
  assert.match(controler(JSON.stringify([entree])), /invalide/);
});

test('les deux scripts : le dépôt passe avec ses empreintes vides, et check échoue sans fichier', () => {
  const racine = mkdtempSync(join(tmpdir(), 'assetlinks-'));
  mkdirSync(join(racine, 'sortie'));
  execFileSync('node', ['tools/assetlinks.mjs', join(racine, 'sortie')]);
  const publie = JSON.parse(readFileSync(join(racine, 'sortie', '.well-known', 'assetlinks.json'), 'utf8'));
  assert.equal(publie[0].target.package_name, PACKAGE_NAME);
  execFileSync('node', ['tools/check-assetlinks.mjs', join(racine, 'sortie')]);

  writeFileSync(join(racine, 'sortie', '.well-known', 'assetlinks.json'), 'nope');
  const r = spawnSync('node', ['tools/check-assetlinks.mjs', join(racine, 'sortie')]);
  assert.equal(r.status, 1);
  const vide = spawnSync('node', ['tools/check-assetlinks.mjs', join(racine, 'inexistant')]);
  assert.equal(vide.status, 1);
});

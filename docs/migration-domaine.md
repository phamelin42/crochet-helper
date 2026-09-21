# Migration vers patternreader.com

Marche à suivre manuelle pour la fiche `11 — Marque et domaine`. Aucune de ces
étapes ne peut être faite par un agent : elles se passent dans les interfaces
Vercel et Google Search Console, pas dans le dépôt.

## 1. Attacher le nouveau domaine sur Vercel

Ajouter `patternreader.com` au projet Vercel comme domaine de production, et le
laisser devenir le domaine canonique. **Garder `crochet-helper.phamelin.fr`
attaché au même projet** : les redirections 301 déclarées dans `vercel.json`
ne fonctionnent que si l'ancien domaine continue de router vers ce projet.

## 2. Vérifier que les redirections répondent

Une fois les deux domaines attachés, contrôler qu'une URL de l'ancien domaine
atterrit sur son équivalent exact sur le nouveau, par exemple
`https://crochet-helper.phamelin.fr/glossaire` → `https://patternreader.com/glossaire`
(301, chemin conservé).

## 3. Google Search Console

1. Créer la nouvelle propriété `https://patternreader.com`.
2. Une fois les deux propriétés vérifiées, utiliser l'outil **changement
   d'adresse** depuis l'ancienne propriété vers la nouvelle.
3. Soumettre `https://patternreader.com/sitemap.xml` dans la nouvelle
   propriété.

Ne pas retirer la vérification de propriété de l'ancien domaine tant que
l'outil de changement d'adresse n'a pas terminé son traitement.

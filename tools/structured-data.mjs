/**
 * Fonctions pures de `check-structured-data.mjs`, testées dans
 * `structured-data.test.mjs` sans build.
 */

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0' };

/** Texte visible du `<body>` : sans scripts, styles ni balises, espaces normalisés. */
export function visibleText(html) {
  const body = html.slice(html.indexOf('<body'));
  return normalize(
    body
      .replace(
        /<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>|<template[\s\S]*?<\/template>/g,
        ' ',
      )
      .replace(/<[^>]+>/g, ' ')
      .replace(/&(#x?[0-9a-f]+|\w+);/gi, decodeEntity),
  );
}

function decodeEntity(match, code) {
  if (code[0] !== '#') return ENTITIES[code.toLowerCase()] ?? match;
  const n =
    code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : Number(code.slice(1));
  return String.fromCodePoint(n);
}

/** Entités HTML décodées, espaces laissées telles quelles (insécables comprises). */
export function decodeEntities(text) {
  return text.replace(/&(#x?[0-9a-f]+|\w+);/gi, decodeEntity);
}

/** Espaces (insécables comprises) ramenées à une seule espace ordinaire. */
export function normalize(text) {
  return text.replace(/[\s\u00a0\u202f]+/g, ' ').trim();
}

/** Blocs JSON-LD d'une page ; un bloc illisible est signalé par `null`. */
export function jsonLdOf(html) {
  return [
    ...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g),
  ].map((m) => {
    try {
      return JSON.parse(m[1]);
    } catch {
      return null;
    }
  });
}

/** Nœuds typés d'un bloc, `@graph` déplié. */
export function nodesOf(block) {
  return block?.['@graph'] ?? (block ? [block] : []);
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}(T[\d:.]+(Z|[+-]\d{2}:\d{2})?)?$/;

/**
 * Ce que les données structurées d'une page affirment sans que la page le
 * montre, ou ce qui leur manque pour être valides :
 * - FAQPage : chaque question et chaque réponse figurent mot pour mot dans le
 *   texte visible ;
 * - Article : `datePublished` et `dateModified` au format ISO, visibles sur
 *   la page (sous une forme quelconque : on vérifie l'année) ;
 * - BreadcrumbList : positions 1..n, chaque élément nommé, chaque `item` une
 *   URL absolue de `pages` (sauf le dernier, la page elle-même) et son nom
 *   visible sur la page.
 */
export function structuredDataProblems(html, pages) {
  const problems = [];
  const text = visibleText(html);
  const blocks = jsonLdOf(html);
  if (blocks.includes(null)) problems.push('JSON-LD illisible');
  for (const node of blocks.flatMap(nodesOf)) {
    const type = node['@type'];
    if (type === 'FAQPage') {
      for (const question of node.mainEntity ?? []) {
        const q = normalize(question.name ?? '');
        const a = normalize(question.acceptedAnswer?.text ?? '');
        if (!q || !text.includes(q)) problems.push(`FAQ : question absente de la page « ${q} »`);
        if (!a || !text.includes(a))
          problems.push(`FAQ : réponse absente de la page « ${a.slice(0, 60)}… »`);
      }
    }
    if (type === 'Article') {
      for (const key of ['datePublished', 'dateModified']) {
        if (!ISO_DATE.test(node[key] ?? '')) problems.push(`Article : ${key} absent ou non ISO`);
      }
    }
    if (type === 'BreadcrumbList') {
      const items = node.itemListElement ?? [];
      if (items.length < 2) problems.push('BreadcrumbList : moins de deux niveaux');
      items.forEach((item, index) => {
        if (item.position !== index + 1)
          problems.push(`BreadcrumbList : position ${item.position}`);
        const name = normalize(item.name ?? '');
        if (!name || !text.includes(name))
          problems.push(`BreadcrumbList : « ${name} » non visible`);
        const last = index === items.length - 1;
        if (!last && !pages.has(item.item))
          problems.push(`BreadcrumbList : ${item.item} hors sitemap`);
      });
    }
  }
  return problems;
}

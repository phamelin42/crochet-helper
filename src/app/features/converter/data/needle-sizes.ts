/** Une taille d'aiguille à tricoter, dans les deux systèmes. */
export interface NeedleSize {
  readonly mm: number;
  readonly us: string; // « 8 », « 10½ »
}

/**
 * Source de chaque ligne : tableau « Knitting Needles » (metric / US) du Craft
 * Yarn Council (craftyarncouncil.com, « Standards & Guidelines »). Les tailles
 * britanniques, qui comptent à l'envers, n'y figurent pas et ne sont pas
 * reproduites faute de source.
 */
export const NEEDLE_SIZES: readonly NeedleSize[] = [
  { mm: 2, us: '0' }, // CYC : 2 mm = US 0
  { mm: 2.25, us: '1' }, // CYC : 2,25 mm = US 1
  { mm: 2.75, us: '2' }, // CYC : 2,75 mm = US 2
  { mm: 3.25, us: '3' }, // CYC : 3,25 mm = US 3
  { mm: 3.5, us: '4' }, // CYC : 3,5 mm = US 4
  { mm: 3.75, us: '5' }, // CYC : 3,75 mm = US 5
  { mm: 4, us: '6' }, // CYC : 4 mm = US 6
  { mm: 4.5, us: '7' }, // CYC : 4,5 mm = US 7
  { mm: 5, us: '8' }, // CYC : 5 mm = US 8
  { mm: 5.5, us: '9' }, // CYC : 5,5 mm = US 9
  { mm: 6, us: '10' }, // CYC : 6 mm = US 10
  { mm: 6.5, us: '10½' }, // CYC : 6,5 mm = US 10½
  { mm: 8, us: '11' }, // CYC : 8 mm = US 11
  { mm: 9, us: '13' }, // CYC : 9 mm = US 13
  { mm: 10, us: '15' }, // CYC : 10 mm = US 15
  { mm: 12.75, us: '17' }, // CYC : 12,75 mm = US 17
  { mm: 15, us: '19' }, // CYC : 15 mm = US 19
  { mm: 19, us: '35' }, // CYC : 19 mm = US 35
  { mm: 25, us: '50' }, // CYC : 25 mm = US 50
];

/** Forme comparable d'un numéro US : « ½ » écrit « .5 », « 10,5 » comme « 10.5 ». */
function normalizeUs(raw: string): string {
  return raw.replace('½', '.5').replace(',', '.');
}

const US_MAP = new Map(NEEDLE_SIZES.map((size) => [normalizeUs(size.us), size]));

/**
 * Retrouve une taille à partir de ce que la lectrice tape : des millimètres
 * (« 5 », « 5 mm », « 5,0 ») ou un numéro américain (« US 8 », « us8 »). Un
 * nombre seul se lit d'abord en millimètres, comme pour les crochets : « 8 »
 * désigne donc 8 mm (US 11), et le numéro US 8 s'écrit « US 8 ». Un nombre
 * seul qui n'est pas un diamètre du tableau (« 10½ », « 1 ») se lit en US. Une
 * saisie avec « mm » ne retombe jamais sur le système américain. Inconnu ou
 * vide : `null`.
 */
export function findNeedleSize(input: string): NeedleSize | null {
  const text = input.trim();
  if (!text) return null;

  const usPrefixed = /^us\s*(\d+(?:[.,]\d+)?|\d*½|\d+½)$/i.exec(text);
  if (usPrefixed) return US_MAP.get(normalizeUs(usPrefixed[1])) ?? null;

  const mmMatch = /^(\d+(?:[.,]\d+)?)\s*(mm)?$/i.exec(text);
  if (mmMatch) {
    const value = Number(mmMatch[1].replace(',', '.'));
    const byMm = NEEDLE_SIZES.find((size) => size.mm === value);
    if (byMm || mmMatch[2]) return byMm ?? null;
  }

  return /^\d+(?:[.,]\d+|½)?$/.test(text) ? (US_MAP.get(normalizeUs(text)) ?? null) : null;
}

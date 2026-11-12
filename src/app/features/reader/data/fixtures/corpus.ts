import mabelMarketBag from './01-mabel-market-bag.txt?raw';
import mushroomToteBag from './02-mushroom-tote-bag.txt?raw';
import pumpkinHarvestHat from './03-pumpkin-harvest-hat.txt?raw';
import lipBalmCase from './04-lip-balm-case.txt?raw';
import lipbalmMushroom from './05-lipbalm-mushroom.txt?raw';
import f06 from './06-en-little-bear-pdf.txt?raw';
import f07 from './07-fr-petit-lapin-pdf.txt?raw';
import f08 from './08-fr-bonnet-rangs-groupes.txt?raw';
import f09 from './09-en-coaster-sentences.txt?raw';
import f10 from './10-fr-doudou-phrases.txt?raw';
import f11 from './11-en-knit-scarf.txt?raw';
import f12 from './12-fr-snood-pdf.txt?raw';

/** Tous les patrons d'essai, dans l'ordre des fichiers. */
export interface Fixture {
  readonly name: string;
  readonly raw: string;
}

export const CORPUS: readonly Fixture[] = [
  { name: '01-mabel-market-bag.txt', raw: mabelMarketBag },
  { name: '02-mushroom-tote-bag.txt', raw: mushroomToteBag },
  { name: '03-pumpkin-harvest-hat.txt', raw: pumpkinHarvestHat },
  { name: '04-lip-balm-case.txt', raw: lipBalmCase },
  { name: '05-lipbalm-mushroom.txt', raw: lipbalmMushroom },
  { name: '06-en-little-bear-pdf.txt', raw: f06 },
  { name: '07-fr-petit-lapin-pdf.txt', raw: f07 },
  { name: '08-fr-bonnet-rangs-groupes.txt', raw: f08 },
  { name: '09-en-coaster-sentences.txt', raw: f09 },
  { name: '10-fr-doudou-phrases.txt', raw: f10 },
  { name: '11-en-knit-scarf.txt', raw: f11 },
  { name: '12-fr-snood-pdf.txt', raw: f12 },
];

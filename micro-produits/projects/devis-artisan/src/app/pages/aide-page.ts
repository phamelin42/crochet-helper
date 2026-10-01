import { Component, inject } from '@angular/core';
import { Contenu, PRODUIT, SeoService } from '@mp/core';
import { Blocs, Faq, Hero, faqJsonLd } from '@mp/ui/sections';
import contenu from '../../../contenu.json';

/** Aide et questions fréquentes, rédigées pour ce produit (`contenu.json` → `aide`). */
@Component({
  selector: 'app-aide-page',
  imports: [Blocs, Faq, Hero],
  template: `
    <mp-hero [titre]="c.aide.titre" [chapo]="c.aide.intro" />
    <mp-blocs id="guide" titre="Pas à pas" [blocs]="c.aide.sections" />
    <mp-faq [questions]="c.aide.faq" />
  `,
})
export class AidePage {
  protected readonly c: Contenu = contenu;

  constructor() {
    inject(SeoService).apply({
      title: `${contenu.aide.titre} — ${inject(PRODUIT).nom}`,
      description: contenu.aide.description,
      path: '/aide',
      jsonLd: faqJsonLd(contenu.aide.faq),
    });
  }
}

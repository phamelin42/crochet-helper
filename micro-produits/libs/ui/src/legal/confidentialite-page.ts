import { Component, inject } from '@angular/core';
import { PRODUIT, SeoService } from '@mp/core';

/** Commune aux produits, donc `noindex` (voir mentions légales). */
@Component({
  selector: 'mp-confidentialite-page',
  template: `
    <article class="prose">
      <h1>Confidentialité</h1>
      <h2>Vos données restent sur votre appareil</h2>
      <p>
        Tout ce que vous saisissez dans {{ nom }} est enregistré dans votre navigateur, sur cet
        appareil. Rien n'est envoyé à un serveur. Vider les données du site les efface
        définitivement.
      </p>
      <h2>Mesure d'audience</h2>
      <p>
        Nous comptons les visites et quelques actions (par exemple «&nbsp;un document a été
        exporté&nbsp;») avec Umami, hébergé par l'éditeur. Aucun cookie, aucun identifiant
        persistant, aucune donnée saisie n'est transmis. Cette mesure est exemptée de consentement
        (recommandations de la CNIL sur les traceurs de mesure d'audience)&nbsp;: aucun bandeau ne
        vous est donc demandé.
      </p>
      <h2>Vos droits</h2>
      <p>
        Aucune donnée personnelle n'est conservée par l'éditeur. Pour toute question&nbsp;:
        {{ contact }}.
      </p>
    </article>
  `,
})
export class ConfidentialitePage {
  private readonly produit = inject(PRODUIT);
  protected readonly nom = this.produit.nom;
  protected readonly contact = this.produit.editeur.contact;

  constructor() {
    inject(SeoService).apply({
      title: `Confidentialité — ${this.nom}`,
      description: `Ce que ${this.nom} enregistre, où, et ce qui est mesuré\u00a0: rien de ce que vous saisissez ne quitte votre appareil.`,
      path: '/confidentialite',
      noIndex: true,
    });
  }
}

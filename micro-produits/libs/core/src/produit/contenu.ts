import { InjectionToken } from '@angular/core';

export interface Bloc {
  titre: string;
  /** Texte brut ; une ligne vide sépare deux paragraphes. Jamais du HTML. */
  texte: string;
}

export interface QuestionReponse {
  question: string;
  reponse: string;
}

/**
 * Contenu éditorial d'un produit (`contenu.json`), rédigé pour lui seul :
 * `tools/check-contenu.mjs` fait échouer le build si deux produits partagent
 * une phrase. Les bibliothèques n'en contiennent aucun.
 */
export interface Contenu {
  accueil: {
    /** Titre de la page (<h1>), au plus près de la requête visée. */
    titre: string;
    /** Paragraphe d'ouverture sous le titre, au-dessus de l'outil. */
    chapo: string;
    explication: Bloc[];
    exemples: Bloc[];
  };
  aide: {
    titre: string;
    /** Meta description de la page d'aide. */
    description: string;
    intro: string;
    sections: Bloc[];
    faq: QuestionReponse[];
  };
  offre: Bloc;
}

export const CONTENU = new InjectionToken<Contenu>('mp.contenu');

/** Découpe un texte brut en paragraphes. */
export function paragraphes(texte: string): string[] {
  return texte
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

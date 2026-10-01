import produit from '../../../produit.json';

/**
 * Fiche d'identité du produit, générée par `nouveau-produit.mjs` dans
 * `produit.json`. Seule source du nom, du domaine et des textes de marque :
 * aucun composant ne les recopie.
 */
export interface Produit {
  slug: string;
  nom: string;
  domaine: string;
  requete: string;
  promesse: string;
  description: string;
  exports: readonly string[];
  editeur: {
    nom: string;
    statut: string;
    adresse: string;
    contact: string;
    hebergeur: string;
  };
  mesure: { origine: string; siteId: string; googleVerification: string };
}

export const PRODUIT: Produit = produit;
export const SITE_ORIGIN_DEFAUT = `https://${produit.domaine}`;

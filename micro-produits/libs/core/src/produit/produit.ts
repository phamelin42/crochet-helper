import { InjectionToken } from '@angular/core';

/** Familles typographiques proposées : chaque valeur correspond à une pile définie dans tokens.css. */
export type Typographie = 'humaniste' | 'geometrique' | 'serif' | 'arrondie';

/**
 * Configuration d'un produit : son `produit.json`, généré par le schematic
 * depuis `produits.json`. C'est la seule différence entre deux produits en
 * dehors du module métier et du contenu éditorial — aucun composant n'est
 * dupliqué pour changer l'apparence.
 */
export interface ProduitConfig {
  slug: string;
  nom: string;
  domaine: string;
  requete: string;
  /** Meta description de l'accueil (140 à 160 caractères), unique par produit. */
  description: string;
  promesse: string;
  exports: readonly string[];
  /** Fichier du logo dans `public/` du produit (SVG). */
  logo: string;
  theme: {
    /** Décor et remplissage, jamais seul sous du texte. */
    accent: string;
    /** Porte du texte blanc (bouton principal) : contraste ≥ 4,5:1. */
    accentFonce: string;
    typographie: Typographie;
    /** Propose le thème sombre (bouton explicite) ; jamais déclenché par le réglage système. */
    sombre: boolean;
  };
  offre: {
    /** `bientot` : on mesure l'intérêt ; `active` exige le module de paiement (ADR à écrire). */
    statut: 'bientot' | 'active';
  };
  editeur: { nom: string; statut: string; adresse: string; contact: string; hebergeur: string };
  mesure: { origine: string; siteId: string; googleVerification: string };
}

export const PRODUIT = new InjectionToken<ProduitConfig>('mp.produit');

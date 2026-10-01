/**
 * Paiement : volontairement absent. Les produits sortent gratuits ; l'intérêt
 * pour l'offre complète se mesure (`offre_vue`, `offre_cliquee`). Brancher un
 * prestataire suppose un back-end (webhooks, droits), donc un ADR validé par
 * Phil — c'est ici que vivra l'interface commune, pas dans un produit.
 */
export type StatutOffre = 'bientot' | 'active';

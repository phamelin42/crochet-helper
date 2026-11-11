// Avant le premier rendu : pose `data-app` (mode appli, fiche 43), puis `data-dim` et
// `data-text-size` (préférences d'affichage, lot 2a de l'audit front).
// Le filet de la TWA, `?mode=app`, ne se lit qu'en JavaScript ; sans ce script,
// le HTML pré-rendu du site s'afficherait un instant avant de se transformer en
// application (CLS de 0,35). Fichier à part, pas en ligne : la CSP interdit les
// scripts inline. Même logique que `AppModeService`, qui reste la source de vérité
// côté Angular : clé de session `fil.appMode`.
(function () {
  try {
    var requested = /[?&]mode=app(&|$)/.test(location.search);
    if (requested) sessionStorage.setItem('fil.appMode', 'twa');
    if (requested || sessionStorage.getItem('fil.appMode') === 'twa') {
      document.documentElement.setAttribute('data-app', '');
    }
  } catch (e) {
    /* stockage refusé : le service Angular prendra le relais, sans mémoire de session */
  }
})();

// Préférences d'affichage : sans ce script, `DisplayPrefsService` ne les pose qu'à
// l'hydratation, et la première image est claire et petite pour qui a choisi le
// fond sombre ou un grand texte (jusqu'à 0,3 s sur tablette). Mêmes clés et mêmes
// valeurs que le service, qui reste la source de vérité côté Angular ; chaque
// lecture a son propre try/catch pour qu'une valeur illisible n'en bloque pas une autre.
(function () {
  var root = document.documentElement;
  try {
    if (JSON.parse(localStorage.getItem('fil.dim')) === true) {
      root.setAttribute('data-dim', 'true');
    }
  } catch (e) {
    /* absent, illisible ou stockage refusé : le service Angular prendra le relais */
  }
  try {
    var size = JSON.parse(localStorage.getItem('fil.textSize'));
    if (size === 'lg' || size === 'xl') root.setAttribute('data-text-size', size);
  } catch (e) {
    /* idem */
  }
})();

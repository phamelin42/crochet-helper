// Mode appli (fiche 43) : pose `data-app` sur <html> avant le premier rendu.
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

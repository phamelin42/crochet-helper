// Point d'entrée de la coquille, importé au premier affichage. Les sections
// (`@mp/ui/sections`) et les pages légales (`@mp/ui/legal`) ont leur propre
// point d'entrée : réexportées ici, elles entreraient toutes dans le bundle
// initial (mesuré : +19 ko).
export * from './layout/install-button';
export * from './layout/shell';
export * from './layout/site-footer';
export * from './layout/site-header';
export * from './layout/theme-toggle';
export * from './layout/update-banner';

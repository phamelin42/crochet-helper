import { PLATFORM_ID, Service, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { NavigationEnd, Route, Router } from '@angular/router';

/** Une route chargée à la demande et son chemin complet, découpé en segments. */
interface Target {
  readonly segments: readonly string[];
  readonly route: Route;
}

/** Aplatit l'arbre des routes en chemins complets (`fr/glossaire/:slug`). */
export function prefetchTargets(routes: readonly Route[], prefix: string[] = []): Target[] {
  return routes.flatMap((route) => {
    if (route.path === '**') return [];
    const segments = [...prefix, ...(route.path ? route.path.split('/') : [])];
    const own = route.loadComponent ? [{ segments, route }] : [];
    return [...own, ...prefetchTargets(route.children ?? [], segments)];
  });
}

/** La route qui servira `pathname`, ou `null` (lien externe, ancre, fichier). */
export function matchTarget(targets: readonly Target[], pathname: string): Route | null {
  const parts = pathname.split('/').filter(Boolean);
  const target = targets.find(
    ({ segments }) =>
      segments.length === parts.length &&
      segments.every((segment, i) => segment.startsWith(':') || segment === parts[i]),
  );
  return target?.route ?? null;
}

/** `navigator.connection` n'existe pas partout ; la lib DOM ne le déclare pas. */
type ConnectionNavigator = Navigator & {
  connection?: { saveData?: boolean; effectiveType?: string };
};

/**
 * Anticipe la page suivante : télécharge le code d'une route **avant** le
 * clic, pour que la navigation soit instantanée.
 *
 * - Intention (survol, focus clavier, toucher) : la route du lien est chargée
 *   aussitôt — un doigt posé précède le clic d'une centaine de millisecondes.
 * - Visibilité : quand le navigateur est inactif, les routes des liens
 *   visibles à l'écran sont chargées (navigation, maillage interne). Sauté en
 *   mode « économie de données » et en 2G, où l'on ne paie que ce qu'on ouvre.
 *
 * Chaque route n'est chargée qu'une fois ; le routeur retrouve ensuite le
 * module déjà présent dans le navigateur, sans requête. Préféré au
 * préchargeur du routeur (`withPreloading`), qui entre dans le bundle initial
 * et ne sait pas cibler. Ce fichier-ci est lui-même chargé par `import()` une
 * fois l'application stable (`app.config.ts`) : zéro octet au premier
 * affichage.
 */
@Service()
export class RoutePrefetch {
  private readonly router = inject(Router);
  private readonly loaded = new WeakSet<Route>();
  private targets: Target[] = [];
  private observer: IntersectionObserver | null = null;

  constructor() {
    if (isPlatformBrowser(inject(PLATFORM_ID))) this.start();
  }

  /** Charge la route servant `href`, si c'est une page du site pas encore chargée. */
  prefetch(href: string): void {
    const url = new URL(href, location.href);
    if (url.origin !== location.origin) return;
    const route = matchTarget(this.targets, url.pathname);
    if (!route?.loadComponent || this.loaded.has(route)) return;
    this.loaded.add(route);
    // Un échec (hors ligne) n'est pas grave : le routeur réessaiera au clic.
    void Promise.resolve(route.loadComponent()).catch(() => this.loaded.delete(route));
  }

  private start(): void {
    this.targets = prefetchTargets(this.router.config);

    const onIntent = (event: Event) => {
      const link = (event.target as Element | null)?.closest?.('a[href]');
      if (link instanceof HTMLAnchorElement) this.prefetch(link.href);
    };
    for (const type of ['pointerover', 'focusin', 'touchstart']) {
      document.addEventListener(type, onIntent, { capture: true, passive: true });
    }

    const connection = (navigator as ConnectionNavigator).connection;
    const frugal = connection?.saveData || connection?.effectiveType?.includes('2g');
    if (frugal || typeof IntersectionObserver === 'undefined') return;

    this.watchVisibleLinks();
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationEnd) this.watchVisibleLinks();
    });
  }

  /** Après le rendu de la page, observe ses liens ; charge ceux qui entrent à l'écran. */
  private watchVisibleLinks(): void {
    whenIdle(() => {
      this.observer?.disconnect();
      const observer = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          observer.unobserve(entry.target);
          const href = (entry.target as HTMLAnchorElement).href;
          whenIdle(() => this.prefetch(href));
        }
      });
      document.querySelectorAll('a[href]').forEach((link) => observer.observe(link));
      this.observer = observer;
    });
  }
}

/** `requestIdleCallback` manque à Safari : repli sur un délai court. */
function whenIdle(task: () => void): void {
  if (typeof requestIdleCallback === 'function') requestIdleCallback(task, { timeout: 3000 });
  else setTimeout(task, 200);
}

import { RenderMode, ServerRoute } from '@angular/ssr';

/** Tout est pré-rendu : chaque route existe en HTML complet dans `dist/app/browser`. */
export const serverRoutes: ServerRoute[] = [{ path: '**', renderMode: RenderMode.Prerender }];

import { RenderMode, ServerRoute } from '@angular/ssr';

/** Tout est pré-rendu. */
export const serverRoutes: ServerRoute[] = [{ path: '**', renderMode: RenderMode.Prerender }];

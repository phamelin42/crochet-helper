import { Component, effect, inject, input, signal, untracked } from '@angular/core';
import { Router } from '@angular/router';
import { I18nService } from '../../../core/i18n/i18n.service';
import { RavelrySession } from '../../../core/ravelry/ravelry-session.service';
import { Button } from '../../../shared/ui/button/button';
import { RavelryConnection } from '../../../shared/ui/ravelry-connection/ravelry-connection';
import { CONNECT_COPY } from '../data/connect-copy';
import { DISCOVER_COPY } from '../data/discover-copy';
import { DiscoverStore } from '../state/discover-store';

/**
 * « Ouvrages réalisés avec ce patron » : photos et lien vers chaque projet sur
 * Ravelry, rien d'autre (ni nom, ni notes). Contenus d'utilisateurs de Ravelry :
 * visible seulement pour une lectrice connectée, quel que soit le mode d'accès.
 */
@Component({
  selector: 'fil-pattern-projects',
  imports: [Button, RavelryConnection],
  template: `
    <section class="discover-projects" aria-labelledby="projects-title">
      <h2 id="projects-title">{{ c.galleryTitle }}</h2>
      @if (!session.loaded()) {
        <p role="status">{{ c.checking }}</p>
      } @else if (!session.connected()) {
        <fil-ravelry-connection
          [connectLabel]="c.galleryLogin"
          [busyLabel]="c.connecting"
          [connectedLabel]="c.connected"
          [disconnectLabel]="c.disconnect"
          [busy]="busy()"
          [message]="failed() ? c.unavailable : ''"
          (connect)="connect()"
        />
      } @else {
        @switch (store.projectsStatus()) {
          @case ('loading') {
            <p role="status">{{ c.galleryLoading }}</p>
          }
          @case ('error') {
            <div role="alert" class="discover-alert">
              <p>{{ c.galleryError }}</p>
              <button type="button" filButton="secondary" (click)="load()">{{ d.retry }}</button>
            </div>
          }
          @case ('ok') {
            @if (store.projects().length) {
              <ul class="discover-grid projects-grid">
                @for (projet of store.projects(); track projet.lien; let n = $index) {
                  <li class="project-item">
                    <img
                      [src]="projet.photo"
                      [alt]="c.projectPhoto(n + 1)"
                      width="240"
                      height="240"
                      loading="lazy"
                      referrerpolicy="no-referrer"
                    />
                    <a [href]="projet.lien" target="_blank" rel="noopener noreferrer">
                      {{ c.projectLink }}
                      <span class="visually-hidden">{{ c.projectLinkHidden(n + 1) }}</span>
                    </a>
                  </li>
                }
              </ul>
              @if (store.hasMoreProjects()) {
                <p>
                  <button
                    type="button"
                    filButton="secondary"
                    [disabled]="store.projectsMoreBusy()"
                    (click)="store.moreProjects()"
                  >
                    {{ store.projectsMoreBusy() ? c.galleryMoreLoading : c.galleryMore }}
                  </button>
                </p>
              }
            } @else {
              <p>{{ c.galleryEmpty }}</p>
            }
          }
        }
      }
    </section>
  `,
})
export class PatternProjects {
  protected readonly store = inject(DiscoverStore);
  protected readonly session = inject(RavelrySession);
  private readonly i18n = inject(I18nService);

  readonly id = input.required<number>();
  protected readonly c = CONNECT_COPY[this.i18n.locale()];
  protected readonly d = DISCOVER_COPY[this.i18n.locale()];
  private readonly router = inject(Router);
  protected readonly busy = signal(false);
  protected readonly failed = signal(false);

  constructor() {
    effect(() => {
      const id = this.id();
      // Seulement une fois la connexion lue ET présente : sans elle, rien n'est demandé.
      if (!this.session.loaded() || !this.session.connected()) return;
      untracked(() => void this.store.openProjects(id));
    });
  }

  protected async connect(): Promise<void> {
    this.busy.set(true);
    this.failed.set(false);
    // Le retour ramène à cette fiche, galerie comprise.
    if (!(await this.session.begin(this.router.url))) {
      this.busy.set(false);
      this.failed.set(true);
    }
  }

  protected load(): void {
    void this.store.openProjects(this.id());
  }
}

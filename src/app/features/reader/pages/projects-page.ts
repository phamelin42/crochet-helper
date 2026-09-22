import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { I18nService } from '../../../core/i18n/i18n.service';
import { DEFAULT_LOCALE, Locale } from '../../../core/i18n/locale';
import { ROUTE_PATHS } from '../../../core/i18n/route-paths';
import { SeoService } from '../../../core/seo/seo.service';
import { SITE_NAME } from '../../../core/seo/site';
import { DurationPipe } from '../../../shared/pipes/duration.pipe';
import { Button } from '../../../shared/ui/button/button';
import { Dialog } from '../../../shared/ui/dialog/dialog';
import { InputField } from '../../../shared/ui/field/input';
import { Project } from '../data/project.model';
import { ReaderStore } from '../state/reader-store';

const SEO: Record<Locale, { title: string; description: string }> = {
  fr: {
    title: `Mes projets — ${SITE_NAME}`,
    description: 'Retrouvez vos patrons en cours, reprenez-en un ou exportez une sauvegarde.',
  },
  en: {
    title: `My projects — ${SITE_NAME}`,
    description: 'Find your patterns in progress, resume one, or export a backup.',
  },
};

/**
 * Écran de liste des projets : reprise en un clic, renommage, suppression, et
 * export/import de sauvegarde. Personnelle et locale à l'appareil — sans
 * intérêt pour un moteur de recherche, elle n'est pas indexée.
 */
@Component({
  selector: 'fil-projects-page',
  imports: [Button, Dialog, DurationPipe, InputField],
  host: { class: 'wrap' },
  template: `
    <section class="hero">
      <h1>{{ t('ui.projectsTitle') }}</h1>
      <p>{{ t('ui.projectsLead') }}</p>
    </section>

    <div class="projects-actions">
      <button type="button" filButton="primary" (click)="startNew()">
        {{ t('ui.newProject') }}
      </button>
      <button type="button" filButton="secondary" (click)="download()">
        {{ t('ui.exportBackup') }}
      </button>
      <button type="button" filButton="secondary" (click)="importFileInput().nativeElement.click()">
        {{ t('ui.importBackup') }}
      </button>
      <input
        #importFile
        type="file"
        accept="application/json,.json"
        class="visually-hidden"
        (change)="onImport($event)"
      />
    </div>

    @if (importMessage(); as message) {
      <p class="hint" role="alert">
        {{ message === 'ok' ? t('ui.importOk') : t('ui.importInvalid') }}
      </p>
    }

    @if (store.sortedProjects().length) {
      <ul class="projects-list">
        @for (project of store.sortedProjects(); track project.id) {
          <li class="card">
            <div>
              <p class="card-title">{{ project.name || t('ui.untitledProject') }}</p>
              <p class="card-meta">
                {{ t('ui.lastOpened') }} {{ formatDate(project.lastOpenedAt) }} ·
                {{ project.elapsed | filDuration }}
              </p>
            </div>
            <div class="projects-actions">
              <button type="button" filButton="primary" (click)="resume(project.id)">
                {{ t('ui.resume') }}
              </button>
              <button type="button" filButton="secondary" (click)="openRename(project)">
                {{ t('ui.rename') }}
              </button>
              <button type="button" filButton="ghost" (click)="openDelete(project)">
                {{ t('ui.delete') }}
              </button>
            </div>
          </li>
        }
      </ul>
    } @else {
      <p class="card-body">{{ t('ui.projectsEmpty') }}</p>
    }

    <fil-dialog [(open)]="renameOpen" [label]="t('ui.rename')">
      <h2 class="dialog-title">{{ t('ui.rename') }}</h2>
      <div class="field">
        <label for="rename-input">{{ t('ui.renameLabel') }}</label>
        <input filInput id="rename-input" #renameField [value]="renameTarget()?.name ?? ''" />
      </div>
      <div class="dialog-actions">
        <button type="button" filButton="secondary" (click)="renameOpen.set(false)">
          {{ t('ui.cancel') }}
        </button>
        <button type="button" filButton="primary" (click)="saveRename(renameField.value)">
          {{ t('ui.save') }}
        </button>
      </div>
    </fil-dialog>

    <fil-dialog [(open)]="deleteOpen" [label]="t('ui.delete')">
      <h2 class="dialog-title">{{ t('ui.deleteConfirmTitle') }}</h2>
      <p class="dialog-body">{{ t('ui.deleteConfirmBody') }}</p>
      <div class="dialog-actions">
        <button type="button" filButton="secondary" (click)="deleteOpen.set(false)">
          {{ t('ui.cancel') }}
        </button>
        <button type="button" filButton="primary" (click)="confirmDelete()">
          {{ t('ui.deleteConfirmAction') }}
        </button>
      </div>
    </fil-dialog>
  `,
  styles: `
    .projects-actions {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
      margin-bottom: var(--space-4);
    }
    .projects-list {
      display: grid;
      gap: var(--space-2);
      padding: 0;
      margin: 0;
      list-style: none;
    }
    .projects-list .card {
      flex-direction: row;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-3);
    }
  `,
})
export class ProjectsPage {
  protected readonly store = inject(ReaderStore);
  protected readonly i18n = inject(I18nService);
  private readonly seo = inject(SeoService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  private readonly locale = (this.route.snapshot.data['locale'] as Locale) ?? DEFAULT_LOCALE;

  protected t = (key: Parameters<I18nService['t']>[0]) => this.i18n.t(key);

  protected readonly renameOpen = signal(false);
  protected readonly renameTarget = signal<Project | null>(null);
  protected readonly deleteOpen = signal(false);
  protected readonly deleteTarget = signal<Project | null>(null);
  protected readonly importMessage = signal<'ok' | 'invalid' | null>(null);
  protected readonly importFileInput =
    viewChild.required<ElementRef<HTMLInputElement>>('importFile');

  constructor() {
    this.i18n.setLocale(this.locale);
    this.seo.apply({
      ...SEO[this.locale],
      path: ROUTE_PATHS.projects,
      locale: this.locale,
      noIndex: true,
    });
  }

  protected formatDate(ms: number): string {
    return new Intl.DateTimeFormat(this.locale === 'fr' ? 'fr-FR' : 'en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(ms);
  }

  protected startNew(): void {
    this.store.clear();
    void this.router.navigateByUrl(this.i18n.link('reader'));
  }

  protected resume(id: string): void {
    this.store.resumeProject(id);
    void this.router.navigateByUrl(this.i18n.link('reader'));
  }

  protected openRename(project: Project): void {
    this.renameTarget.set(project);
    this.renameOpen.set(true);
  }

  protected async saveRename(value: string): Promise<void> {
    const target = this.renameTarget();
    if (!target) return;
    await this.store.renameProject(target.id, value);
    this.renameOpen.set(false);
  }

  protected openDelete(project: Project): void {
    this.deleteTarget.set(project);
    this.deleteOpen.set(true);
  }

  protected async confirmDelete(): Promise<void> {
    const target = this.deleteTarget();
    if (!target) return;
    await this.store.removeProject(target.id);
    this.deleteOpen.set(false);
  }

  protected download(): void {
    const blob = this.store.exportBackup();
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fil-sauvegarde-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  protected async onImport(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    const ok = await this.store.importBackup(file);
    this.importMessage.set(ok ? 'ok' : 'invalid');
  }
}

import { Component, ElementRef, computed, inject, signal, viewChild } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AnalyticsService } from '../../../core/analytics/analytics.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { FocusService } from '../../../core/platform/focus.service';
import { ShareService } from '../../../core/platform/share.service';
import { SITE_NAME, SITE_ORIGIN } from '../../../core/seo/site';
import { DurationPipe } from '../../../shared/pipes/duration.pipe';
import { Button } from '../../../shared/ui/button/button';
import { Celebration } from '../../../shared/ui/celebration/celebration';
import { Dialog } from '../../../shared/ui/dialog/dialog';
import { FinishedPhotoResult, ReaderStore } from '../state/reader-store';

// Les textes vivent ici et non dans `reader-copy.ts` : l'écran n'existe qu'une
// fois le patron fini, il ne doit pas peser sur le premier affichage.
const NBSP = ' ';
const COPY = {
  fr: {
    title: `Bravo, votre ouvrage est terminé${NBSP}!`,
    steps: (n: number) => `${n} ${n > 1 ? 'étapes' : 'étape'}`,
    time: (time: string) => `Temps passé${NBSP}: ${time}`,
    addPhoto: 'Ajouter une photo de mon ouvrage',
    changePhoto: 'Changer la photo',
    removePhoto: 'Retirer la photo',
    share: 'Partager',
    copyMessage: 'Copier le message',
    savePhoto: 'Enregistrer la photo',
    restart: 'Recommencer ce patron',
    projects: 'Mes projets',
    review: 'Revoir la dernière étape',
    cancel: 'Annuler',
    photoAlt: (name: string) =>
      name ? `Photo de votre ouvrage terminé${NBSP}: ${name}` : 'Photo de votre ouvrage terminé',
    shareText: (name: string) =>
      name
        ? `J’ai terminé ${name} avec ${SITE_NAME}${NBSP}!`
        : `J’ai terminé mon ouvrage avec ${SITE_NAME}${NBSP}!`,
    restartTitle: `Recommencer ce patron${NBSP}?`,
    restartBody:
      'Les étapes cochées, les compteurs et le chronomètre repartent de zéro. Le patron et la photo de votre ouvrage sont conservés.',
    restartAction: 'Recommencer',
    replaceTitle: `Remplacer la photo${NBSP}?`,
    replaceBody:
      'Une seule photo est gardée par ouvrage : la nouvelle remplacera l’actuelle, une fois enregistrée.',
    replaceAction: 'Choisir une autre photo',
    removeTitle: `Retirer la photo${NBSP}?`,
    removeBody: 'La photo sera supprimée de cet appareil. Le patron reste terminé.',
    removeAction: 'Retirer la photo',
    photoSaved: 'Photo enregistrée sur cet appareil. Elle ne va nulle part ailleurs.',
    photoRemoved: 'Photo retirée.',
    copied: 'Message copié.',
    downloaded: 'Photo enregistrée dans vos téléchargements.',
    'too-large': 'Cette photo dépasse 25 Mo. Choisissez-en une plus légère.',
    'not-image':
      'Ce fichier n’est pas une image que l’application sait lire. Choisissez une photo.',
    failed:
      'La photo n’a pas pu être enregistrée sur cet appareil (espace insuffisant ?). Rien n’a été modifié.',
    removeFailed: 'La photo n’a pas pu être retirée. Rien n’a été modifié.',
    shareFailed: 'Le partage n’a pas abouti. Vous pouvez copier le message à la place.',
    copyFailed: 'Le message n’a pas pu être copié.',
    downloadFailed: 'La photo n’a pas pu être enregistrée.',
  },
  en: {
    title: 'Well done, your project is finished!',
    steps: (n: number) => `${n} ${n > 1 ? 'steps' : 'step'}`,
    time: (time: string) => `Time spent: ${time}`,
    addPhoto: 'Add a photo of my piece',
    changePhoto: 'Change the photo',
    removePhoto: 'Remove the photo',
    share: 'Share',
    copyMessage: 'Copy the message',
    savePhoto: 'Save the photo',
    restart: 'Start this pattern over',
    projects: 'My projects',
    review: 'Review the last step',
    cancel: 'Cancel',
    photoAlt: (name: string) =>
      name ? `Photo of your finished piece: ${name}` : 'Photo of your finished piece',
    shareText: (name: string) =>
      name ? `I finished ${name} with ${SITE_NAME}!` : `I finished my project with ${SITE_NAME}!`,
    restartTitle: 'Start this pattern over?',
    restartBody:
      'Ticked steps, counters and the timer go back to zero. The pattern and the photo of your piece are kept.',
    restartAction: 'Start over',
    replaceTitle: 'Replace the photo?',
    replaceBody:
      'One photo is kept per project: the new one replaces the current one once it is saved.',
    replaceAction: 'Choose another photo',
    removeTitle: 'Remove the photo?',
    removeBody: 'The photo will be deleted from this device. The pattern stays finished.',
    removeAction: 'Remove the photo',
    photoSaved: 'Photo saved on this device. It goes nowhere else.',
    photoRemoved: 'Photo removed.',
    copied: 'Message copied.',
    downloaded: 'Photo saved to your downloads.',
    'too-large': 'This photo is over 25 MB. Please choose a smaller one.',
    'not-image': 'This file is not an image the app can read. Please choose a photo.',
    failed: 'The photo could not be saved on this device (not enough space?). Nothing was changed.',
    removeFailed: 'The photo could not be removed. Nothing was changed.',
    shareFailed: 'Sharing did not go through. You can copy the message instead.',
    copyFailed: 'The message could not be copied.',
    downloadFailed: 'The photo could not be saved.',
  },
} as const;

interface Notice {
  readonly kind: 'status' | 'error';
  readonly text: string;
}

/**
 * L'écran qui remplace la dernière étape quand le patron est fini : une
 * célébration, la photo de l'ouvrage gardée sur l'appareil, le partage, et la
 * suite (recommencer, mes projets). Chargé par `import()` depuis `FinishSlot`
 * seulement quand la lectrice approche ou atteint la fin.
 */
@Component({
  selector: 'fil-finish-view',
  imports: [Button, Celebration, Dialog, RouterLink],
  template: `
    <fil-celebration [title]="c().title" [subtitle]="store.currentName()" [facts]="facts()">
      @if (store.finishedPhotoUrl(); as photo) {
        <figure celebrationVisual class="finish-photo">
          <img
            [src]="photo.url"
            [width]="photo.width"
            [height]="photo.height"
            [alt]="c().photoAlt(store.currentName())"
          />
        </figure>
      } @else {
        <img
          celebrationVisual
          class="finish-art"
          src="/illustrations/pelote.svg"
          width="240"
          height="200"
          alt=""
        />
      }

      <!-- Régions toujours présentes : une région vive qui apparaît avec son texte n'est pas annoncée. -->
      <div celebrationNote class="finish-messages">
        <p class="hint" role="status">{{ notice()?.kind === 'status' ? notice()?.text : '' }}</p>
        <p class="hint" role="alert">{{ notice()?.kind === 'error' ? notice()?.text : '' }}</p>
      </div>

      <button
        #addButton
        type="button"
        [filButton]="hasPhoto() ? 'secondary' : 'primary'"
        (click)="pickPhoto()"
      >
        {{ hasPhoto() ? c().changePhoto : c().addPhoto }}
      </button>
      <input
        #fileInput
        type="file"
        accept="image/*"
        class="visually-hidden"
        tabindex="-1"
        aria-hidden="true"
        (change)="onFile($event)"
      />
      @if (hasNativeShare) {
        <button
          type="button"
          [filButton]="hasPhoto() ? 'primary' : 'secondary'"
          (click)="shareNative()"
        >
          {{ c().share }}
        </button>
      }
      @if (!hasNativeShare || shareFailed()) {
        <button type="button" filButton="secondary" (click)="copyMessage()">
          {{ c().copyMessage }}
        </button>
        @if (hasPhoto()) {
          <button type="button" filButton="secondary" (click)="savePhoto()">
            {{ c().savePhoto }}
          </button>
        }
      }
      @if (hasPhoto()) {
        <button type="button" filButton="ghost" (click)="removeOpen.set(true)">
          {{ c().removePhoto }}
        </button>
      }
      <button type="button" filButton="ghost" (click)="restartOpen.set(true)">
        {{ c().restart }}
      </button>
      <a filButton="secondary" [routerLink]="i18n.link('projects')">{{ c().projects }}</a>
      <!-- « Chercher un autre patron » : la page n'existe pas encore, pas de lien mort. -->
      <button type="button" filButton="ghost" (click)="review()">{{ c().review }}</button>
    </fil-celebration>

    <fil-dialog [(open)]="restartOpen" [label]="c().restartTitle">
      <h2 class="dialog-title">{{ c().restartTitle }}</h2>
      <p class="dialog-body">{{ c().restartBody }}</p>
      <div class="dialog-actions">
        <button type="button" filButton="secondary" (click)="restartOpen.set(false)">
          {{ c().cancel }}
        </button>
        <button type="button" filButton="primary" (click)="confirmRestart()">
          {{ c().restartAction }}
        </button>
      </div>
    </fil-dialog>

    <fil-dialog [(open)]="replaceOpen" [label]="c().replaceTitle">
      <h2 class="dialog-title">{{ c().replaceTitle }}</h2>
      <p class="dialog-body">{{ c().replaceBody }}</p>
      <div class="dialog-actions">
        <button type="button" filButton="secondary" (click)="replaceOpen.set(false)">
          {{ c().cancel }}
        </button>
        <button type="button" filButton="primary" (click)="confirmReplace()">
          {{ c().replaceAction }}
        </button>
      </div>
    </fil-dialog>

    <fil-dialog [(open)]="removeOpen" [label]="c().removeTitle">
      <h2 class="dialog-title">{{ c().removeTitle }}</h2>
      <p class="dialog-body">{{ c().removeBody }}</p>
      <div class="dialog-actions">
        <button type="button" filButton="secondary" (click)="removeOpen.set(false)">
          {{ c().cancel }}
        </button>
        <button type="button" filButton="primary" (click)="confirmRemove()">
          {{ c().removeAction }}
        </button>
      </div>
    </fil-dialog>
  `,
})
export class FinishView {
  protected readonly store = inject(ReaderStore);
  protected readonly i18n = inject(I18nService);
  private readonly share = inject(ShareService);
  private readonly analytics = inject(AnalyticsService);
  private readonly focus = inject(FocusService);
  private readonly origin = inject(SITE_ORIGIN);
  private readonly duration = new DurationPipe();

  private readonly addButton = viewChild.required<ElementRef<HTMLButtonElement>>('addButton');
  private readonly fileInput = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');

  protected readonly c = computed(() => COPY[this.i18n.locale()]);
  protected readonly hasPhoto = computed(() => this.store.finishedPhoto());
  protected readonly facts = computed(() => {
    const c = this.c();
    const facts: string[] = [c.steps(this.store.total())];
    if (this.store.elapsed() > 0) facts.push(c.time(this.duration.transform(this.store.elapsed())));
    return facts;
  });

  /** Web Share n'existe pas partout : sans lui, copier et enregistrer prennent la place. */
  protected readonly hasNativeShare = this.share.hasNativeShare();
  protected readonly shareFailed = signal(false);
  protected readonly notice = signal<Notice | null>(null);
  protected readonly restartOpen = signal(false);
  protected readonly replaceOpen = signal(false);
  protected readonly removeOpen = signal(false);
  private busy = false;

  protected pickPhoto(): void {
    // Chargé au clic, pas au choix du fichier : le service worker télécharge le site juste après le premier affichage.
    void import('../data/finished-photo');
    if (this.hasPhoto()) this.replaceOpen.set(true);
    else this.fileInput().nativeElement.click();
  }

  protected confirmReplace(): void {
    this.replaceOpen.set(false);
    this.fileInput().nativeElement.click();
  }

  protected async onFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || this.busy) return;
    this.busy = true;
    try {
      const result: FinishedPhotoResult = await this.store.setFinishedPhoto(file);
      this.notice.set(
        result === 'saved'
          ? { kind: 'status', text: this.c().photoSaved }
          : { kind: 'error', text: this.c()[result] },
      );
    } finally {
      this.busy = false;
    }
  }

  protected async confirmRemove(): Promise<void> {
    this.removeOpen.set(false);
    const removed = await this.store.removeFinishedPhoto();
    this.notice.set(
      removed
        ? { kind: 'status', text: this.c().photoRemoved }
        : { kind: 'error', text: this.c().removeFailed },
    );
    // Le bouton « Retirer » vient de disparaître : le focus reste sur un bouton du même écran.
    this.addButton().nativeElement.focus();
  }

  protected async shareNative(): Promise<void> {
    const photo = await this.store.finishedPhotoBlob();
    const outcome = await this.share.share({
      title: SITE_NAME,
      text: this.shareText(),
      url: this.siteUrl(),
      ...(photo ? { photo, fileName: 'mon-ouvrage.jpg' } : {}),
    });
    if (outcome === 'shared') {
      this.shareFailed.set(false);
      this.analytics.track('finished_shared', { canal: 'natif' });
    } else if (outcome === 'failed' || outcome === 'unsupported') {
      this.shareFailed.set(true);
      this.notice.set({ kind: 'error', text: this.c().shareFailed });
    }
    // Annulé : la lectrice a fermé la feuille de partage, rien à dire.
  }

  protected async copyMessage(): Promise<void> {
    const copied = await this.share.copyText(`${this.shareText()} ${this.siteUrl()}`);
    if (copied) this.analytics.track('finished_shared', { canal: 'copie' });
    this.notice.set(
      copied
        ? { kind: 'status', text: this.c().copied }
        : { kind: 'error', text: this.c().copyFailed },
    );
  }

  protected async savePhoto(): Promise<void> {
    const photo = await this.store.finishedPhotoBlob();
    const saved = !!photo && this.share.download(photo, 'mon-ouvrage.jpg');
    if (saved) this.analytics.track('finished_shared', { canal: 'telechargement' });
    this.notice.set(
      saved
        ? { kind: 'status', text: this.c().downloaded }
        : { kind: 'error', text: this.c().downloadFailed },
    );
  }

  protected confirmRestart(): void {
    this.restartOpen.set(false);
    this.store.restartPattern();
    this.focus.restoreIfLost();
  }

  protected review(): void {
    this.store.reviewLastStep();
    this.focus.restoreIfLost();
  }

  private shareText(): string {
    return this.c().shareText(this.store.currentName());
  }

  private siteUrl(): string {
    return `${this.origin}${this.i18n.prefix() || '/'}`;
  }
}

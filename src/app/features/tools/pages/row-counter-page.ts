import { Component, afterNextRender, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AnalyticsService } from '../../../core/analytics/analytics.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { DEFAULT_LOCALE, Locale, localePrefix } from '../../../core/i18n/locale';
import { ROUTE_PATHS } from '../../../core/i18n/route-paths';
import { WakeLockService } from '../../../core/platform/wake-lock.service';
import { SeoService } from '../../../core/seo/seo.service';
import { SITE_NAME, SITE_ORIGIN } from '../../../core/seo/site';
import { LocalStorageService } from '../../../core/storage/local-storage.service';
import { Button } from '../../../shared/ui/button/button';
import { Checkbox } from '../../../shared/ui/checkbox/checkbox';
import { Dialog } from '../../../shared/ui/dialog/dialog';
import { InputField } from '../../../shared/ui/field/input';
import {
  CounterState,
  INITIAL_COUNTER_STATE,
  increment,
  parseSaved,
  reset,
} from '../data/row-counter';

const NBSP = ' ';
const STORAGE_KEY = 'fil.rowCounter';
/** Au-delà de ce nombre de rangs, « Remettre à zéro » demande confirmation. */
const RESET_CONFIRM_THRESHOLD = 10;

interface RowCounterCopy {
  readonly seoTitle: string;
  readonly seoDescription: string;
  readonly h1: string;
  readonly lead: string;
  readonly minus: string;
  readonly plus: string;
  readonly resetAction: string;
  readonly resetConfirmTitle: string;
  readonly resetConfirmBody: string;
  readonly resetConfirmAction: string;
  readonly cancel: string;
  readonly wakeLabel: string;
  readonly targetLabel: string;
  readonly targetPlaceholder: string;
  readonly h2Purpose: string;
  readonly bodyPurpose: string;
  readonly h2Lose: string;
  readonly bodyLose: string;
  readonly h2Round: string;
  readonly bodyRound: string;
  readonly h2Repeat: string;
  readonly bodyRepeat: string;
  readonly calloutTitle: string;
  readonly calloutBody: string;
  readonly tryReader: string;
  readonly toGlossary: string;
  readonly toConverter: string;
}

const COPY: Record<Locale, RowCounterCopy> = {
  fr: {
    seoTitle: `Compteur de rangs crochet et tricot en ligne, gratuit — ${SITE_NAME}`,
    seoDescription:
      'Comptez vos rangs de crochet ou de tricot d’une main, avec un objectif optionnel et sa barre de progression. Gratuit, sans compte, la valeur se retient toute seule.',
    h1: 'Compteur de rangs crochet et tricot en ligne',
    lead: `Un chiffre en très grand, deux boutons très larges${NBSP}: comptez vos rangs sans lâcher votre ouvrage. La valeur se retient toute seule, même après avoir fermé l’onglet.`,
    minus: '−1',
    plus: '+1',
    resetAction: 'Remettre à zéro',
    resetConfirmTitle: 'Remettre le compteur à zéro ?',
    resetConfirmBody: `Cette action efface le rang actuel${NBSP}: elle ne peut pas être annulée.`,
    resetConfirmAction: 'Remettre à zéro',
    cancel: 'Annuler',
    wakeLabel: "Garder l'écran allumé",
    targetLabel: 'Jusqu’au rang',
    targetPlaceholder: 'Optionnel',
    h2Purpose: 'À quoi sert un compteur de rangs',
    bodyPurpose:
      'Un patron de crochet ou de tricot avance rang après rang, et il suffit d’une interruption — le téléphone qui sonne, une gorgée de thé, une question posée par quelqu’un dans la pièce — pour perdre le fil. Un compteur de rangs garde ce nombre affiché en grand pendant qu’on a les mains prises par le crochet ou les aiguilles : un coup d’œil suffit pour savoir où on en est, sans reposer l’ouvrage ni recompter les mailles une par une sur le tissu déjà fait. Contrairement à un carnet ou une application à installer, celui-ci se retient tout seul : la valeur reste affichée au rechargement de la page, sur tablette comme sur téléphone.',
    h2Lose: 'Comment on perd son rang, et comment ne plus le perdre',
    bodyLose:
      'La méthode la plus fiable pour perdre son rang reste de compter de tête. Une interruption de quelques secondes suffit à faire douter entre le rang 24 et le rang 25, et un doute sur un ouvrage déjà avancé coûte cher à corriger : il faut souvent défaire plusieurs rangs juste pour vérifier. La parade la plus simple est d’incrémenter le compteur au moment exact où l’on termine chaque rang, avant de poser l’ouvrage — jamais après avoir répondu au téléphone. Le bouton « +1 » est volontairement très large, pensé pour être touché sans viser, et les flèches du clavier (ou la barre d’espace) font la même chose sur ordinateur. En cas de faux mouvement, « −1 » corrige immédiatement, et « Remettre à zéro » redémarre un nouvel ouvrage — avec une confirmation au-delà de dix rangs, pour ne pas perdre une après-midi de travail d’un geste malheureux.',
    h2Round: 'Compter en rond',
    bodyRound:
      'Un bonnet, un amigurumi ou une pochette au crochet se travaillent souvent en rond plutôt qu’en rangs droits : chaque tour se termine par une maille coulée ou un marqueur, puis le suivant recommence. Le compteur fonctionne exactement pareil pour un tour que pour un rang — c’est le geste qui compte, pas le nom qu’on lui donne. Posez un marqueur de tour au début de l’ouvrage, incrémentez à chaque fois que vous le retrouvez, et le champ « Jusqu’au rang » permet d’indiquer le nombre total de tours prévus par le patron : la barre de progression se remplit au fil de l’ouvrage, utile pour estimer ce qu’il reste avant la prochaine diminution.',
    h2Repeat: 'Compter les répétitions',
    bodyRepeat:
      'Un rang et une répétition ne sont pas la même chose : un patron peut demander « 1 bride, 2 mailles en l’air, répéter 8 fois » à l’intérieur d’un seul rang. Ce compteur suit les rangs ou les tours dans leur ensemble ; pour suivre en plus les répétitions à l’intérieur d’un rang, avec l’instruction affichée en très grand et les abréviations expliquées au survol, direction le lecteur de patron complet.',
    calloutTitle: 'Vous avez le patron en texte ou en PDF ?',
    calloutBody:
      'Collez tout le texte de votre patron dans le lecteur : il le découpe en étapes, affiche une seule instruction à la fois en très grand, et compte les rangs et les répétitions à votre place.',
    tryReader: 'Essayer le lecteur',
    toGlossary: 'Le glossaire des abréviations',
    toConverter: 'Le convertisseur US ↔ UK',
  },
  en: {
    seoTitle: `Free online row counter for crochet and knitting — ${SITE_NAME}`,
    seoDescription:
      'Count your crochet or knitting rows one-handed, with an optional target and progress bar. Free, no account, the value remembers itself.',
    h1: 'Online row counter for crochet and knitting',
    lead: 'One big number, two very large buttons: count your rows without putting your work down. The value remembers itself, even after closing the tab.',
    minus: '−1',
    plus: '+1',
    resetAction: 'Reset',
    resetConfirmTitle: 'Reset the counter to zero?',
    resetConfirmBody: 'This clears your current row and cannot be undone.',
    resetConfirmAction: 'Reset',
    cancel: 'Cancel',
    wakeLabel: 'Keep screen awake',
    targetLabel: 'Up to row',
    targetPlaceholder: 'Optional',
    h2Purpose: 'What a row counter is for',
    bodyPurpose:
      'A crochet or knitting pattern moves forward one row at a time, and it only takes one interruption — a phone ringing, a sip of tea, someone asking a question across the room — to lose count. A row counter keeps that number in large print while your hands are full of hook or needles: one glance is enough to know where you are, without putting the work down or recounting stitches on the fabric itself. Unlike a notebook or an app to install, this one remembers on its own: the value is still there after reloading the page, on a tablet or a phone.',
    h2Lose: 'How you lose your row, and how to stop losing it',
    bodyLose:
      'The most reliable way to lose your row is to count from memory. A few seconds’ interruption is enough to leave you unsure whether you’re on row 24 or row 25, and doubt on a piece that’s already well underway is expensive to fix: it often means unravelling several rows just to check. The simplest fix is to tap the counter the moment you finish each row, before putting the work down — never after answering the phone. The "+1" button is deliberately very large, built to be tapped without aiming, and the arrow keys (or the space bar) do the same thing on a computer. If you tap it by mistake, "−1" corrects it straight away, and "Reset" starts a fresh piece — with a confirmation past ten rows, so one stray tap can’t wipe out an afternoon’s work.',
    h2Round: 'Counting in the round',
    bodyRound:
      'A hat, an amigurumi or a crochet pouch is often worked in rounds rather than straight rows: each round ends with a slip stitch or a marker, then the next one begins. The counter works exactly the same way for a round as for a row — it’s the action that counts, not what you call it. Place a round marker at the start of the piece, tap the counter every time you reach it again, and the "Up to row" field lets you enter the total number of rounds the pattern calls for: the progress bar fills up as you go, handy for judging how far you are from the next decrease.',
    h2Repeat: 'Counting repeats',
    bodyRepeat:
      'A row and a repeat aren’t the same thing: a pattern can ask for "1 double crochet, chain 2, repeat 8 times" within a single row. This counter tracks whole rows or rounds; to also track repeats inside a row, with the instruction shown in large print and abbreviations explained on hover, head to the full pattern reader.',
    calloutTitle: 'Got the pattern as text or a PDF?',
    calloutBody:
      'Paste your whole pattern into the reader: it splits it into steps, shows one instruction at a time in large print, and counts rows and repeats for you.',
    tryReader: 'Try the reader',
    toGlossary: 'The abbreviation glossary',
    toConverter: 'The US ↔ UK converter',
  },
};

/**
 * Compteur de rangs en ligne (fiche 27) : première page-outil du plan
 * d'acquisition, indépendante du lecteur complet (qui a déjà son propre
 * compteur de répétitions, `StepView`).
 */
@Component({
  selector: 'fil-row-counter-page',
  imports: [Button, Checkbox, Dialog, InputField, RouterLink],
  host: {
    class: 'wrap',
    '(document:keydown)': 'onKeydown($event)',
  },
  template: `
    <section class="hero">
      <h1>{{ c.h1 }}</h1>
      <p>{{ c.lead }}</p>
    </section>

    <section class="card">
      <!--
        La classe step-body (styles du lecteur) donne le --reader-step en très
        grand sans ajouter de règle CSS au bundle initial : le budget n'avait
        que 123 o de marge avant cette fiche (voir la PR). La classe
        counter-count reste un marqueur pour les tests, sans style propre.
      -->
      <div class="counter-count step-body" aria-live="polite">
        {{ state().count }}
        @if (state().target) {
          <span> / {{ state().target }}</span>
        }
      </div>

      @if (state().target) {
        <div
          class="progress"
          role="progressbar"
          [attr.aria-valuenow]="state().count"
          aria-valuemin="0"
          [attr.aria-valuemax]="state().target"
          [attr.aria-label]="c.targetLabel"
        >
          <i [style.width.%]="progressPercent()"></i>
        </div>
      }

      <div class="navrow">
        <button
          type="button"
          filButton="secondary"
          [step]="true"
          [disabled]="state().count <= 0"
          (click)="onIncrement(-1)"
        >
          {{ c.minus }}
        </button>
        <button
          type="button"
          filButton="primary"
          [step]="true"
          class="next"
          (click)="onIncrement(1)"
        >
          {{ c.plus }}
        </button>
      </div>

      <div class="navrow">
        <button type="button" filButton="ghost" (click)="onResetClick()">
          {{ c.resetAction }}
        </button>
        @if (wakeLock.supported()) {
          <fil-checkbox
            [label]="c.wakeLabel"
            [checked]="wakeLock.active()"
            (checkedChange)="wakeLock.toggle()"
          />
        }
      </div>

      <div class="field">
        <label for="target-input">{{ c.targetLabel }}</label>
        <input
          filInput
          type="number"
          id="target-input"
          min="1"
          max="9999"
          inputmode="numeric"
          [placeholder]="c.targetPlaceholder"
          [value]="state().target ?? ''"
          (input)="onTargetInput($any($event.target).value)"
        />
      </div>
    </section>

    <article class="prose">
      <h2>{{ c.h2Purpose }}</h2>
      <p>{{ c.bodyPurpose }}</p>

      <h2>{{ c.h2Lose }}</h2>
      <p>{{ c.bodyLose }}</p>

      <h2>{{ c.h2Round }}</h2>
      <p>{{ c.bodyRound }}</p>

      <h2>{{ c.h2Repeat }}</h2>
      <p>{{ c.bodyRepeat }}</p>

      <div class="card">
        <p class="card-title">{{ c.calloutTitle }}</p>
        <p class="card-body">{{ c.calloutBody }}</p>
        <p>
          <a filButton="secondary" [routerLink]="i18n.link('reader')">{{ c.tryReader }}</a>
        </p>
      </div>
    </article>

    <div class="navrow">
      <a filButton="ghost" [routerLink]="i18n.link('glossary')">{{ c.toGlossary }}</a>
      <a filButton="ghost" [routerLink]="i18n.link('converter')">{{ c.toConverter }}</a>
    </div>

    <fil-dialog [(open)]="resetDialogOpen" [label]="c.resetConfirmTitle">
      <h2 class="dialog-title">{{ c.resetConfirmTitle }}</h2>
      <p class="dialog-body">{{ c.resetConfirmBody }}</p>
      <div class="dialog-actions">
        <button type="button" filButton="secondary" (click)="resetDialogOpen.set(false)">
          {{ c.cancel }}
        </button>
        <button type="button" filButton="primary" (click)="confirmReset()">
          {{ c.resetConfirmAction }}
        </button>
      </div>
    </fil-dialog>
  `,
})
export default class RowCounterPage {
  protected readonly i18n = inject(I18nService);
  protected readonly wakeLock = inject(WakeLockService);
  private readonly seo = inject(SeoService);
  private readonly analytics = inject(AnalyticsService);
  private readonly storage = inject(LocalStorageService);
  private readonly origin = inject(SITE_ORIGIN);
  private readonly route = inject(ActivatedRoute);

  private readonly locale = (this.route.snapshot.data['locale'] as Locale) ?? DEFAULT_LOCALE;
  protected readonly c = COPY[this.locale];

  protected readonly state = signal<CounterState>(INITIAL_COUNTER_STATE);
  protected readonly resetDialogOpen = signal(false);
  private readonly restored = signal(false);
  /** Plus haut palier de dix déjà mesuré : n'émet jamais deux fois le même. */
  private highestMilestone = 0;

  protected readonly progressPercent = computed(() => {
    const { count, target } = this.state();
    if (!target) return 0;
    return Math.min(100, Math.round((count / target) * 100));
  });

  constructor() {
    this.i18n.setLocale(this.locale);
    const path = ROUTE_PATHS.rowCounter;
    this.seo.apply({
      title: this.c.seoTitle,
      description: this.c.seoDescription,
      path,
      locale: this.locale,
      jsonLd: {
        '@context': 'https://schema.org',
        '@type': 'WebApplication',
        '@id': `${this.origin}${localePrefix(this.locale)}${path[this.locale]}`,
        name: this.c.h1,
        description: this.c.seoDescription,
        applicationCategory: 'UtilitiesApplication',
        operatingSystem: 'Any',
        inLanguage: this.locale,
      },
    });

    afterNextRender(() => {
      const saved = parseSaved(this.storage.read<unknown>(STORAGE_KEY));
      this.state.set(saved);
      this.highestMilestone = Math.floor(saved.count / 10) * 10;
      this.restored.set(true);
    });

    effect(() => {
      const value = this.state();
      if (!this.restored()) return;
      this.storage.write(STORAGE_KEY, value);
    });

    effect(() => {
      const count = this.state().count;
      if (!this.restored()) return;
      if (count > this.highestMilestone && count % 10 === 0) {
        this.highestMilestone = count;
        this.analytics.track('row_counted', { value: count });
      }
    });
  }

  protected onIncrement(delta: number): void {
    this.state.update((s) => increment(s, delta));
  }

  protected onResetClick(): void {
    if (this.state().count > RESET_CONFIRM_THRESHOLD) {
      this.resetDialogOpen.set(true);
      return;
    }
    this.state.update(reset);
  }

  protected confirmReset(): void {
    this.state.update(reset);
    this.resetDialogOpen.set(false);
  }

  protected onTargetInput(raw: string): void {
    const parsed = Number.parseInt(raw, 10);
    const target = Number.isFinite(parsed) && parsed > 0 ? Math.min(9999, parsed) : null;
    this.state.update((s) => ({ ...s, target }));
  }

  protected onKeydown(event: KeyboardEvent): void {
    const tag = (event.target as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || event.metaKey || event.ctrlKey || event.altKey) {
      return;
    }
    if (event.key === 'ArrowRight' || event.key === ' ') {
      event.preventDefault();
      this.onIncrement(1);
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      this.onIncrement(-1);
    }
  }
}

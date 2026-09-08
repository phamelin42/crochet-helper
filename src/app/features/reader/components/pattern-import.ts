import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { NormalizerService } from '../../../core/ai/normalizer.service';
import { I18nService } from '../../../core/i18n/i18n.service';
import { parsePattern } from '../data/pattern-parser';
import { Button } from '../../../shared/ui/button/button';
import { Disclosure } from '../../../shared/ui/disclosure/disclosure';
import { InputField } from '../../../shared/ui/field/input';
import { ReaderStore } from '../state/reader-store';

/**
 * Panneau d'import : coller ou taper le texte du patron, charger l'exemple, et
 * déposer une photo de diagramme. Replié dès qu'un patron est chargé pour
 * laisser la place au lecteur.
 */
@Component({
  selector: 'fil-pattern-import',
  imports: [Button, Disclosure, InputField],
  template: `
    <fil-disclosure
      [label]="t('ui.import')"
      [state]="state()"
      [(open)]="open"
      variant="import"
      class="import-host"
    >
      <div class="import-body">
        <div>
          <div class="field">
            <label for="pattern-source">{{ t('ui.paste') }}</label>
            <textarea
              #source
              filInput
              id="pattern-source"
              class="src-input"
              spellcheck="false"
              [value]="store.source()"
              [attr.placeholder]="placeholder"
            ></textarea>
          </div>
          <div class="import-actions">
            <button type="button" filButton="primary" (click)="load(source.value)">
              {{ t('ui.load') }}
            </button>
            <button
              type="button"
              filButton="secondary"
              [disabled]="ai.running() || !ai.available()"
              (click)="simplify(source)"
            >
              {{ ai.running() ? t('ai.running') : t('ai.simplify') }}
            </button>
            <button type="button" filButton="secondary" (click)="demo()">{{ t('ui.demo') }}</button>
            <button type="button" filButton="ghost" (click)="clear()">{{ t('ui.clear') }}</button>
          </div>

          @if (aiMessage(); as message) {
            <p class="ai-note" [class.warn]="aiWarns()" role="status">
              {{ message }}
              @if (original() !== null) {
                <button type="button" filButton="ghost" (click)="undo(source)">
                  {{ t('ai.undo') }}
                </button>
              }
            </p>
          }

          <p class="hint">{{ t('ui.hint') }}</p>
          <p class="hint">{{ t('ai.notice') }}</p>
        </div>
      </div>
    </fil-disclosure>
  `,
  styles: `
    .import-host {
      display: block;
    }

    .ai-note {
      margin: 0.5rem 0 0;
      font-size: 0.875rem;
      color: var(--fil-text-muted, inherit);
    }

    .ai-note.warn {
      color: var(--fil-warn, #b45309);
      font-weight: 600;
    }
  `,
})
export class PatternImport {
  protected readonly store = inject(ReaderStore);
  protected readonly ai = inject(NormalizerService);
  private readonly i18n = inject(I18nService);

  readonly open = signal(true);
  private readonly source = viewChild<ElementRef<HTMLTextAreaElement>>('source');

  /** Texte d'avant la remise en forme, conservé tant qu'on peut l'annuler. */
  protected readonly original = signal<string | null>(null);
  /** Vrai quand la remise en forme a fait disparaître des étapes. */
  protected readonly aiWarns = signal(false);

  protected readonly placeholder =
    'Rang 1 : 6 ms dans un cercle magique (6)\nRang 2 : 1 aug dans chaque m (12)\nRangs 3-6 : 1 ms dans chaque m (12)';

  protected t = (key: Parameters<I18nService['t']>[0]) => this.i18n.t(key);

  protected state(): string {
    const total = this.store.total();
    return total ? `${total} ${this.t('ui.loaded')}` : this.t('ui.noPattern');
  }

  /**
   * Message affiché sous les boutons : succès, avertissement de conservation,
   * blocage avec compte à rebours, ou échec. Vide quand il n'y a rien à dire.
   */
  protected aiMessage(): string | null {
    const countdown = this.ai.countdown();

    switch (this.ai.state()) {
      case 'blocked': {
        const reason = this.ai.blockedReason();
        if (!countdown) return this.t('ai.blockedUnknown');
        const lead = reason === 'rate_limit' ? this.t('ai.blockedRate') : this.t('ai.blockedQuota');
        return `${lead} ${countdown}.`;
      }
      case 'error':
        switch (this.ai.errorReason()) {
          case 'empty':
            return this.t('ai.errEmpty');
          case 'too_large':
            return this.t('ai.errTooLarge');
          case 'misconfigured':
            return this.t('ai.errConfig');
          default:
            return this.t('ai.errUpstream');
        }
      default:
        if (this.original() === null) return null;
        return this.aiWarns() ? this.t('ai.fewer') : this.t('ai.done');
    }
  }

  /**
   * Remet le texte en forme, puis le repose dans le champ **sans le charger**.
   * L'utilisateur relit et déclenche lui-même le découpage : un rang perdu par
   * le modèle doit pouvoir être vu avant d'atteindre le lecteur.
   */
  protected async simplify(field: HTMLTextAreaElement): Promise<void> {
    const before = field.value;
    const normalized = await this.ai.normalize(before);
    if (normalized === null) return;

    this.original.set(before);
    this.aiWarns.set(parsePattern(normalized).total < parsePattern(before).total);
    field.value = normalized;
  }

  protected undo(field: HTMLTextAreaElement): void {
    const before = this.original();
    if (before === null) return;
    field.value = before;
    this.original.set(null);
    this.aiWarns.set(false);
    this.ai.reset();
  }

  protected load(text: string): void {
    this.store.load(text);
    this.original.set(null);
    this.aiWarns.set(false);
    this.open.set(false);
  }

  protected demo(): void {
    this.store.loadDemo();
    const field = this.source();
    if (field) field.nativeElement.value = this.store.source();
    this.open.set(false);
  }

  protected clear(): void {
    this.store.clear();
    this.original.set(null);
    this.aiWarns.set(false);
    this.ai.reset();
    const field = this.source();
    if (field) field.nativeElement.value = '';
  }
}

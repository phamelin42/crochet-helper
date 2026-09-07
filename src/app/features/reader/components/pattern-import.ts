import { Component, ElementRef, inject, signal, viewChild } from '@angular/core';
import { I18nService } from '../../../core/i18n/i18n.service';
import { Button } from '../../../shared/ui/button/button';
import { Disclosure } from '../../../shared/ui/disclosure/disclosure';
import { InputField } from '../../../shared/ui/field/input';
import { Icon } from '../../../shared/ui/icon/icon';
import { ReaderStore } from '../state/reader-store';

/**
 * Panneau d'import : coller ou taper le texte du patron, charger l'exemple, et
 * déposer une photo de diagramme. Replié dès qu'un patron est chargé pour
 * laisser la place au lecteur.
 */
@Component({
  selector: 'fil-pattern-import',
  imports: [Button, Disclosure, Icon, InputField],
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
            <button type="button" filButton="secondary" (click)="demo()">{{ t('ui.demo') }}</button>
            <button type="button" filButton="ghost" (click)="clear()">{{ t('ui.clear') }}</button>
          </div>
          <p class="hint">{{ t('ui.hint') }}</p>
        </div>

        <label
          class="drop"
          [class.over]="over()"
          for="diagram-input"
          (dragenter)="onDragOver($event)"
          (dragover)="onDragOver($event)"
          (dragleave)="over.set(false)"
          (drop)="onDrop($event)"
        >
          @if (store.image()) {
            <img [src]="store.image()" alt="" />
            <span>{{ t('ui.replace') }}</span>
          } @else {
            <fil-icon name="image" />
            <b>{{ t('ui.drop') }}</b>
            <span>{{ t('ui.dropSub') }}</span>
          }
          <input type="file" id="diagram-input" accept="image/*" hidden (change)="onFile($event)" />
        </label>
      </div>
    </fil-disclosure>
  `,
  styles: `
    .import-host {
      display: block;
    }
  `,
})
export class PatternImport {
  protected readonly store = inject(ReaderStore);
  private readonly i18n = inject(I18nService);

  readonly open = signal(true);
  protected readonly over = signal(false);
  private readonly source = viewChild<ElementRef<HTMLTextAreaElement>>('source');

  protected readonly placeholder =
    'Rang 1 : 6 ms dans un cercle magique (6)\nRang 2 : 1 aug dans chaque m (12)\nRangs 3-6 : 1 ms dans chaque m (12)';

  protected t = (key: Parameters<I18nService['t']>[0]) => this.i18n.t(key);

  protected state(): string {
    const total = this.store.total();
    return total ? `${total} ${this.t('ui.loaded')}` : this.t('ui.noPattern');
  }

  protected load(text: string): void {
    this.store.load(text);
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
    const field = this.source();
    if (field) field.nativeElement.value = '';
  }

  protected onDragOver(event: DragEvent): void {
    event.preventDefault();
    this.over.set(true);
  }

  protected onDrop(event: DragEvent): void {
    event.preventDefault();
    this.over.set(false);
    const file = event.dataTransfer?.files?.[0];
    if (file) this.readImage(file);
  }

  protected onFile(event: Event): void {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) this.readImage(file);
  }

  private readImage(file: File): void {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => this.store.setImage(String(reader.result));
    reader.readAsDataURL(file);
  }
}

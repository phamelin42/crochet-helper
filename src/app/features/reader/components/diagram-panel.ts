import { Component, inject, signal } from '@angular/core';
import { I18nService } from '../../../core/i18n/i18n.service';
import { Button } from '../../../shared/ui/button/button';
import { Dialog } from '../../../shared/ui/dialog/dialog';
import { Icon } from '../../../shared/ui/icon/icon';
import { ReaderStore } from '../state/reader-store';

/**
 * Diagramme importé : vignette à côté de l'étape, et vue agrandie avec zoom et
 * déplacement. L'image ne quitte jamais l'appareil — elle est lue en `data:`
 * URL par le navigateur, aucun envoi réseau.
 */
@Component({
  selector: 'fil-diagram-panel',
  imports: [Button, Dialog, Icon],
  host: { class: 'figpanel' },
  styles: `
    .thumb {
      display: block;
      width: 100%;
      padding: 0;
      border: 0;
      background: none;
      cursor: zoom-in;
    }
  `,
  template: `
    <figure>
      <button type="button" class="thumb" [attr.aria-label]="t('ui.zoom')" (click)="openZoom()">
        <img [src]="store.image()" [alt]="alt" />
      </button>
      <figcaption class="cap">
        <span>{{ t('ui.zoom') }}</span>
        <button type="button" filButton="ghost" (click)="store.setImage('')">
          {{ t('ui.remove') }}
        </button>
      </figcaption>
    </figure>

    <fil-dialog [(open)]="zoomOpen" [wide]="true" [label]="alt">
      <div
        class="zoomview"
        [class.drag]="dragging()"
        (wheel)="onWheel($event)"
        (pointerdown)="onPointerDown($event)"
        (pointermove)="onPointerMove($event)"
        (pointerup)="dragging.set(false)"
        (pointercancel)="dragging.set(false)"
      >
        <img [src]="store.image()" alt="" [style.transform]="transform()" />
      </div>
      <div class="dialog-actions" style="justify-content:space-between">
        <div style="display:flex;gap:var(--space-2)">
          <button
            type="button"
            filButton="secondary"
            [iconOnly]="true"
            [attr.aria-label]="t('ui.zoomOut')"
            (click)="zoomBy(1 / 1.35)"
          >
            <fil-icon name="minus" />
          </button>
          <button
            type="button"
            filButton="secondary"
            [iconOnly]="true"
            [attr.aria-label]="t('ui.zoomIn')"
            (click)="zoomBy(1.35)"
          >
            <fil-icon name="plus" />
          </button>
        </div>
        <button type="button" filButton="primary" (click)="zoomOpen.set(false)">
          {{ t('ui.close') }}
        </button>
      </div>
    </fil-dialog>
  `,
})
export class DiagramPanel {
  protected readonly store = inject(ReaderStore);
  private readonly i18n = inject(I18nService);

  protected readonly zoomOpen = signal(false);
  protected readonly dragging = signal(false);
  private readonly scale = signal(1);
  private readonly offset = signal({ x: 0, y: 0 });
  private origin = { x: 0, y: 0 };

  protected readonly alt = 'Diagramme du pattern';
  protected t = (key: Parameters<I18nService['t']>[0]) => this.i18n.t(key);

  protected transform(): string {
    const { x, y } = this.offset();
    return `translate(${x}px, ${y}px) scale(${this.scale()})`;
  }

  protected openZoom(): void {
    this.scale.set(1);
    this.offset.set({ x: 0, y: 0 });
    this.zoomOpen.set(true);
  }

  protected zoomBy(factor: number): void {
    this.scale.update((s) => Math.max(1, Math.min(6, s * factor)));
    if (this.scale() === 1) this.offset.set({ x: 0, y: 0 });
  }

  protected onWheel(event: WheelEvent): void {
    event.preventDefault();
    this.zoomBy(event.deltaY < 0 ? 1.12 : 0.89);
  }

  protected onPointerDown(event: PointerEvent): void {
    const { x, y } = this.offset();
    this.origin = { x: event.clientX - x, y: event.clientY - y };
    this.dragging.set(true);
    (event.target as Element).setPointerCapture?.(event.pointerId);
  }

  protected onPointerMove(event: PointerEvent): void {
    if (!this.dragging()) return;
    this.offset.set({ x: event.clientX - this.origin.x, y: event.clientY - this.origin.y });
  }
}

import { Component, computed, input, signal } from '@angular/core';

/**
 * Photos d'un patron : une grande, et des vignettes pour changer. Les vignettes
 * sont de vrais boutons (clavier, 48 px) dont le nom dit « Photo 2 sur 5 ».
 */
@Component({
  selector: 'fil-pattern-gallery',
  template: `
    @if (current(); as src) {
      <figure class="gallery">
        <img
          class="gallery-main"
          [src]="src"
          [alt]="name()"
          width="640"
          height="480"
          referrerpolicy="no-referrer"
        />
        @if (photos().length > 1) {
          <div class="gallery-thumbs" role="group" [attr.aria-label]="groupLabel()">
            @for (photo of photos(); track photo; let i = $index) {
              <button
                type="button"
                class="gallery-thumb"
                [attr.aria-label]="photoLabel()(i + 1, photos().length)"
                [attr.aria-pressed]="i === index()"
                (click)="index.set(i)"
              >
                <img
                  [src]="photo"
                  alt=""
                  width="64"
                  height="48"
                  loading="lazy"
                  referrerpolicy="no-referrer"
                />
              </button>
            }
          </div>
        }
      </figure>
    }
  `,
})
export class PatternGallery {
  readonly photos = input.required<readonly string[]>();
  readonly name = input.required<string>();
  readonly groupLabel = input('');
  /** « Photo i sur n » dans la langue de la page. */
  readonly photoLabel = input.required<(i: number, n: number) => string>();

  protected readonly index = signal(0);
  protected readonly current = computed(
    () => this.photos()[this.index()] ?? this.photos()[0] ?? null,
  );
}

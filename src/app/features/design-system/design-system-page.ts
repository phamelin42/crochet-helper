import { DOCUMENT } from '@angular/common';
import { Component, ElementRef, afterNextRender, inject, signal, viewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';
import { DEFAULT_LOCALE, Locale } from '../../core/i18n/locale';
import { LocalizedPath } from '../../core/i18n/route-paths';
import { SeoService } from '../../core/seo/seo.service';
import { Button } from '../../shared/ui/button/button';
import { Checkbox } from '../../shared/ui/checkbox/checkbox';
import { Dialog } from '../../shared/ui/dialog/dialog';
import { Disclosure } from '../../shared/ui/disclosure/disclosure';
import { InputField } from '../../shared/ui/field/input';
import { ICONS, Icon, IconName } from '../../shared/ui/icon/icon';
import { Segmented, SegmentedOption } from '../../shared/ui/segmented/segmented';
import { Tile } from '../../shared/ui/tile/tile';
import { TooltipService } from '../../shared/ui/tooltip/tooltip.service';

/** Page d'équipe uniquement : jamais de version anglaise, jamais indexée. */
const PATH: LocalizedPath = { fr: '/design-system', en: '/design-system' };

const HUES = ['sakura', 'kikyo', 'yamabuki', 'wakaba', 'asagi', 'momiji'] as const;

/** Chaque jeton de couleur déclaré dans `tokens.css` — la liste fait foi, pas un échantillon. */
const COLOR_TOKENS = [
  'color-bg',
  'color-surface',
  'color-overlay',
  'color-line',
  'color-text',
  'color-text-strong',
  'color-text-label',
  ...HUES.flatMap((hue) => [`color-${hue}`, `color-${hue}-pale`, `color-${hue}-ink`]),
  'color-primary',
  'color-on-primary',
  'color-link',
  'color-focus',
  'color-tip-bg',
  'color-tip-text',
  'color-tip-accent',
  'color-scrim',
] as const;

const SPACE_TOKENS = [
  'space-1',
  'space-2',
  'space-3',
  'space-4',
  'space-5',
  'space-6',
  'space-8',
  'space-10',
] as const;
const RADIUS_TOKENS = ['radius-sm', 'radius-md', 'radius-lg', 'radius-pill'] as const;
const SHADOW_TOKENS = ['shadow-sm', 'shadow-md', 'shadow-lg'] as const;
const HEADING_TAGS = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const;

/**
 * Vitrine interne : chaque jeton et chaque composant de `shared/ui`, dans tous
 * ses états. Sert à répondre à « est-ce que ça existe déjà ? » avant d'écrire
 * un nouveau bouton — donc à ne jamais diverger du produit, elle consomme le
 * design system sans en redéfinir un seul style.
 */
@Component({
  selector: 'fil-design-system-page',
  imports: [Button, Checkbox, Dialog, Disclosure, Icon, InputField, Segmented, Tile],
  host: { class: 'wrap' },
  template: `
    <section class="hero">
      <h1>Vitrine du design system</h1>
      <p>
        Hanami 花見, jeton par jeton et composant par composant. Page interne, non indexée : elle
        n’a rien à faire dans un moteur de recherche.
      </p>
      <div class="ds-toolbar">
        <fil-segmented
          name="ds-theme"
          label="Thème"
          [options]="themeOptions"
          [selected]="theme()"
          (selectedChange)="setTheme($event)"
        />
      </div>
    </section>

    <section>
      <h2>Jetons</h2>

      <h3>Couleurs</h3>
      <div class="ds-swatches">
        @for (token of colorTokens; track token) {
          <div class="ds-swatch">
            <span class="ds-swatch-chip" [style.background]="'var(--' + token + ')'"></span>
            <code>--{{ token }}</code>
            <span class="text-muted">{{ computedValues()[token] }}</span>
          </div>
        }
      </div>

      <h3>Typographie</h3>
      <div class="ds-type-scale" #typeScale>
        @for (tag of headingTags; track tag) {
          <div class="ds-type-row">
            @switch (tag) {
              @case ('h1') {
                <h1>Maille en l’air</h1>
              }
              @case ('h2') {
                <h2>Maille en l’air</h2>
              }
              @case ('h3') {
                <h3>Maille en l’air</h3>
              }
              @case ('h4') {
                <h4>Maille en l’air</h4>
              }
              @case ('h5') {
                <h5>Maille en l’air</h5>
              }
              @case ('h6') {
                <h6>Maille en l’air</h6>
              }
            }
            <code class="text-muted">{{ tag }} — {{ computedValues()[tag] }}</code>
          </div>
        }
      </div>

      <h3>Espacement</h3>
      <div class="ds-scale">
        @for (token of spaceTokens; track token) {
          <div class="ds-scale-row">
            <code>--{{ token }}</code>
            <span class="ds-bar" [style.width]="'var(--' + token + ')'"></span>
            <span class="text-muted">{{ computedValues()[token] }}</span>
          </div>
        }
      </div>

      <h3>Rayons</h3>
      <div class="ds-swatches">
        @for (token of radiusTokens; track token) {
          <div class="ds-swatch">
            <span class="ds-radius-box" [style.borderRadius]="'var(--' + token + ')'"></span>
            <code>--{{ token }}</code>
            <span class="text-muted">{{ computedValues()[token] }}</span>
          </div>
        }
      </div>

      <h3>Ombres</h3>
      <div class="ds-swatches">
        @for (token of shadowTokens; track token) {
          <div class="ds-swatch">
            <span class="ds-shadow-box" [style.boxShadow]="'var(--' + token + ')'"></span>
            <code>--{{ token }}</code>
          </div>
        }
      </div>

      <h3>Pastilles</h3>
      <p class="ds-caption">Classes <code>.tag</code> : une teinte par rôle, texte recalé AA.</p>
      <div class="cta-row">
        <span class="tag tag-sakura">Nouveau</span>
        <span class="tag tag-kikyo">Sélection</span>
        <span class="tag tag-yamabuki">En cours</span>
        <span class="tag tag-wakaba">Terminé</span>
        <span class="tag tag-asagi">Info</span>
        <span class="tag">Neutre</span>
      </div>
    </section>

    <section>
      <h2>Composants</h2>

      <h3>Button</h3>
      <div class="grid-cards">
        <div class="card">
          <p class="ds-caption">primary</p>
          <button type="button" filButton="primary">Étiquette</button>
        </div>
        <div class="card">
          <p class="ds-caption">secondary</p>
          <button type="button" filButton="secondary">Étiquette</button>
        </div>
        <div class="card">
          <p class="ds-caption">ghost</p>
          <button type="button" filButton="ghost">Étiquette</button>
        </div>
        <div class="card">
          <p class="ds-caption">désactivé</p>
          <button type="button" filButton="primary" disabled>Étiquette</button>
        </div>
        <div class="card">
          <p class="ds-caption">icône seule</p>
          <button type="button" filButton="secondary" [iconOnly]="true" aria-label="Fermer">
            <fil-icon name="minus" />
          </button>
        </div>
        <div class="card">
          <p class="ds-caption">pleine largeur</p>
          <button type="button" filButton="primary" [block]="true">Étiquette</button>
        </div>
        <div class="card">
          <p class="ds-caption">grande cible (pas à pas)</p>
          <button type="button" filButton="primary" [step]="true">
            <span>Suivante</span><fil-icon name="right" />
          </button>
        </div>
      </div>

      <h3>InputField</h3>
      <div class="grid-cards">
        <div class="card">
          <p class="ds-caption">champ</p>
          <div class="field">
            <label for="ds-input-text">Nom du patron</label>
            <input filInput id="ds-input-text" type="text" value="Bonnet côtelé" />
          </div>
        </div>
        <div class="card">
          <p class="ds-caption">zone de texte</p>
          <div class="field">
            <label for="ds-input-textarea">Note</label>
            <textarea filInput id="ds-input-textarea" rows="3">
Rang 1 : 6 ms dans un cercle magique</textarea>
          </div>
        </div>
        <div class="card">
          <p class="ds-caption">invalide</p>
          <div class="field">
            <label for="ds-input-invalid">Nom du patron</label>
            <input
              filInput
              id="ds-input-invalid"
              type="text"
              aria-invalid="true"
              aria-describedby="ds-input-invalid-hint"
            />
            <p id="ds-input-invalid-hint" class="hint" role="alert">Ce champ est obligatoire.</p>
          </div>
        </div>
        <div class="card">
          <p class="ds-caption">désactivé</p>
          <div class="field">
            <label for="ds-input-disabled">Nom du patron</label>
            <input filInput id="ds-input-disabled" type="text" value="Bonnet côtelé" disabled />
          </div>
        </div>
      </div>

      <h3>Checkbox</h3>
      <div class="grid-cards">
        <div class="card">
          <fil-checkbox
            [checked]="checkboxA()"
            (checkedChange)="checkboxA.set($event)"
            label="Compter les rangs"
          />
        </div>
        <div class="card">
          <fil-checkbox
            [checked]="checkboxB()"
            (checkedChange)="checkboxB.set($event)"
            label="Garder l’écran allumé"
          />
        </div>
        <div class="card">
          <p class="ds-caption">désactivée</p>
          <fil-checkbox [checked]="true" [disabled]="true" label="Option désactivée" />
        </div>
      </div>

      <h3>Segmented</h3>
      <div class="grid-cards">
        <div class="card">
          <p class="ds-caption">deux options</p>
          <fil-segmented
            name="ds-craft"
            label="Technique"
            [options]="craftOptions"
            [selected]="craftValue()"
            (selectedChange)="craftValue.set($event)"
          />
        </div>
        <div class="card ds-card-scroll">
          <p class="ds-caption">cinq options</p>
          <fil-segmented
            name="ds-piece"
            label="Pièce"
            [options]="pieceOptions"
            [selected]="pieceValue()"
            (selectedChange)="pieceValue.set($event)"
          />
        </div>
      </div>

      <h3>Tile</h3>
      <div class="grid-cards">
        <fil-tile label="Rang">
          <div class="big">12<span class="sub"> / 24</span></div>
        </fil-tile>
      </div>

      <h3>Disclosure</h3>
      <div class="grid-cards">
        <div class="card">
          <p class="ds-caption">variante « mats »</p>
          <fil-disclosure label="Matériel" variant="mats">
            <ul>
              <li>Crochet 4 mm</li>
              <li>Coton, 50 g</li>
            </ul>
          </fil-disclosure>
        </div>
        <div class="card">
          <p class="ds-caption">variante « import »</p>
          <fil-disclosure label="Importer un patron" variant="import" state="3 étapes">
            <p>Contenu du panneau d’import.</p>
          </fil-disclosure>
        </div>
      </div>

      <h3>Dialog</h3>
      <div class="grid-cards">
        <div class="card">
          <button type="button" filButton="primary" (click)="dialogOpen.set(true)">
            Ouvrir la boîte de dialogue
          </button>
          <fil-dialog [(open)]="dialogOpen" label="Exemple de dialogue">
            <h2 class="dialog-title">Supprimer ce projet ?</h2>
            <p class="dialog-body">Cette action est définitive.</p>
            <div class="dialog-actions">
              <button type="button" filButton="secondary" (click)="dialogOpen.set(false)">
                Annuler
              </button>
              <button type="button" filButton="primary" (click)="dialogOpen.set(false)">
                Confirmer
              </button>
            </div>
          </fil-dialog>
        </div>
      </div>

      <h3>Icon</h3>
      <div class="ds-icon-grid">
        @for (name of iconNames; track name) {
          <div>
            <fil-icon [name]="name" />
            <code>{{ name }}</code>
          </div>
        }
      </div>

      <h3>Infobulle du glossaire</h3>
      <div class="grid-cards">
        <div class="card">
          <p>
            Survolez, activez au clavier ou touchez :
            <span
              class="abbr"
              tabindex="0"
              role="button"
              aria-label="ms : maille serrée"
              (pointerenter)="showTooltip($event)"
              (pointerleave)="tooltips.hide()"
              (focus)="showTooltip($event)"
              (blur)="tooltips.hide()"
              (click)="showTooltip($event)"
              >ms</span
            >
          </p>
        </div>
      </div>
    </section>

    <section>
      <h2>Usage</h2>

      <h3>Button</h3>
      <div class="prompt-box">
        <pre tabindex="0">
&lt;button type="button" filButton="primary"&gt;Étiquette&lt;/button&gt;</pre>
      </div>

      <h3>InputField</h3>
      <div class="prompt-box">
        <pre tabindex="0">
&lt;input filInput type="text" /&gt;
&lt;textarea filInput rows="3"&gt;&lt;/textarea&gt;</pre>
      </div>

      <h3>Checkbox</h3>
      <div class="prompt-box">
        <pre tabindex="0">
&lt;fil-checkbox [checked]="accepted()" (checkedChange)="accepted.set($event)" label="Étiquette" /&gt;</pre>
      </div>

      <h3>Segmented</h3>
      <div class="prompt-box">
        <pre tabindex="0">
&lt;fil-segmented
  name="unique-name"
  label="Étiquette du groupe"
  [options]="options"
  [selected]="value()"
  (selectedChange)="value.set($event)"
/&gt;</pre>
      </div>

      <h3>Tile</h3>
      <div class="prompt-box">
        <pre tabindex="0">
&lt;fil-tile label="Rang"&gt;
  &lt;div class="big"&gt;12&lt;span class="sub"&gt; / 24&lt;/span&gt;&lt;/div&gt;
&lt;/fil-tile&gt;</pre>
      </div>

      <h3>Disclosure</h3>
      <div class="prompt-box">
        <pre tabindex="0">
&lt;fil-disclosure label="Matériel" variant="mats"&gt;
  &lt;ul&gt;&lt;li&gt;...&lt;/li&gt;&lt;/ul&gt;
&lt;/fil-disclosure&gt;</pre>
      </div>

      <h3>Dialog</h3>
      <div class="prompt-box">
        <pre tabindex="0">
&lt;fil-dialog [(open)]="open" label="Titre accessible"&gt;
  &lt;h2 class="dialog-title"&gt;Titre&lt;/h2&gt;
  &lt;div class="dialog-actions"&gt;...&lt;/div&gt;
&lt;/fil-dialog&gt;</pre>
      </div>

      <h3>Icon</h3>
      <div class="prompt-box">
        <pre tabindex="0">&lt;fil-icon name="check" /&gt;</pre>
      </div>

      <h3>Infobulle du glossaire</h3>
      <div class="prompt-box">
        <pre tabindex="0">
&lt;span
  class="abbr"
  tabindex="0"
  role="button"
  [attr.aria-label]="term + ' : ' + definition"
  (pointerenter)="tooltips.showFor($event.target, term, definition)"
  (focus)="tooltips.showFor($event.target, term, definition)"
  (pointerleave)="tooltips.hide()"
  (blur)="tooltips.hide()"
&gt;{{ '{{ term }}' }}&lt;/span&gt;</pre>
      </div>
    </section>
  `,
})
export class DesignSystemPage {
  private readonly doc = inject(DOCUMENT);
  private readonly i18n = inject(I18nService);
  private readonly seo = inject(SeoService);
  private readonly route = inject(ActivatedRoute);
  protected readonly tooltips = inject(TooltipService);

  private readonly locale = (this.route.snapshot.data['locale'] as Locale) ?? DEFAULT_LOCALE;

  protected readonly colorTokens = COLOR_TOKENS;
  protected readonly spaceTokens = SPACE_TOKENS;
  protected readonly radiusTokens = RADIUS_TOKENS;
  protected readonly shadowTokens = SHADOW_TOKENS;
  protected readonly headingTags = HEADING_TAGS;
  protected readonly iconNames = Object.keys(ICONS) as IconName[];

  protected readonly computedValues = signal<Record<string, string>>({});

  protected readonly themeOptions: SegmentedOption[] = [
    { value: 0, label: 'Clair' },
    { value: 1, label: 'Sombre' },
  ];
  protected readonly theme = signal(0);

  protected readonly craftOptions: SegmentedOption[] = [
    { value: 0, label: 'Crochet' },
    { value: 1, label: 'Tricot' },
  ];
  protected readonly craftValue = signal(0);

  protected readonly pieceOptions: SegmentedOption[] = [
    { value: 0, label: 'Corps' },
    { value: 1, label: 'Manche' },
    { value: 2, label: 'Col' },
    { value: 3, label: 'Poche' },
    { value: 4, label: 'Capuche' },
  ];
  protected readonly pieceValue = signal(0);

  protected readonly checkboxA = signal(true);
  protected readonly checkboxB = signal(false);
  protected readonly dialogOpen = signal(false);

  private readonly typeScale = viewChild<ElementRef<HTMLElement>>('typeScale');

  constructor() {
    this.i18n.setLocale(this.locale);
    this.seo.apply({
      title: 'Vitrine du design system — Pattern Reader',
      description:
        'Page interne : chaque jeton et chaque composant de Hanami, dans tous ses états.',
      path: PATH,
      locale: this.locale,
      noIndex: true,
    });

    afterNextRender(() => this.measure());
  }

  protected setTheme(value: number): void {
    this.theme.set(value);
    if (value === 1) this.doc.documentElement.setAttribute('data-dim', 'true');
    else this.doc.documentElement.removeAttribute('data-dim');
    this.measure();
  }

  protected showTooltip(event: Event): void {
    this.tooltips.showFor(event.target as HTMLElement, 'ms', 'maille serrée');
  }

  /** Valeurs réelles des jetons, lues sur le document plutôt que recopiées à la main. */
  private measure(): void {
    const root = getComputedStyle(this.doc.documentElement);
    const values: Record<string, string> = {};
    for (const token of [...COLOR_TOKENS, ...SPACE_TOKENS, ...RADIUS_TOKENS, ...SHADOW_TOKENS]) {
      values[token] = root.getPropertyValue(`--${token}`).trim();
    }
    const scale = this.typeScale()?.nativeElement;
    if (scale) {
      for (const tag of HEADING_TAGS) {
        const sample = scale.querySelector(tag);
        if (sample) values[tag] = getComputedStyle(sample).fontSize;
      }
    }
    this.computedValues.set(values);
  }
}

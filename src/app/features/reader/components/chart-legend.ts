import { Component, inject } from '@angular/core';
import { I18nService } from '../../../core/i18n/i18n.service';
import {
  CHART_SYMBOLS,
  symbolAbbreviation,
  symbolName,
  symbolUrl,
} from '../data/chart-symbols';

/**
 * Légende des symboles standard : le dessin, l'abréviation dans la convention
 * de la page (française sur une page française, américaine sur une page
 * anglaise) et le nom.
 */
@Component({
  selector: 'fil-chart-legend',
  template: `
    <ul class="chart-legend">
      @for (symbol of symbols; track symbol.id) {
        <li>
          <img class="symbol-img" [src]="url(symbol.id)" alt="" width="32" height="32" />
          <span
            ><code>{{ abbreviation(symbol) }}</code> — {{ name(symbol) }}</span
          >
        </li>
      }
    </ul>
  `,
})
export class ChartLegend {
  private readonly i18n = inject(I18nService);

  protected readonly symbols = CHART_SYMBOLS;
  protected readonly url = symbolUrl;

  protected abbreviation = (symbol: (typeof CHART_SYMBOLS)[number]) =>
    symbolAbbreviation(symbol, this.i18n.locale());
  protected name = (symbol: (typeof CHART_SYMBOLS)[number]) =>
    symbolName(symbol, this.i18n.locale());
}

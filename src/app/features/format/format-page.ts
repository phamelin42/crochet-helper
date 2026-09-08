import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { I18nService } from '../../core/i18n/i18n.service';
import { Locale } from '../../core/i18n/locale';
import { ROUTE_PATHS } from '../../core/i18n/route-paths';
import { SeoService } from '../../core/seo/seo.service';
import { Button } from '../../shared/ui/button/button';
import { FORMAT_PROMPT } from './format-prompt';

/**
 * Page « Bien formater son patron ».
 *
 * Le site ne parle à aucun modèle de langage : c'est la personne qui utilise le
 * sien, dans l'onglet où elle l'a déjà ouvert. Cette page lui donne la consigne
 * à copier, et explique le format attendu pour qui préfère corriger à la main.
 *
 * Ce choix supprime d'un coup la clé d'API, le back-end, le coût par requête et
 * le quota — et il fonctionne avec un compte gratuit, ce qu'aucun montage par
 * API ne permettait.
 */
@Component({
  selector: 'fil-format-page',
  imports: [Button],
  template: `
    <div class="wrap">
      <section class="tuto">
        <h1>{{ c.title }}</h1>
        <p class="lead">{{ c.lead }}</p>

        <h2>{{ c.step1 }}</h2>
        <p>{{ c.step1Body }}</p>

        <div class="prompt-box">
          <pre>{{ prompt }}</pre>
          <button type="button" filButton="primary" (click)="copy()">
            {{ copied() ? c.copied : c.copy }}
          </button>
        </div>

        <h2>{{ c.step2 }}</h2>
        <p>{{ c.step2Body }}</p>
        <ul>
          @for (tool of c.tools; track tool) {
            <li>{{ tool }}</li>
          }
        </ul>

        <h2>{{ c.step3 }}</h2>
        <p>{{ c.step3Body }}</p>

        <h2>{{ c.rules }}</h2>
        <p>{{ c.rulesBody }}</p>
        <ul>
          @for (rule of c.ruleList; track rule) {
            <li>{{ rule }}</li>
          }
        </ul>

        <h2>{{ c.check }}</h2>
        <p>{{ c.checkBody }}</p>
      </section>
    </div>
  `,
})
export class FormatPage {
  private readonly i18n = inject(I18nService);
  private readonly seo = inject(SeoService);
  private readonly route = inject(ActivatedRoute);

  private readonly locale = (this.route.snapshot.data['locale'] as Locale) ?? 'fr';
  protected readonly c = COPY[this.locale];
  protected readonly prompt = FORMAT_PROMPT[this.locale];
  protected readonly copied = signal(false);

  constructor() {
    this.i18n.setLocale(this.locale);
    this.seo.apply({
      title: this.c.seoTitle,
      description: this.c.seoDescription,
      path: ROUTE_PATHS.format,
      locale: this.locale,
    });
  }

  protected async copy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.prompt);
      this.copied.set(true);
      setTimeout(() => this.copied.set(false), 2000);
    } catch {
      // Presse-papiers refusé : la consigne reste sélectionnable à la main.
    }
  }
}

const COPY = {
  fr: {
    seoTitle: 'Bien formater un patron de crochet pour le lire pas à pas',
    seoDescription:
      'Patron mal découpé ? La consigne à copier dans ChatGPT, Claude ou Perplexity pour le remettre en forme, et le format attendu si vous préférez corriger à la main.',
    title: 'Votre patron n’est pas bien découpé ?',
    lead: 'Les tutoriels publiés en ligne ne suivent aucune norme : numérotation absente, rangs coupés en trois, tailles mêlées aux instructions. Faites-le remettre en forme par l’assistant que vous utilisez déjà, puis collez le résultat dans le lecteur.',
    step1: '1. Copiez la consigne',
    step1Body:
      'Elle indique à l’assistant comment remettre le texte en forme sans rien changer aux mailles.',
    copy: 'Copier la consigne',
    copied: 'Copiée !',
    step2: '2. Collez-la dans votre assistant, suivie de votre patron',
    step2Body:
      'N’importe lequel fait l’affaire, y compris en version gratuite. Collez la consigne, passez une ligne, puis collez le texte de votre patron.',
    tools: ['ChatGPT', 'Claude', 'Perplexity', 'Gemini', 'Le Chat (Mistral)'],
    step3: '3. Recopiez la réponse dans le lecteur',
    step3Body:
      'Ouvrez le lecteur, collez le texte remis en forme dans le champ d’import, et découpez-le en étapes.',
    rules: 'Le format attendu',
    rulesBody:
      'Utile si vous préférez corriger à la main, ou vérifier ce que l’assistant a produit. Le lecteur reconnaît :',
    ruleList: [
      'Un rang par ligne, préfixé de son libellé : « Rang 1 : ... », « Tour 3 : ... », « Row 5: ... ».',
      'Les plages, quand plusieurs rangs partagent la même instruction : « Rangs 3-6 : ... ».',
      'Les noms de pièces (corps, oreille, manche) seuls sur une ligne, sans ponctuation finale.',
      'Le matériel sous une ligne « Matériel : », une fourniture par ligne.',
      'Les notes, échantillons, tailles et tables d’abréviations, conservés à part et jamais comptés comme des étapes.',
    ],
    check: 'Vérifiez avant de crocheter',
    checkBody:
      'Un assistant peut sauter un rang, et un rang manquant ruine un ouvrage. Comparez le nombre de rangs avant et après, et gardez le texte d’origine sous la main.',
  },
  en: {
    seoTitle: 'Format a crochet pattern for step-by-step reading',
    seoDescription:
      'Pattern not splitting? The prompt to copy into ChatGPT, Claude or Perplexity to tidy it up, plus the expected format if you would rather fix it by hand.',
    title: 'Pattern not splitting properly?',
    lead: 'Patterns published online follow no standard: missing numbering, rows broken across three lines, sizes mixed into the instructions. Have the assistant you already use tidy it up, then paste the result into the reader.',
    step1: '1. Copy the instructions',
    step1Body: 'They tell the assistant how to reformat the text without changing a single stitch.',
    copy: 'Copy the instructions',
    copied: 'Copied!',
    step2: '2. Paste them into your assistant, followed by your pattern',
    step2Body:
      'Any of them will do, free tiers included. Paste the instructions, leave a blank line, then paste your pattern.',
    tools: ['ChatGPT', 'Claude', 'Perplexity', 'Gemini', 'Le Chat (Mistral)'],
    step3: '3. Copy the answer back into the reader',
    step3Body:
      'Open the reader, paste the tidied text into the import field, and split it into steps.',
    rules: 'The expected format',
    rulesBody:
      'Useful if you would rather fix it by hand, or check what the assistant produced. The reader recognises:',
    ruleList: [
      'One row per line, prefixed with its label: “Row 1: ...”, “Round 3: ...”, “Rnd 5: ...”.',
      'Ranges, when several rows share the same instruction: “Rows 3-6: ...”.',
      'Piece names (body, ear, sleeve) alone on a line, with no closing punctuation.',
      'Materials under a “Materials:” line, one supply per line.',
      'Notes, gauge, sizes and abbreviation tables, kept aside and never counted as steps.',
    ],
    check: 'Check before you hook',
    checkBody:
      'An assistant can drop a row, and a missing row ruins a piece. Compare the row count before and after, and keep the original text at hand.',
  },
} as const satisfies Record<Locale, unknown>;

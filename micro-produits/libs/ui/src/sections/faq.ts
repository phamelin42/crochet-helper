import { Component, input } from '@angular/core';
import { QuestionReponse } from '@mp/core';
import { Paragraphes } from './paragraphes';

/**
 * Questions fréquentes, réponses visibles (pas de panneau replié : Google
 * lit le texte affiché, et la personne aussi). Le JSON-LD `FAQPage` se
 * construit avec `faqJsonLd`.
 */
@Component({
  selector: 'mp-faq',
  imports: [Paragraphes],
  template: `
    <section class="faq" aria-labelledby="faq-titre">
      <h2 id="faq-titre">Questions fréquentes</h2>
      @for (item of questions(); track item.question) {
        <h3>{{ item.question }}</h3>
        <mp-paragraphes [texte]="item.reponse" />
      }
    </section>
  `,
})
export class Faq {
  readonly questions = input.required<readonly QuestionReponse[]>();
}

export function faqJsonLd(questions: readonly QuestionReponse[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: questions.map((q) => ({
      '@type': 'Question',
      name: q.question,
      acceptedAnswer: { '@type': 'Answer', text: q.reponse },
    })),
  };
}

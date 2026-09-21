/**
 * Adaptateur mince autour de pdf.js : seul fichier à l'importer, et jamais
 * depuis un test. Chargé paresseusement par l'appelant, pour que pdf.js ne
 * pèse pas sur le bundle initial.
 */

/** Une chaîne par page : chaque item de texte, suivi de « \n » si hasEOL. */
export async function extractPdfPages(file: File): Promise<string[]> {
  const pdfjs = await import('pdfjs-dist');
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

  const data = new Uint8Array(await file.arrayBuffer());
  const document = await pdfjs.getDocument({ data }).promise;

  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(
      content.items
        .map((item) => ('str' in item ? `${item.str}${item.hasEOL ? '\n' : ''}` : ''))
        .join(''),
    );
  }
  return pages;
}

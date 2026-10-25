// lib/utils/mishnaText.ts
// Helpers for the mishna text (source_text_he), which is stored as Markdown.

/** The mishna without its Markdown emphasis, on a single line. */
export function toPlainText(markdown: string): string {
  return markdown.replace(/[*_]+/g, '').replace(/\s+/g, ' ').trim();
}

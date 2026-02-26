// supabase/functions/_shared/content-validation.ts
// Helper functions for validating content quality

/**
 * Known placeholder text patterns that indicate incomplete/failed content generation
 */
const PLACEHOLDER_PATTERNS = [
  'הסבר אוטומטי זמין',
  'הרחבה זמינה בקרוב',
];

/**
 * Check if content explanation is a placeholder (incomplete/failed generation)
 * @param aiExplanationJson - The AI explanation JSON object
 * @returns true if content is a placeholder, false if it's real content
 */
export function isPlaceholderContent(aiExplanationJson: any): boolean {
  if (!aiExplanationJson) {
    return true;
  }

  // Check if mishna_modern contains placeholder text
  if (aiExplanationJson.mishna_modern) {
    const mishnaModern = String(aiExplanationJson.mishna_modern);
    for (const pattern of PLACEHOLDER_PATTERNS) {
      if (mishnaModern.includes(pattern)) {
        return true;
      }
    }
  }

  // Check if halakha contains placeholder text
  if (aiExplanationJson.halakha) {
    const halakha = String(aiExplanationJson.halakha);
    for (const pattern of PLACEHOLDER_PATTERNS) {
      if (halakha.includes(pattern)) {
        return true;
      }
    }
  }

  // Content with empty mishna_modern is also considered placeholder
  if (!aiExplanationJson.mishna_modern || aiExplanationJson.mishna_modern.trim() === '') {
    return true;
  }

  return false;
}

/**
 * Check if a content_cache record has valid content
 * @param contentRecord - The content_cache database record
 * @returns true if content is valid, false if it's placeholder/incomplete
 */
export function isValidContent(contentRecord: {
  source_text_he?: string | null;
  ai_explanation_json?: any;
}): boolean {
  // Must have source text
  if (!contentRecord.source_text_he || contentRecord.source_text_he.trim() === '') {
    return false;
  }

  // Must have non-placeholder AI explanation
  if (isPlaceholderContent(contentRecord.ai_explanation_json)) {
    return false;
  }

  return true;
}

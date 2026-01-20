// lib/utils/content-validation.ts
// Client-side helper to detect placeholder content

/**
 * Known placeholder text patterns that indicate incomplete/failed content generation
 */
const PLACEHOLDER_PATTERNS = [
  'הסבר אוטומטי זמין',
  'הרחבה זמינה בקרוב',
];

/**
 * Check if content explanation is a placeholder (incomplete/failed generation)
 * @param aiExplanationJson - The AI explanation JSON object (can be string or object)
 * @returns true if content is a placeholder, false if it's real content
 */
export function isPlaceholderContent(aiExplanationJson: any): boolean {
  if (!aiExplanationJson) {
    return true;
  }

  // Parse if string
  let explanation = aiExplanationJson;
  if (typeof aiExplanationJson === 'string') {
    try {
      explanation = JSON.parse(aiExplanationJson);
    } catch {
      // If can't parse, check the string itself
      for (const pattern of PLACEHOLDER_PATTERNS) {
        if (aiExplanationJson.includes(pattern)) {
          return true;
        }
      }
      return false;
    }
  }

  // Check if summary contains placeholder text
  if (explanation.summary) {
    const summary = String(explanation.summary);
    for (const pattern of PLACEHOLDER_PATTERNS) {
      if (summary.includes(pattern)) {
        return true;
      }
    }
  }

  // Check if halakha contains placeholder text
  if (explanation.halakha) {
    const halakha = String(explanation.halakha);
    for (const pattern of PLACEHOLDER_PATTERNS) {
      if (halakha.includes(pattern)) {
        return true;
      }
    }
  }

  // Content with empty summary is also considered placeholder
  if (!explanation.summary || explanation.summary.trim() === '') {
    return true;
  }

  return false;
}

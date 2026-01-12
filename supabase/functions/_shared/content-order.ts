// supabase/functions/_shared/content-order.ts
// Track content ordering utilities
// Reference: scheduling.md Section "Content Assignment"

/**
 * Gets the content reference for a given index in the Mishnah track
 * Format: Mishnah_{Tractate}.{Chapter}.{Mishnah}
 * 
 * For MVP, we'll use a simplified sequential ordering
 * Starting with Berakhot Chapter 1, Mishnah 1
 */
export function getContentRefForIndex(index: number): string {
  // Simplified MVP implementation
  // For production, this should map to actual Mishnah content order
  // Starting with Berakhot.1.1, then Berakhot.1.2, etc.
  
  // Calculate tractate, chapter, and mishnah from index
  // This is a placeholder - actual mapping will depend on track content structure
  const tractate = 'Berakhot';
  const chapter = Math.floor(index / 10) + 1; // Simplified: 10 mishnayot per chapter
  const mishnah = (index % 10) + 1;
  
  return `Mishnah_${tractate}.${chapter}.${mishnah}`;
}

/**
 * Gets the content reference ID format for content_cache lookup
 * This matches the ref_id format used in content_cache table
 */
export function getContentRefId(ref: string): string {
  // The ref_id in content_cache should match this format
  return ref;
}

# Content Generation Guide

## Purpose

The Content Generation Guide covers fetching source text from Sefaria API, generating AI-powered explanations based on classical commentaries, and caching content for offline access.

## Responsibilities

- Sefaria API integration for source text and commentaries
- AI content generation logic (Edge Function)
- Content caching strategy
- Explanation generation rules
- Content deduplication
- Commentary synthesis

## AI Explanation Philosophy

### Sources

- AI explanations are based on **all available classical commentaries from Sefaria**
- No single commentator is treated as authoritative by default

### Explanation Rules

#### Clear Explanation (summary)

- Presents **one coherent interpretation**
- Selected based on:
  - Simplicity
  - Conceptual clarity
  - Internal consistency across the unit
- Avoids mixing contradictory interpretations

#### Summary of Commentaries (opinions)

- Presents multiple interpretive approaches
- Clearly separated from main explanation
- Intended for optional deeper exploration

## Sefaria API Integration

### Base URL

```
https://www.sefaria.org/api/
```

### Endpoints

| Endpoint | Purpose |
|----------|---------|
| `/texts/{ref}` | Get text and translations |
| `/links/{ref}` | Get related commentaries |
| `/index/{title}` | Get structure of a text |

### Example: Fetching Mishnah

```typescript
// Fetch Mishnah Berakhot 1:1
const response = await fetch(
  'https://www.sefaria.org/api/texts/Mishnah_Berakhot.1.1?context=0&commentary=1'
);

const data = await response.json();
// data.he - Hebrew text
// data.commentary - Related commentaries
```

### Commentaries to Include

For Mishnah, fetch these classical commentaries:
- Bartenura (ברטנורא)
- Tosafot Yom Tov (תוספות יום טוב)
- Rambam (רמב"ם)
- Tiferet Yisrael (תפארת ישראל)
- Kehati (קהתי)

## Content Generation Edge Function

### Location

```
supabase/functions/generate-content/index.ts
```

### Input

```typescript
interface ContentGenerationRequest {
  ref_id: string;  // e.g., "Mishnah_Berakhot.1.1"
}
```

### Process

1. Check if content exists in `content_cache`
2. If not, fetch from Sefaria:
   - Get source text
   - Get all available commentaries
3. Generate AI explanation:
   - Send text + commentaries to AI
   - Request one clear explanation
   - Request summary of different opinions
4. Store in `content_cache`
5. Return content

### Output Structure

```typescript
interface AIExplanationJson {
  summary: string;        // Clear explanation in modern Hebrew
  halakha: string;        // Practical halakha if applicable
  opinions: Array<{       // Summary of commentaries
    source: string;       // Source name
    details: string;      // Opinion in modern Hebrew
  }>;
  expansions: Array<{     // Expansions for modern readers
    topic: string;        // Topic
    explanation: string;  // Detailed explanation
    source?: string;      // Source (optional)
  }>;
}
```

## AI Prompt Guidelines

### Clear Explanation Prompt

- Input: source text + available commentaries
- Instructions: Create one clear, coherent explanation in Hebrew
- Avoid mixing contradictory opinions
- Keep language simple and accessible
- Do not cite specific commentators in main explanation

### Opinions Prompt

- Input: source text + available commentaries
- Instructions: Identify 2-4 distinct interpretive approaches
- For each approach, note which commentator(s) hold this view
- Summarize each approach briefly in Hebrew

## Content Caching Strategy

### Cache Key

Use `ref_id` as unique identifier (e.g., "Mishnah_Berakhot.1.1")

### Cache Invalidation

- Content is immutable once generated
- No automatic invalidation
- Manual regeneration only if AI quality improves

### Deduplication

- Single entry per `ref_id`
- All users share the same cached content
- Reduces storage and AI generation costs

## Key Files

| Path | Purpose |
|------|---------|
| `supabase/functions/generate-content/index.ts` | Main Edge Function |
| `supabase/functions/_shared/sefaria.ts` | Sefaria API client |
| `supabase/functions/_shared/gemini.ts` | AI generation utilities |

## Implementation Guidelines

### Error Handling

- Retry Sefaria API on failure (3 attempts with exponential backoff)
- Handle rate limiting gracefully
- Queue AI requests for batch processing
- Log errors for debugging

```typescript
const fetchWithRetry = async (url: string, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (response.ok) return response.json();
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
};
```

### Language

- **MVP**: Hebrew only
- All content fields use `_he` suffix
- Multi-language support architecturally considered but out of MVP scope

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `GEMINI_API_KEY` | Google Gemini API for explanations |
| `SEFARIA_API_URL` | Base URL (default: https://www.sefaria.org/api/) |

**Security**: Never commit API keys. Use Supabase secrets.

## Reference Documents

- **PRD Section 5**: AI Explanation Philosophy
- **TDD Section 4.2**: Content Cache schema
- **TDD Section 7**: AI Content Generation

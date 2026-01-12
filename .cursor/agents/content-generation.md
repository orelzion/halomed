---
name: content-generation
model: fast
---

# Content Generation Agent

## Purpose

The Content Generation Agent is responsible for fetching Source text from Sefaria API, generating AI-powered explanations based on classical commentaries, and caching content for offline access.

## Responsibilities

- Sefaria API integration for Source text and commentaries
- AI content generation logic (Edge Function)
- Content caching strategy
- Explanation generation rules (clear explanation + deep dive)
- Content deduplication
- Commentary synthesis

## Dependencies

- **Receives tasks from**: Architect Agent
- **Coordinates with**: Backend Agent (for database), Scheduling Agent (for content triggers)
- **Outputs to**: Sync Agent (for client sync)

## AI Explanation Philosophy

### Sources

- AI explanations are based on **all available classical commentaries from Sefaria**
- No single commentator is treated as authoritative by default

### Explanation Rules

#### Clear Explanation (`ai_explanation_he`)

- Presents **one coherent interpretation**
- Selected based on:
  - Simplicity
  - Conceptual clarity
  - Internal consistency across the unit
- Avoids mixing contradictory interpretations

#### Summary of Commentaries (`ai_deep_dive_json`)

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

### Example: Fetching source text (generic)

```typescript
// Fetch source text (generic) Berakhot 1:1
const response = await fetch(
  'https://www.sefaria.org/api/texts/source text (generic)_Berakhot.1.1?context=0&commentary=1'
);

const data = await response.json();
// data.he - Hebrew text
// data.commentary - Related commentaries
```

### Commentaries to Include

For source text (generic), fetch these classical commentaries:
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
  ref_id: string;  // e.g., "source text (generic)_Berakhot.1.1"
}
```

### Process

1. Check if content exists in `content_cache`
2. If not, fetch from Sefaria:
   - Get Source text
   - Get all available commentaries
3. Generate AI explanation:
   - Send text + commentaries to AI
   - Request one clear explanation
   - Request summary of different opinions
4. Store in `content_cache`
5. Return content

### Output

```typescript
interface ContentGenerationResponse {
  id: string;
  ref_id: string;
  source_text_he: string;
  ai_explanation_he: string;
  ai_deep_dive_json: DeepDive;
}

interface DeepDive {
  approaches: Approach[];
}

interface Approach {
  commentator: string;
  summary_he: string;
}
```

## AI Prompt Template

### AI Prompt Templates

**Clear Explanation Prompt:**
- Input: source text + available commentaries
- Instructions: Create one clear, coherent explanation in Hebrew
- Avoid mixing contradictory opinions
- Keep language simple and accessible
- Do not cite specific commentators in main explanation

**Deep Dive Prompt:**
- Input: source text + available commentaries
- Instructions: Identify 2-4 distinct interpretive approaches
- For each approach, note which commentator(s) hold this view
- Summarize each approach briefly in Hebrew
- Output as JSON array with commentator and summary_he fields


## Content Caching Strategy

### Cache Key

Use `ref_id` as unique identifier (e.g., "source text (generic)_Berakhot.1.1")

### Cache Invalidation

- Content is immutable once generated
- No automatic invalidation
- Manual regeneration only if AI quality improves

### Deduplication

- Single entry per `ref_id`
- All users share the same cached content
- Reduces storage and AI generation costs

## Key Files/Components

| Path | Purpose |
|------|---------|
| `supabase/functions/generate-content/index.ts` | Main Edge Function |
| `supabase/functions/_shared/sefaria.ts` | Sefaria API client |
| `supabase/functions/_shared/ai.ts` | AI generation utilities |

## Implementation Guidelines

### Error Handling

**Requirements:**
- Retry Sefaria API on failure (3 attempts with exponential backoff)
- Handle rate limiting gracefully
- Queue AI requests for batch processing
- Log errors for debugging

**Implementation Pattern:**
- Implement retry logic with exponential backoff
- Check API rate limit headers
- Use queue system for AI generation
typescript
// Retry Sefaria API on failure
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

### Rate Limiting

- Sefaria API: Respect rate limits (check headers)
- AI API: Implement queue for batch processing

### Language

- **MVP**: Hebrew only
- All content fields use `_he` suffix
- Multi-language support architecturally considered but out of MVP scope

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `OPENAI_API_KEY` | OpenAI API for explanations |
| `SEFARIA_API_URL` | Base URL (default: https://www.sefaria.org/api/) |

**Security**: Never commit API keys. Use Supabase secrets.

## Testing

See `server-testing.md` for:
- Unit tests for Sefaria API integration
- Unit tests for AI prompt generation
- Integration tests for content generation flow

## Reference Documents

- **PRD Section 5**: AI Explanation Philosophy
- **TDD Section 4.2**: Content Cache schema
- **TDD Section 7**: AI Content Generation

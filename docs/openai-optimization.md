# OpenAI API Optimization

## Current Implementation Analysis

### Model Selection: `gpt-4o-mini` ✅

**Rationale:**
- **Cost**: $0.075 per 1M input tokens, $0.30 per 1M output tokens (Batch tier)
- **Speed**: Fastest among GPT-4 family models
- **Quality**: Excellent for structured Hebrew text generation
- **Use Case Fit**: Perfect for content generation where we need consistent, structured output

**Comparison with `gpt-5-mini`:**
- `gpt-5-mini`: $0.125/$1.00 per 1M tokens (input/output) - 67% more expensive input, 233% more expensive output
- `gpt-5-mini` offers better capabilities but is overkill for our simple text generation use case
- For cost-sensitive, structured text generation: `gpt-4o-mini` is optimal

**Reference**: 
- [OpenAI Pricing](https://platform.openai.com/docs/pricing)
- [OpenAI Production Best Practices - Model Selection](https://platform.openai.com/docs/guides/production-best-practices#model)

### API Selection: Chat Completions API ✅

**Rationale:**
- Simple text generation use case (no complex function calling needed)
- Stateless API fits our caching strategy
- Responses API recommended for agentic workflows with multiple function calls (not our use case)

**Message Structure: System + User Messages ✅**
- Using `system` and `user` roles is correct for Chat Completions API
- `developer` role is only for reasoning models (o1, o3, etc.) in Responses API
- Our two-message approach (system prompt + user prompt) is optimal

**Reference**: 
- [OpenAI Migration Guide](https://platform.openai.com/docs/guides/migrate-to-responses)
- [OpenAI Chat Completions API](https://platform.openai.com/docs/api-reference/chat/create)

### Token Usage Optimization

**Current Usage (per request):**
- Input tokens: ~6,000 (source text + commentaries + prompt)
- Output tokens: ~500 (explanation + deep dive combined)
- Total: ~6,500 tokens per request

**Optimizations Applied:**
1. ✅ **Single API call**: Generate both explanation and deep dive in one request (reduces API calls by 50%)
2. ✅ **Optimized max_tokens**: Set to 800 (actual usage ~500, with safety margin)
3. ✅ **Content caching**: All generated content cached in `content_cache` table (reduces API calls to zero for cached content)
4. ✅ **Efficient prompt structure**: JSON-structured input for better token efficiency

**Cost per Generation:**
- First generation: ~$0.0006 per Mishnah (6,000 input @ $0.075/1M + 500 output @ $0.30/1M tokens)
- Cached content: $0 (served from database)
- With gpt-5-mini: ~$0.001 per Mishnah (67% more expensive)

### Best Practices Implemented

1. **Caching Strategy** ✅
   - All content cached in `content_cache` table
   - Deduplication by `ref_id`
   - Reduces API costs to near-zero for repeated content

2. **Error Handling** ✅
   - Retry logic with exponential backoff (3 attempts)
   - Graceful fallback to placeholder content
   - Rate limit handling (429 status codes)

3. **Token Optimization** ✅
   - Optimized `max_tokens` based on actual usage
   - Single API call for both explanation and deep dive
   - Efficient JSON prompt structure

4. **Model Selection** ✅
   - Using cost-efficient `gpt-4o-mini` model
   - Appropriate for structured text generation
   - Fast response times

### Potential Future Optimizations

1. **Stop Sequences**: Could add stop sequences to prevent over-generation, but current max_tokens limit is sufficient
2. **Prompt Optimization**: Further reduce prompt size if needed (currently ~6K tokens is reasonable)
3. **Batch Processing**: If generating multiple Mishnayot, could batch requests (up to 20 prompts per request)
4. **Fine-tuning**: Consider fine-tuning for domain-specific optimization (future enhancement)

### Monitoring

**Key Metrics to Track:**
- Token usage per request (input + output)
- API call frequency (should decrease as cache fills)
- Cost per user/month
- Cache hit rate

**Tools:**
- OpenAI Usage Dashboard: https://platform.openai.com/usage
- Supabase logs for API call frequency
- Database queries for cache hit rate

## References

- [OpenAI Production Best Practices](https://platform.openai.com/docs/guides/production-best-practices)
- [OpenAI Pricing](https://platform.openai.com/docs/pricing)
- [OpenAI Model Selection Guide](https://platform.openai.com/docs/guides/production-best-practices#model)
- [Cost Optimization Framework](https://platform.openai.com/docs/guides/production-best-practices#managing-costs)

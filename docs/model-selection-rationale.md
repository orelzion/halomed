# Model Selection Rationale: gpt-4o-mini vs gpt-5-mini

## Decision: Use `gpt-4o-mini`

### Cost Comparison (Batch Tier Pricing)

| Model | Input (per 1M tokens) | Output (per 1M tokens) | Total for 6K input + 500 output |
|-------|----------------------|------------------------|----------------------------------|
| **gpt-4o-mini** | **$0.075** | **$0.30** | **~$0.0006** |
| gpt-5-mini | $0.125 | $1.00 | ~$0.001 |

**Cost difference**: gpt-5-mini is **67% more expensive** for input tokens and **233% more expensive** for output tokens.

### Use Case Analysis

**Our Requirements:**
- Structured Hebrew text generation (Mishnah explanations)
- Consistent, predictable output format
- Cost-sensitive (content cached, but initial generation matters)
- Simple text generation (no complex reasoning, no function calling)

**Model Capabilities:**

| Feature | gpt-4o-mini | gpt-5-mini | Our Need |
|---------|-------------|------------|----------|
| Text generation | ✅ Excellent | ✅ Excellent | ✅ Required |
| Structured output | ✅ Good | ✅ Better | ✅ Required |
| Cost efficiency | ✅ Best | ⚠️ Higher | ✅ Critical |
| Reasoning | ❌ Basic | ✅ Advanced | ❌ Not needed |
| Function calling | ✅ Supported | ✅ Supported | ❌ Not needed |
| Speed | ✅ Fastest | ✅ Fast | ✅ Preferred |

### Recommendation

**Use `gpt-4o-mini` because:**
1. **Cost**: 2x cheaper input, 3.3x cheaper output - significant savings at scale
2. **Sufficient quality**: Excellent for structured Hebrew text generation
3. **Speed**: Fastest response times
4. **Use case fit**: We don't need advanced reasoning capabilities that gpt-5-mini offers

**Consider `gpt-5-mini` if:**
- Quality requirements increase significantly
- We need advanced reasoning for complex interpretations
- Cost becomes less of a concern
- OpenAI deprecates gpt-4o-mini

### Message Structure: System + User ✅

**Current approach is correct:**
- Using `system` role for instructions: ✅ Standard practice
- Using `user` role for prompt: ✅ Standard practice
- Two-message structure: ✅ Optimal for our use case

**Note**: `developer` role is only for reasoning models (o1, o3, etc.) in Responses API. For Chat Completions API with gpt-4o-mini/gpt-5-mini, `system` and `user` roles are the correct approach.

## References

- [OpenAI Pricing](https://platform.openai.com/docs/pricing)
- [OpenAI Model Selection Guide](https://platform.openai.com/docs/guides/latest-model)
- [Chat Completions API Reference](https://platform.openai.com/docs/api-reference/chat/create)

import Anthropic from '@anthropic-ai/sdk'

const CLAUDE_MODEL = 'claude-sonnet-4-6'
const DEFAULT_MAX_TOKENS = 1024

export function hasAnthropicApiKey() {
  return Boolean(process.env.ANTHROPIC_API_KEY)
}

export async function generateClaudeText(prompt: string, maxTokens = DEFAULT_MAX_TOKENS): Promise<string | null> {
  if (!hasAnthropicApiKey()) return null

  const client = new Anthropic()
  const message = await client.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  })

  return message.content[0].type === 'text' ? message.content[0].text : null
}
export interface OpenAIClient {
  chat: (params: ChatParams) => Promise<string>
}

interface ChatParams {
  systemPrompt: string
  userPrompt: string
  jsonSchema: Record<string, unknown>
  schemaName: string
}

export function createOpenAIClient(): OpenAIClient {
  const apiKey = Deno.env.get('OPENAI_API_KEY')
  const model = Deno.env.get('OPENAI_MODEL') || 'gpt-4o-mini'
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY')

  return {
    async chat({ systemPrompt, userPrompt, jsonSchema, schemaName }: ChatParams): Promise<string> {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: schemaName,
              strict: true,
              schema: jsonSchema,
            },
          },
          temperature: 0.8,
        }),
      })

      if (!response.ok) {
        const err = await response.text()
        throw new Error(`OpenAI API error ${response.status}: ${err}`)
      }

      const data = await response.json()
      const content = data.choices?.[0]?.message?.content
      if (!content) throw new Error('Empty response from OpenAI')
      return content
    },
  }
}

import { usesDefaultTemperatureOnly } from '../../src/openai/models.ts'

export interface OpenAIClient {
  chat: (params: ChatParams) => Promise<string>
  webVerify: (params: { model: string; instructions: string; input: string; jsonSchema: Record<string, unknown>; schemaName: string }) => Promise<{ outputText: string; sourceUrls: string[] }>
}

export interface ChatParams {
  systemPrompt: string
  userPrompt: string
  jsonSchema: Record<string, unknown>
  schemaName: string
  model?: string
  temperature?: number
}

export function createOpenAIClient(): OpenAIClient {
  const apiKey = Deno.env.get('OPENAI_API_KEY')
  const defaultModel = Deno.env.get('OPENAI_MODEL') || 'gpt-4o-mini'
  if (!apiKey) throw new Error('Missing OPENAI_API_KEY')

  return {
    async chat({ systemPrompt, userPrompt, jsonSchema, schemaName, model, temperature }: ChatParams): Promise<string> {
      const selectedModel = model ?? defaultModel
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: selectedModel,
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
          ...(usesDefaultTemperatureOnly(selectedModel) ? {} : { temperature: temperature ?? 0.8 }),
        }),
      })

      if (!response.ok) {
        const err = await response.text()
        throw new Error(`OpenAI API error ${response.status}: ${err}`)
      }

      const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> }
      const content = data.choices?.[0]?.message?.content
      if (!content) throw new Error('Empty response from OpenAI')
      return content
    },
    async webVerify({ model, instructions, input, jsonSchema, schemaName }) {
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model, instructions, input, store: false, tools: [{ type: 'web_search' }],
          include: ['web_search_call.action.sources'],
          text: { format: { type: 'json_schema', name: schemaName, strict: true, schema: jsonSchema } },
        }),
      })
      if (!response.ok) throw new Error(`OpenAI API error ${response.status}: ${await response.text()}`)
      const data = await response.json() as {
        output_text?: string
        output?: Array<{
          type?: string
          action?: { sources?: Array<{ url?: string }> }
          content?: Array<{ type?: string; text?: string }>
        }>
      }
      const sourceUrls = (data.output ?? []).flatMap(item => item.type === 'web_search_call' ? (item.action?.sources ?? []).map(source => source.url).filter((url): url is string => Boolean(url)) : [])
      const outputText = data.output_text ?? (data.output ?? [])
        .flatMap(item => item.content ?? [])
        .filter(content => content.type === 'output_text' && typeof content.text === 'string')
        .map(content => content.text as string)
        .join('')
      if (!outputText) throw new Error('Empty response from OpenAI')
      return { outputText, sourceUrls }
    },
  }
}

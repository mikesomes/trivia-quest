import { describe, expect, it } from 'vitest'
import { usesDefaultTemperatureOnly } from '../../supabase/src/openai/models.ts'

describe('OpenAI model parameters', () => {
  it('omits custom sampling temperature for GPT-5 model names and snapshots', () => {
    expect(usesDefaultTemperatureOnly('gpt-5.5')).toBe(true)
    expect(usesDefaultTemperatureOnly('gpt-5.5-2026-04-23')).toBe(true)
  })

  it('preserves existing temperature behavior for GPT-4o mini', () => {
    expect(usesDefaultTemperatureOnly('gpt-4o-mini')).toBe(false)
  })
})

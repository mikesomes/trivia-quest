import { describe, expect, it, vi } from 'vitest'
import {
  ADJUDICATION_CONFIDENCE_FLOOR,
  adjudicateDuplicate,
  buildAdjudicationPrompt,
  confirmsDuplicate,
  parseAdjudication,
} from '../../supabase/src/openai/duplicateAdjudicator.ts'

const input = {
  category: 'sports',
  answer: 'tennis',
  textA: 'With which sport is Serena Williams associated?',
  textB: 'With which sport is Billie Jean King associated?',
}

describe('buildAdjudicationPrompt', () => {
  it('states the shared answer so the model does not re-litigate it', () => {
    const prompt = buildAdjudicationPrompt(input)
    expect(prompt).toContain('the correct answer: tennis')
    expect(prompt).toContain(input.textA)
    expect(prompt).toContain(input.textB)
  })

  it('names the template trap the lexical rule falls into', () => {
    const prompt = buildAdjudicationPrompt(input)
    expect(prompt).toMatch(/same template with different subjects are NOT duplicates/i)
  })
})

describe('parseAdjudication', () => {
  it('accepts a well-formed verdict', () => {
    const result = parseAdjudication('{"duplicate":true,"confidence":0.9,"reason":"same subject"}')
    expect(result).toEqual({ duplicate: true, confidence: 0.9, reason: 'same subject' })
  })

  it.each([
    ['{"duplicate":"yes","confidence":0.9,"reason":"x"}', /duplicate flag/],
    ['{"duplicate":true,"confidence":2,"reason":"x"}', /confidence/],
    ['{"duplicate":true,"confidence":-0.1,"reason":"x"}', /confidence/],
    ['{"duplicate":true,"confidence":"high","reason":"x"}', /confidence/],
    ['{"duplicate":true,"confidence":0.9}', /reason/],
  ])('rejects a malformed verdict (%s)', (raw, message) => {
    expect(() => parseAdjudication(raw)).toThrow(message)
  })
})

describe('confirmsDuplicate', () => {
  it('confirms only a confident yes', () => {
    expect(confirmsDuplicate({ duplicate: true, confidence: 0.95, reason: '' })).toBe(true)
    expect(confirmsDuplicate({ duplicate: true, confidence: ADJUDICATION_CONFIDENCE_FLOOR, reason: '' })).toBe(true)
  })

  // Both of these keep the question. A missed duplicate resurfaces in the
  // audit; a wrong drop is a good question silently gone.
  it('keeps the pair on a hedged yes', () => {
    expect(confirmsDuplicate({ duplicate: true, confidence: 0.5, reason: 'unsure' })).toBe(false)
  })

  it('keeps the pair on a no', () => {
    expect(confirmsDuplicate({ duplicate: false, confidence: 1, reason: 'different subjects' })).toBe(false)
  })
})

describe('adjudicateDuplicate', () => {
  it('asks at temperature 0 with the strict schema and returns the parsed verdict', async () => {
    const openaiChat = vi.fn().mockResolvedValue('{"duplicate":false,"confidence":0.9,"reason":"different players"}')
    const result = await adjudicateDuplicate(input, openaiChat)

    expect(result.duplicate).toBe(false)
    const params = openaiChat.mock.calls[0][0]
    expect(params.temperature).toBe(0)
    expect(params.schemaName).toBe('trivia_duplicate_adjudication')
    expect(params.jsonSchema.required).toEqual(['duplicate', 'confidence', 'reason'])
  })

  it('propagates a parse failure rather than guessing a verdict', async () => {
    const openaiChat = vi.fn().mockResolvedValue('not json')
    await expect(adjudicateDuplicate(input, openaiChat)).rejects.toThrow()
  })
})

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { generateQuestions } from '../../supabase/src/openai/generator.ts'

function question(questionText: string, correct: string, wrong = ['W1', 'W2', 'W3']) {
  return {
    questionText,
    optionA: correct,
    optionB: wrong[0],
    optionC: wrong[1],
    optionD: wrong[2],
    correctOption: 'a' as const,
    explanation: 'A sufficiently long explanation of why this is correct.',
  }
}

/** Fake openaiChat returning a fixed batch, and recording the prompts it saw. */
function fakeChat(batches: object[][]) {
  const prompts: string[] = []
  let call = 0
  const chat = async ({ userPrompt }: { userPrompt: string }) => {
    prompts.push(userPrompt)
    const batch = batches[Math.min(call, batches.length - 1)]
    call++
    return JSON.stringify({ questions: batch })
  }
  return { chat, prompts, callCount: () => call }
}

beforeEach(() => {
  vi.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('generateQuestions', () => {
  it('returns validated questions with a content hash and source', async () => {
    const { chat } = fakeChat([[
      question('What is the capital of France?', 'Paris'),
      question('What is the capital of Japan?', 'Tokyo'),
      question('What is the capital of Peru?', 'Lima'),
    ]])

    const result = await generateQuestions({
      category: 'geography',
      difficulty: 'easy',
      count: 3,
      openaiChat: chat,
    })

    expect(result).toHaveLength(3)
    expect(result[0].category).toBe('geography')
    expect(result[0].difficulty).toBe('easy')
    expect(result[0].content_hash).toMatch(/^[0-9a-f]{64}$/)
    expect(result[0].source).toContain('openai-')
  })

  it('quotes the existing bank questions into the prompt', async () => {
    const { chat, prompts } = fakeChat([[question('What is the capital of Peru?', 'Lima')]])

    await generateQuestions({
      category: 'geography',
      difficulty: 'easy',
      count: 1,
      existingQuestions: ['What is the capital of France?'],
      openaiChat: chat,
    })

    expect(prompts[0]).toContain('What is the capital of France?')
  })

  it('drops in-batch near-duplicates before returning', async () => {
    const { chat } = fakeChat([[
      question('Who painted the Mona Lisa?', 'Leonardo da Vinci'),
      question('Which artist painted the Mona Lisa?', 'Leonardo da Vinci'),
      question('Who sculpted David?', 'Michelangelo'),
    ]])

    const result = await generateQuestions({
      category: 'general_knowledge',
      difficulty: 'medium',
      count: 3,
      openaiChat: chat,
    })

    expect(result.map(r => r.question_text)).toEqual([
      'Who painted the Mona Lisa?',
      'Who sculpted David?',
    ])
  })

  it('drops candidates the bank check flags', async () => {
    const { chat } = fakeChat([[
      question('What is the capital of France?', 'Paris'),
      question('What is the capital of Japan?', 'Tokyo'),
    ]])

    const result = await generateQuestions({
      category: 'geography',
      difficulty: 'easy',
      count: 2,
      openaiChat: chat,
      findBankDuplicates: async () => [
        { idx: 0, matchText: "What is France's capital city?", score: 0.64 },
      ],
    })

    expect(result.map(r => r.question_text)).toEqual(['What is the capital of Japan?'])
  })

  it('sends the bank check the candidate text and its correct answer', async () => {
    const { chat } = fakeChat([[question('What is the capital of France?', 'Paris')]])
    const findBankDuplicates = vi.fn(async () => [])

    await generateQuestions({
      category: 'geography',
      difficulty: 'easy',
      count: 1,
      openaiChat: chat,
      findBankDuplicates,
    })

    expect(findBankDuplicates).toHaveBeenCalledWith([
      { idx: 0, text: 'What is the capital of France?', answer: 'Paris' },
    ])
  })

  it('keeps the batch when the bank check fails', async () => {
    const { chat } = fakeChat([[
      question('What is the capital of France?', 'Paris'),
      question('What is the capital of Japan?', 'Tokyo'),
    ]])

    const result = await generateQuestions({
      category: 'geography',
      difficulty: 'easy',
      count: 2,
      openaiChat: chat,
      findBankDuplicates: async () => {
        throw new Error('connection reset')
      },
    })

    // Losing a whole batch to a transient error is worse than admitting a
    // near-duplicate the audit will find.
    expect(result).toHaveLength(2)
  })

  it('excludes exact duplicates already in the bank by hash', async () => {
    const { chat } = fakeChat([[
      question('What is the capital of France?', 'Paris'),
      question('What is the capital of Japan?', 'Tokyo'),
    ]])

    // Hash of the first question, as computeContentHash would produce it.
    const { computeContentHash } = await import('../../supabase/src/openai/deduplicator.ts')
    const existing = new Set([
      computeContentHash(question('What is the capital of France?', 'Paris')),
    ])

    const result = await generateQuestions({
      category: 'geography',
      difficulty: 'easy',
      count: 2,
      existingHashes: existing,
      openaiChat: chat,
    })

    expect(result.map(r => r.question_text)).toEqual(['What is the capital of Japan?'])
  })

  it('retries with a diversity boost when the first attempt falls short', async () => {
    const { chat, prompts, callCount } = fakeChat([
      [question('What is the capital of France?', 'Paris')],
      [
        question('What is the capital of Japan?', 'Tokyo'),
        question('What is the capital of Peru?', 'Lima'),
        question('What is the capital of Chile?', 'Santiago'),
      ],
    ])

    const result = await generateQuestions({
      category: 'geography',
      difficulty: 'easy',
      count: 10,
      openaiChat: chat,
    })

    expect(callCount()).toBe(2)
    // The retry must know what attempt 1 already produced.
    expect(prompts[1]).toContain('What is the capital of France?')
    expect(result.length).toBeGreaterThan(1)
  })
})

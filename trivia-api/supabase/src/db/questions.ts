// DB helpers for question_bank — used by edge functions
// These are typed helpers for use with the Supabase client

export interface QuestionBankRow {
  id: string
  category: string
  difficulty: string
  question_text: string
  option_a: string
  option_b: string
  option_c: string
  option_d: string
  correct_option: string
  explanation: string | null
  content_hash: string
  times_used: number
  is_active: boolean
}

/**
 * Select N random questions for a round from the question bank.
 * Prefers least-recently-used questions.
 */
export async function selectQuestionsForRound(
  supabase: ReturnType<typeof import('../../functions/_shared/supabaseClient.ts').createServiceClient>,
  category: string,
  difficulty: string,
  count: number,
  userId?: string
): Promise<QuestionBankRow[]> {
  const { data, error } = await supabase.rpc('get_random_questions', {
    p_category: category,
    p_difficulty: difficulty,
    p_count: count,
    ...(userId ? { p_user_id: userId } : {}),
  })

  if (error) throw new Error(`Failed to fetch questions: ${error.message}`)
  if (!data || data.length < count) {
    throw new Error(`Insufficient questions in bank for ${category}/${difficulty}: need ${count}, got ${data?.length ?? 0}`)
  }

  return data as QuestionBankRow[]
}

import type { DifficultyMix } from '../../functions/_shared/types.ts'

/**
 * Select questions for a round from multiple difficulty buckets, then shuffle.
 * If a bucket falls short, borrows from adjacent difficulties before failing.
 */
export async function selectQuestionsWithMix(
  supabase: ReturnType<typeof import('../../functions/_shared/supabaseClient.ts').createServiceClient>,
  category: string,
  mix: DifficultyMix,
  userId?: string
): Promise<QuestionBankRow[]> {
  const buckets: Array<{ difficulty: string; count: number }> = [
    { difficulty: 'easy',   count: mix.easy },
    { difficulty: 'medium', count: mix.medium },
    { difficulty: 'hard',   count: mix.hard },
  ].filter(b => b.count > 0)

  const total = mix.easy + mix.medium + mix.hard
  const results: QuestionBankRow[] = []
  let deficit = 0

  for (const bucket of buckets) {
    const needed = bucket.count + deficit
    const { data, error } = await supabase.rpc('get_random_questions', {
      p_category: category,
      p_difficulty: bucket.difficulty,
      p_count: needed,
      ...(userId ? { p_user_id: userId } : {}),
    })
    if (error) throw new Error(`Failed to fetch ${bucket.difficulty} questions: ${error.message}`)
    const got = (data ?? []) as QuestionBankRow[]
    results.push(...got)
    deficit = Math.max(0, needed - got.length)
    if (deficit > 0) {
      console.warn(`[selectQuestionsWithMix] ${bucket.difficulty} shortfall: needed ${needed}, got ${got.length}`)
    }
  }

  if (results.length < total) {
    throw new Error(`Insufficient questions in bank for ${category} (mix ${JSON.stringify(mix)}): need ${total}, got ${results.length}`)
  }

  // Fisher-Yates shuffle so difficulties aren't clustered by position
  for (let i = results.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[results[i], results[j]] = [results[j], results[i]]
  }

  return results
}

/**
 * Select questions for a blitz round in ordered segments.
 * Fetches each difficulty bucket once (no cross-segment duplicates),
 * then distributes to segments and shuffles within each.
 * The returned array preserves segment order: segment[0] first, then segment[1], etc.
 */
export async function selectQuestionsWithSegments(
  supabase: ReturnType<typeof import('../../functions/_shared/supabaseClient.ts').createServiceClient>,
  category: string,
  segments: DifficultyMix[],
  userId?: string,
): Promise<QuestionBankRow[]> {
  const totals = { easy: 0, medium: 0, hard: 0 }
  for (const seg of segments) {
    totals.easy   += seg.easy
    totals.medium += seg.medium
    totals.hard   += seg.hard
  }

  const pools: { easy: QuestionBankRow[]; medium: QuestionBankRow[]; hard: QuestionBankRow[] } = {
    easy: [], medium: [], hard: [],
  }
  for (const diff of ['easy', 'medium', 'hard'] as const) {
    if (totals[diff] === 0) continue
    const { data, error } = await supabase.rpc('get_random_questions', {
      p_category: category,
      p_difficulty: diff,
      p_count: totals[diff],
      ...(userId ? { p_user_id: userId } : {}),
    })
    if (error) throw new Error(`Failed to fetch ${diff} questions: ${error.message}`)
    const got = (data ?? []) as QuestionBankRow[]
    if (got.length < totals[diff]) {
      console.warn(`[selectQuestionsWithSegments] ${diff} shortfall: needed ${totals[diff]}, got ${got.length}`)
    }
    pools[diff] = got
  }

  const fetched = pools.easy.length + pools.medium.length + pools.hard.length
  if (fetched < totals.easy + totals.medium + totals.hard) {
    throw new Error(`Insufficient questions for segments in ${category}`)
  }

  const cursors = { easy: 0, medium: 0, hard: 0 }
  const result: QuestionBankRow[] = []
  for (const seg of segments) {
    const segQuestions: QuestionBankRow[] = [
      ...pools.easy.slice(cursors.easy, cursors.easy + seg.easy),
      ...pools.medium.slice(cursors.medium, cursors.medium + seg.medium),
      ...pools.hard.slice(cursors.hard, cursors.hard + seg.hard),
    ]
    cursors.easy   += seg.easy
    cursors.medium += seg.medium
    cursors.hard   += seg.hard
    for (let i = segQuestions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[segQuestions[i], segQuestions[j]] = [segQuestions[j], segQuestions[i]]
    }
    result.push(...segQuestions)
  }
  return result
}

/**
 * Get count of available questions per category/difficulty.
 */
export async function getQuestionInventory(
  supabase: ReturnType<typeof import('../../functions/_shared/supabaseClient.ts').createServiceClient>
): Promise<Array<{ category: string; difficulty: string; count: number }>> {
  const { data, error } = await supabase
    .from('question_bank')
    .select('category, difficulty')
    .eq('is_active', true)

  if (error) throw new Error(`Failed to get inventory: ${error.message}`)

  const counts: Record<string, number> = {}
  for (const row of data ?? []) {
    const key = `${row.category}::${row.difficulty}`
    counts[key] = (counts[key] || 0) + 1
  }

  return Object.entries(counts).map(([key, count]) => {
    const [category, difficulty] = key.split('::')
    return { category, difficulty, count }
  })
}

/**
 * Get existing content hashes for a category/difficulty (for deduplication).
 * Pass extraCategories to also include hashes from other categories (cross-category dedup).
 */
export async function getExistingHashes(
  supabase: ReturnType<typeof import('../../functions/_shared/supabaseClient.ts').createServiceClient>,
  category: string,
  difficulty: string,
  extraCategories: string[] = []
): Promise<Set<string>> {
  const allCategories = [category, ...extraCategories]

  const { data, error } = await supabase
    .from('question_bank')
    .select('content_hash')
    .in('category', allCategories)
    .eq('difficulty', difficulty)

  if (error) throw new Error(`Failed to get hashes: ${error.message}`)
  return new Set((data ?? []).map(r => r.content_hash))
}

/** How many bank questions to read before sampling the prompt exclusion list. */
const EXCLUSION_POOL_LIMIT = 500

/**
 * Sample question text already in the bank, to show the model what not to write.
 *
 * Sampled at random rather than taken newest-first: the newest rows are all from
 * the last top-up, so excluding those alone still lets the model reproduce what
 * it wrote a month ago. A random draw covers the whole bucket and varies per
 * call, which pushes successive top-ups toward different corners of the subject.
 *
 * This only biases the model. Questions that come back similar anyway are caught
 * by the dedup pass, which is what actually enforces uniqueness.
 */
export async function getRecentQuestionTexts(
  supabase: ReturnType<typeof import('../../functions/_shared/supabaseClient.ts').createServiceClient>,
  category: string,
  difficulty: string,
  sampleSize: number,
  extraCategories: string[] = []
): Promise<string[]> {
  const allCategories = [category, ...extraCategories]

  const { data, error } = await supabase
    .from('question_bank')
    .select('question_text')
    .in('category', allCategories)
    .eq('difficulty', difficulty)
    .limit(EXCLUSION_POOL_LIMIT)

  if (error) throw new Error(`Failed to get question texts: ${error.message}`)

  const texts = (data ?? []).map(r => r.question_text as string).filter(Boolean)
  if (texts.length <= sampleSize) return texts

  // Partial Fisher-Yates: shuffle only the prefix we intend to return.
  for (let i = 0; i < sampleSize; i++) {
    const j = i + Math.floor(Math.random() * (texts.length - i))
    ;[texts[i], texts[j]] = [texts[j], texts[i]]
  }
  return texts.slice(0, sampleSize)
}

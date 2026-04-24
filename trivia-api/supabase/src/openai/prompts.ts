import type { Category, Difficulty } from '../../supabase/functions/_shared/types.ts'

const CATEGORY_DISPLAY: Record<Category, string> = {
  general_knowledge: 'General Knowledge',
  history: 'History',
  science: 'Science & Nature',
  sports: 'Sports',
  movies_tv: 'Movies & TV',
  geography: 'Geography',
  nfl_football: 'NFL Football',
  roman_history: 'Roman History',
  harry_potter: 'Harry Potter',
  famous_quotes: 'Famous Quotes',
  music: 'Music',
}

const CATEGORY_GUIDANCE: Partial<Record<Category, string>> = {
  general_knowledge: `This is the broadest category — it should feel like a classic pub quiz. Draw equally from history, science & nature, geography, sports, movies & TV, music, food & drink, literature, language, technology, famous people, world records, and everyday culture. No single topic should dominate a batch. Actively vary the subject area with every question.`,
  nfl_football: `Focus on: Super Bowl history, team records, legendary players (quarterbacks, receivers, defenders, coaches), season stats, draft history, rules and gameplay, franchise history, and iconic moments. Cover a wide range of teams and eras — do not overweight any single team or decade. Avoid questions about events after the 2023 season.`,
  roman_history: `Focus on: the Roman Republic and Empire, emperors and their reigns, military campaigns and battles, Roman law and governance, engineering and architecture (aqueducts, roads, Colosseum), religion and mythology, key figures (Caesar, Augustus, Cicero, Hadrian, etc.), the fall of the Western Empire, daily life, and the Senate. Cover a wide range of periods from the founding of Rome to the fall of Constantinople. Avoid ambiguous or debatable questions — all answers must be definitively correct.`,
  famous_quotes: `Every question must follow this exact format: the question text is 'Who said: "[exact quote]"?' and the correct answer is the speaker's full name. The three incorrect options must be plausible alternatives from the same era, field, or nationality — never random unrelated names. Quotes must be verifiably and unambiguously attributed; do not use quotes that are commonly misattributed or of disputed origin. Easy: iconic quotes instantly recognizable to most adults (e.g. moon landing, civil rights speeches, famous scientists). Medium: well-known quotes that require some familiarity with the speaker's life or work. Hard: lesser-known quotes, quotes often confused with other speakers, or quotes requiring knowledge of a specific speech, book, or context. The explanation must name who the person was and the context in which the quote was said. Cover a wide spread of fields per batch: literature, science, politics, philosophy, sports, cinema, and history. Aim for variety across speakers per batch, but the same speaker may appear more than once if they have multiple distinct, well-known quotes worth including.`,
  music: `Cover a wide spread of genres and eras: rock, pop, hip-hop, classical, jazz, country, R&B, electronic, and musical theatre. Include questions about artists, bands, albums, chart hits, music history, instruments, music theory basics, and iconic moments (concerts, albums, collaborations). Easy: globally recognizable artists and songs most adults would know. Medium: deeper album/track knowledge, music history, or genre-specific facts. Hard: deep-cut knowledge, lesser-known facts, specific chart positions, or music theory. Vary artists and genres within each batch — do not over-index on any single decade or genre. Avoid questions about events after 2023.`,
  harry_potter: `Focus on: characters and their relationships, spells and their effects, magical creatures, Hogwarts houses and their traits, classes and teachers, Horcruxes and Deathly Hallows, the Order of the Phoenix, Death Eaters, wand lore, Quidditch rules and matches, key plot events, and magical locations — based strictly on the original 7 books and their direct film adaptations. Cover all 7 books/films proportionally; do not over-index on any single installment. Avoid questions about Pottermore, Fantastic Beasts, or any expanded-universe content not depicted in the original books or films. All answers must be definitively verifiable from the source material.`,
}

const DIFFICULTY_DESCRIPTION: Record<Difficulty, string> = {
  easy: 'common knowledge that most adults would know',
  medium: 'requires some study or general interest in the topic',
  hard: 'specialist knowledge or deep expertise in the topic',
}

export const SYSTEM_PROMPT = `You are an expert trivia question writer for a mobile quiz game. Generate high-quality, factually accurate multiple-choice trivia questions.

Rules:
- Each question must have exactly one definitively correct answer
- The three incorrect options must be plausible but clearly wrong to someone who knows the topic
- Vary question phrasing and structure
- Questions must be factual, not opinion-based
- Avoid questions that could have multiple correct answers
- Avoid questions referencing very recent events (post-2023)
- Avoid profanity, vulgar slang, or crude internet acronyms
- Each explanation should clearly state why the answer is correct in 1-2 sentences`

export function buildUserPrompt(
  category: Category,
  difficulty: Difficulty,
  count: number,
  recentHashSamples: string[] = []
): string {
  const exclusionSection =
    recentHashSamples.length > 0
      ? `\nAvoid questions semantically similar to these recent questions (identified by hash): ${recentHashSamples.slice(0, 20).join(', ')}`
      : ''

  const guidance = CATEGORY_GUIDANCE[category]
    ? `\nCategory guidance: ${CATEGORY_GUIDANCE[category]}`
    : ''

  return `Generate ${count} trivia questions for:
- Category: ${CATEGORY_DISPLAY[category]}
- Difficulty: ${difficulty} (${DIFFICULTY_DESCRIPTION[difficulty]})${guidance}

Return ONLY a JSON array of questions matching the schema. No additional text.${exclusionSection}`
}

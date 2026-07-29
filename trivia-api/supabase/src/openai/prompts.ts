import type { Category, Difficulty } from '../../functions/_shared/types.ts'

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
  odd_one_out: 'Odd One Out',
  video_games: 'Video Games',
}

const CATEGORY_GUIDANCE: Partial<Record<Category, string>> = {
  general_knowledge: `This is the broadest category — it should feel like a classic pub quiz. Draw equally from history, science & nature, geography, sports, movies & TV, music, food & drink, literature, language, technology, famous people, world records, and everyday culture. No single topic should dominate a batch. Actively vary the subject area with every question.`,
  nfl_football: `Focus on: Super Bowl history, team records, legendary players (quarterbacks, receivers, defenders, coaches), season stats, draft history, rules and gameplay, franchise history, and iconic moments. Cover a wide range of teams and eras — do not overweight any single team or decade. Avoid questions about events after the 2023 season.`,
  roman_history: `Focus on: the Roman Republic and Empire, emperors and their reigns, military campaigns and battles, Roman law and governance, engineering and architecture (aqueducts, roads, Colosseum), religion and mythology, key figures (Caesar, Augustus, Cicero, Hadrian, etc.), the fall of the Western Empire, daily life, and the Senate. Cover a wide range of periods from the founding of Rome to the fall of Constantinople. Avoid ambiguous or debatable questions — all answers must be definitively correct.`,
  famous_quotes: `Every question must follow this exact format: the question text is 'Who said: "[exact quote]"?' and the correct answer is the speaker's full name. The three incorrect options must be plausible alternatives from the same era, field, or nationality — never random unrelated names. Quotes must be verifiably and unambiguously attributed; do not use quotes that are commonly misattributed or of disputed origin. Easy: iconic quotes instantly recognizable to most adults (e.g. moon landing, civil rights speeches, famous scientists). Medium: well-known quotes that require some familiarity with the speaker's life or work. Hard: lesser-known quotes, quotes often confused with other speakers, or quotes requiring knowledge of a specific speech, book, or context. The explanation must name who the person was and the context in which the quote was said. Cover a wide spread of fields per batch: literature, science, politics, philosophy, sports, cinema, and history. Aim for variety across speakers per batch, but the same speaker may appear more than once if they have multiple distinct, well-known quotes worth including.`,
  music: `Cover a wide spread of genres and eras: rock, pop, hip-hop, classical, jazz, country, R&B, electronic, and musical theatre. Include questions about artists, bands, albums, chart hits, music history, instruments, music theory basics, and iconic moments (concerts, albums, collaborations). Easy: globally recognizable artists and songs most adults would know. Medium: deeper album/track knowledge, music history, or genre-specific facts. Hard: deep-cut knowledge, lesser-known facts, specific chart positions, or music theory. Vary artists and genres within each batch — do not over-index on any single decade or genre. Avoid questions about events after 2023.`,
  odd_one_out: `Every question must be an Odd One Out puzzle. The question text should ask the player to pick the item that does not belong, without revealing the grouping. The four options must be short item names. Exactly three options must share one clear, factual category or property, and exactly one option must not share it. The odd item must be unambiguous, not subjective, and not based on a trick distinction. Avoid sets where another option could reasonably be considered odd for a different reason. Easy: familiar everyday, geography, science, sports, entertainment, or history groupings. Medium: requires general knowledge of the shared property. Hard: requires more specific knowledge, but still has one definitive answer. The explanation must identify the three-item grouping and state why the correct option does not fit.`,
  harry_potter: `Focus on: characters and their relationships, spells and their effects, magical creatures, Hogwarts houses and their traits, classes and teachers, Horcruxes and Deathly Hallows, the Order of the Phoenix, Death Eaters, wand lore, Quidditch rules and matches, key plot events, and magical locations — based strictly on the original 7 books and their direct film adaptations. Cover all 7 books/films proportionally; do not over-index on any single installment. Avoid questions about Pottermore, Fantastic Beasts, or any expanded-universe content not depicted in the original books or films. All answers must be definitively verifiable from the source material.`,
  video_games: `Cover a wide spread of eras and platforms: arcade and 8/16-bit classics, the 3D era, and modern console/PC/mobile titles. Include questions about landmark games and series, characters, developers and studios, publishers, consoles and hardware, release years, in-game locations and items, and industry milestones. Easy: globally famous games and characters most people would recognize (Mario, Tetris, Minecraft, Pokémon). Medium: series knowledge, notable developers, or platform history. Hard: deep-cut entries, specific release details, or development trivia. Vary franchises and platforms within each batch — do not over-index on any single publisher, console generation, or series. Prefer facts that are stable rather than live service content that changes patch to patch, and avoid questions about releases after 2023.`,
}

const DIFFICULTY_DESCRIPTION: Record<Difficulty, string> = {
  easy: 'common knowledge that most adults would know',
  medium: 'requires some study or general interest in the topic',
  hard: 'specialist knowledge or deep expertise in the topic',
  // 'boss' is in the Difficulty union but not yet in DIFFICULTIES, so nothing
  // generates it today. The record is total over the union so that whenever it
  // is switched on, the prompt says something rather than 'boss (undefined)'.
  boss: 'expert-level, the hardest questions in the category — should challenge someone who knows the subject well',
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

/** Cap on how many existing questions to quote back, to bound prompt size. */
export const MAX_EXCLUSIONS = 40

export function buildUserPrompt(
  category: Category,
  difficulty: Difficulty,
  count: number,
  existingQuestions: string[] = []
): string {
  // This list used to be truncated SHA-256 hashes, which no model can read back
  // into content — the instruction to avoid "semantically similar" questions was
  // a no-op that cost tokens. It has to be the question text to mean anything.
  const exclusionSection =
    existingQuestions.length > 0
      ? `\n\nThe question bank already contains the questions below. Do not write a question that tests the same fact as any of them, even if worded differently or asked from the opposite direction. Pick different subject matter.\n${existingQuestions
          .slice(0, MAX_EXCLUSIONS)
          .map(q => `- ${q}`)
          .join('\n')}`
      : ''

  const guidance = CATEGORY_GUIDANCE[category]
    ? `\nCategory guidance: ${CATEGORY_GUIDANCE[category]}`
    : ''

  const categoryLabel = category === 'odd_one_out' ? 'Odd One Out puzzles' : 'trivia questions'

  return `Generate ${count} ${categoryLabel} for:
- Category: ${CATEGORY_DISPLAY[category]}
- Difficulty: ${difficulty} (${DIFFICULTY_DESCRIPTION[difficulty]})${guidance}${exclusionSection}

Return ONLY a JSON array of questions matching the schema. No additional text.`
}

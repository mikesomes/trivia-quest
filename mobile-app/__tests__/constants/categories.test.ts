import { CATEGORIES } from '../../src/constants/categories'

const byId = (id: string) => CATEGORIES.find((c) => c.id === id)
const playable = CATEGORIES.filter((c) => !c.comingSoon && !c.modeOnly)

describe('category metadata', () => {
  it('has unique ids', () => {
    expect(new Set(CATEGORIES.map((c) => c.id)).size).toBe(CATEGORIES.length)
  })

  it('gives every category a label, description and colour', () => {
    for (const category of CATEGORIES) {
      expect(category.label).toBeTruthy()
      expect(category.description).toBeTruthy()
      expect(category.color).toMatch(/^#[0-9A-Fa-f]{6}$/)
    }
  })

  // The comingSoon flag is what the category picker, the blitz picker and the
  // leaderboard chips all key off. If it is dropped for any of these, the
  // category becomes tappable again and create-round will reject the request —
  // each is out of CATEGORIES server-side and its questions are deactivated
  // (migrations 20240068, 20240069).
  it.each(['nfl_football', 'roman_history', 'harry_potter'])(
    'keeps %s flagged as coming soon',
    (id) => {
      const category = byId(id)
      expect(category).toBeDefined()
      expect(category?.comingSoon).toBe(true)
      expect(playable.map((c) => c.id)).not.toContain(id)
    }
  )

  // Seeded from Open Trivia DB category 15 rather than the generator, so it
  // ships playable from the start — see migration 20240070.
  it('offers video games as a playable category', () => {
    const category = byId('video_games')
    expect(category).toBeDefined()
    expect(category?.comingSoon).toBeUndefined()
    expect(category?.modeOnly).toBeUndefined()
    expect(playable.map((c) => c.id)).toContain('video_games')
  })

  it('groups the coming-soon categories after the playable ones', () => {
    const firstComingSoon = CATEGORIES.findIndex((c) => c.comingSoon)
    const lastPlayable = CATEGORIES.map((c) => Boolean(c.comingSoon)).lastIndexOf(false)
    expect(firstComingSoon).toBeGreaterThan(lastPlayable)
  })

  it('still offers a playable set', () => {
    expect(playable.length).toBeGreaterThan(0)
  })
})

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
  // leaderboard chips all key off. If it is dropped here, NFL becomes tappable
  // again and create-round will reject the request — the category is out of
  // CATEGORIES server-side and its questions are deactivated.
  it('keeps NFL Football flagged as coming soon', () => {
    const nfl = byId('nfl_football')
    expect(nfl).toBeDefined()
    expect(nfl?.comingSoon).toBe(true)
    expect(playable.map((c) => c.id)).not.toContain('nfl_football')
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

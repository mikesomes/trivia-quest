import { getRankMovement } from '../../src/utils/leaderboard'

describe('getRankMovement', () => {
  it('reports "new" when there is no previous rank', () => {
    expect(getRankMovement(5, undefined)).toEqual({ direction: 'new', delta: 0 })
    expect(getRankMovement(5, null)).toEqual({ direction: 'new', delta: 0 })
  })

  it('reports "up" when the rank number decreased (climbed the board)', () => {
    expect(getRankMovement(3, 7)).toEqual({ direction: 'up', delta: 4 })
  })

  it('reports "down" when the rank number increased (slid down the board)', () => {
    expect(getRankMovement(10, 4)).toEqual({ direction: 'down', delta: 6 })
  })

  it('reports "same" when the rank is unchanged', () => {
    expect(getRankMovement(2, 2)).toEqual({ direction: 'same', delta: 0 })
  })

  it('treats rank 1 as the biggest possible climb correctly', () => {
    expect(getRankMovement(1, 50)).toEqual({ direction: 'up', delta: 49 })
  })
})

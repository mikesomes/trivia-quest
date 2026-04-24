import { profileApi, normalizeUserProfile } from '../../src/api/profile'
import { apiGet } from '../../src/api/client'

jest.mock('../../src/api/client', () => ({
  apiGet: jest.fn(),
  apiPost: jest.fn(),
}))

const mockedApiGet = apiGet as jest.MockedFunction<typeof apiGet>

describe('normalizeUserProfile', () => {
  it('fills missing numeric fields with safe defaults', () => {
    expect(
      normalizeUserProfile({
        id: 'user-1',
        displayName: 'Alex',
        xp: 250,
        bestXp: undefined,
        totalGames: undefined,
        totalCorrect: undefined,
        accuracy: undefined,
      })
    ).toMatchObject({
      id: 'user-1',
      displayName: 'Alex',
      bestXp: 0,
      totalGames: 0,
      totalCorrect: 0,
      accuracy: 0,
    })
  })

  it('coerces numeric strings from the API', () => {
    expect(
      normalizeUserProfile({
        xp: '138' as unknown as number,
        xpToNextLevel: '197' as unknown as number,
        bestXp: '420' as unknown as number,
        totalGames: '12' as unknown as number,
        totalCorrect: '87' as unknown as number,
        accuracy: '0.75' as unknown as number,
      })
    ).toMatchObject({
      level: 2,
      xp: 138,
      xpToNextLevel: 197,
      bestXp: 420,
      totalGames: 12,
      totalCorrect: 87,
      accuracy: 0.75,
    })
  })
})

describe('profileApi.get', () => {
  it('returns a normalized profile payload', async () => {
    mockedApiGet.mockResolvedValueOnce({
      id: 'user-2',
      displayName: 'Morgan',
      isAnonymous: false,
      xp: 500,
      bestXp: undefined,
      totalGames: 3,
      totalCorrect: 21,
      createdAt: '2026-04-18T00:00:00.000Z',
    } as Partial<ReturnType<typeof normalizeUserProfile>>)

    await expect(profileApi.get()).resolves.toMatchObject({
      id: 'user-2',
      displayName: 'Morgan',
      bestXp: 0,
      totalGames: 3,
      totalCorrect: 21,
      xp: 500,
    })
  })
})

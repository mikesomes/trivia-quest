import {
  answerRevealMessage,
  livesMessage,
  streakMessage,
  timerMessage,
} from '../../src/lib/a11y'

describe('answerRevealMessage', () => {
  it('leads with the outcome', () => {
    expect(answerRevealMessage({ isCorrect: true })).toBe('Correct.')
    expect(answerRevealMessage({ isCorrect: false })).toBe('Incorrect.')
  })

  it('reads out the right answer only when the player got it wrong', () => {
    expect(
      answerRevealMessage({ isCorrect: false, correctAnswerText: 'Lisbon' })
    ).toBe('Incorrect. The answer was Lisbon.')

    expect(
      answerRevealMessage({ isCorrect: true, correctAnswerText: 'Lisbon' })
    ).toBe('Correct.')
  })

  it('appends XP when some was earned', () => {
    expect(answerRevealMessage({ isCorrect: true, xpEarned: 120 })).toBe(
      'Correct. 120 XP earned.'
    )
  })

  it('omits XP when none was earned', () => {
    expect(answerRevealMessage({ isCorrect: true, xpEarned: 0 })).toBe('Correct.')
  })

  it('combines a wrong answer with its XP', () => {
    expect(
      answerRevealMessage({ isCorrect: false, correctAnswerText: 'Mercury', xpEarned: 5 })
    ).toBe('Incorrect. The answer was Mercury. 5 XP earned.')
  })
})

describe('count phrasing', () => {
  it('singularizes one life', () => {
    expect(livesMessage(1)).toBe('1 life remaining')
    expect(livesMessage(3)).toBe('3 lives remaining')
    expect(livesMessage(0)).toBe('0 lives remaining')
  })

  it('singularizes one second', () => {
    expect(timerMessage(1)).toBe('1 second left')
    expect(timerMessage(12)).toBe('12 seconds left')
  })

  it('describes the streak', () => {
    expect(streakMessage(5)).toBe('5 answer streak')
  })
})

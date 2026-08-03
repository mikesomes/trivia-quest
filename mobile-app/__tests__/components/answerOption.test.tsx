import React from 'react'
import { render, fireEvent, screen } from '@testing-library/react-native'
import { AnswerOption } from '../../src/components/game/AnswerOption'

jest.mock('../../src/hooks/useReducedMotion', () => ({
  useReducedMotion: () => false,
}))

jest.mock('../../src/lib/haptics', () => ({
  haptics: {
    optionPress: jest.fn(),
    correctAnswer: jest.fn(),
    wrongAnswer: jest.fn(),
    eliminationImpact: jest.fn(),
  },
}))

const { haptics } = jest.requireMock('../../src/lib/haptics')

type Props = React.ComponentProps<typeof AnswerOption>

function renderOption(props: Partial<Props> = {}) {
  const onPress = jest.fn()
  render(
    <AnswerOption
      option="a"
      text="Paris"
      onPress={onPress}
      answerState="idle"
      selectedOption={null}
      {...props}
    />
  )
  return { onPress, node: screen.getByRole('button') }
}

beforeEach(() => {
  jest.clearAllMocks()
  // The elimination effect schedules a native-driver Animated sequence behind a
  // timeout. With real timers it can fire after the test has unmounted and blow
  // up inside the renderer; nothing asserted here needs it to actually run.
  jest.useFakeTimers()
})

afterEach(() => {
  jest.useRealTimers()
})

// Sighted players read correct/wrong from the green or red fill and the
// pop/shake. Screen reader users get nothing from either, so the outcome has to
// survive in the accessible name and state — this is what the move from
// TouchableWithoutFeedback to AnimatedPressable could quietly have dropped.
describe('accessibility contract', () => {
  it('names itself with the option letter and the answer text', () => {
    const { node } = renderOption()
    expect(node.props.accessibilityLabel).toBe('Option A. Paris')
  })

  it('says nothing about status while untouched', () => {
    const { node } = renderOption()
    expect(node.props.accessibilityValue).toEqual({ text: '' })
    expect(node.props.accessibilityState).toMatchObject({ selected: false, disabled: false })
  })

  it('announces the lock-in while the submit is in flight', () => {
    const { node } = renderOption({ answerState: 'pending', selectedOption: 'a' })
    expect(node.props.accessibilityValue).toEqual({ text: 'Selected, submitting' })
    expect(node.props.accessibilityState).toMatchObject({ selected: true, disabled: true })
  })

  it('announces the correct answer on reveal', () => {
    const { node } = renderOption({ answerState: 'revealed', selectedOption: 'a', correctOption: 'a' })
    expect(node.props.accessibilityValue).toEqual({ text: 'Correct answer' })
  })

  it("announces the player's own wrong answer", () => {
    const { node } = renderOption({ answerState: 'revealed', selectedOption: 'a', correctOption: 'b' })
    expect(node.props.accessibilityValue).toEqual({ text: 'Your answer, incorrect' })
  })

  it('stays silent on an option that was neither picked nor correct', () => {
    const { node } = renderOption({ answerState: 'revealed', selectedOption: 'b', correctOption: 'b' })
    expect(node.props.accessibilityValue).toEqual({ text: '' })
  })

  it('announces elimination', () => {
    const { node } = renderOption({ eliminated: true })
    expect(node.props.accessibilityValue).toEqual({ text: 'Eliminated' })
    expect(node.props.accessibilityState).toMatchObject({ disabled: true })
  })
})

describe('press handling', () => {
  it('reports the tapped option and fires the press haptic while idle', () => {
    const { onPress, node } = renderOption()

    fireEvent(node, 'pressIn')
    fireEvent.press(node)

    expect(haptics.optionPress).toHaveBeenCalledTimes(1)
    expect(onPress).toHaveBeenCalledWith('a')
  })

  it('ignores taps once an answer is already in flight', () => {
    const { onPress, node } = renderOption({ answerState: 'pending', selectedOption: 'b' })
    fireEvent.press(node)
    expect(onPress).not.toHaveBeenCalled()
  })

  it('ignores taps on an eliminated option', () => {
    const { onPress, node } = renderOption({ eliminated: true })
    fireEvent.press(node)
    expect(onPress).not.toHaveBeenCalled()
  })

  it('ignores taps when explicitly disabled', () => {
    const { onPress, node } = renderOption({ disabled: true })
    fireEvent.press(node)
    expect(onPress).not.toHaveBeenCalled()
  })
})

describe('render cost', () => {
  // The play screen re-renders on every timer tick; without this the question
  // and all four options re-rendered ten times a second.
  it('is memoized', () => {
    expect((AnswerOption as unknown as { $$typeof: symbol }).$$typeof).toBe(Symbol.for('react.memo'))
  })
})

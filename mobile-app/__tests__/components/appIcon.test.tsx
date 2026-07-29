import React from 'react'
import { render } from '@testing-library/react-native'
import { AppIcon } from '../../src/components/ui/AppIcon'
import {
  ICONS,
  achievementIconName,
  categoryIconName,
  type IconName,
} from '../../src/components/ui/iconRegistry'
import { CATEGORIES } from '../../src/constants/categories'

const names = Object.keys(ICONS) as IconName[]

describe('icon registry', () => {
  it('gives every entry a mark, a weight, and a color', () => {
    for (const name of names) {
      const spec = ICONS[name]
      expect(spec.mark).toBeTruthy()
      expect(typeof spec.weight).toBe('string')
      expect(typeof spec.color).toBe('string')
    }
  })

  it('renders every registered icon without throwing', () => {
    for (const name of names) {
      expect(() => render(<AppIcon name={name} />)).not.toThrow()
    }
  })

  it('maps every shipped category to a registered mark', () => {
    for (const category of CATEGORIES) {
      expect(ICONS[categoryIconName(category.id)]).toBeDefined()
    }
  })

  // The loop above is satisfied by the fallback, so it would still pass if the
  // mapping were dropped. This pins that video_games has a mark of its own.
  it('gives video games a dedicated mark rather than the fallback', () => {
    expect(categoryIconName('video_games')).toBe('videoGames')
    expect(ICONS.videoGames).toBeDefined()
  })

  it('falls back for ids the client does not know about', () => {
    // New categories and achievements can appear server-side before the client
    // ships a mapping — they must still render something.
    expect(categoryIconName('a_category_added_later')).toBe('trivia')
    expect(achievementIconName('an_achievement_added_later')).toBe('achievement')
  })

  it('derives category-mastery achievements from the category mark', () => {
    expect(achievementIconName('category_master_history')).toBe(categoryIconName('history'))
    expect(achievementIconName('category_master_science')).toBe('science')
  })
})

describe('AppIcon accessibility', () => {
  it('exposes a label when the icon carries its own meaning', () => {
    const { getByLabelText } = render(<AppIcon name="streak" label="Day streak" />)
    expect(getByLabelText('Day streak')).toBeTruthy()
  })

  it('hides decorative icons from screen readers', () => {
    const { queryByTestId } = render(<AppIcon name="streak" testID="mark" />)

    // Testing Library skips accessibility-hidden nodes by default, so a
    // decorative icon being unreachable here is the assertion — it is drawn,
    // but a screen reader never announces it.
    expect(queryByTestId('mark')).toBeNull()

    const node = queryByTestId('mark', { includeHiddenElements: true })
    expect(node).not.toBeNull()
    expect(node!.props.accessibilityElementsHidden).toBe(true)
    expect(node!.props.importantForAccessibility).toBe('no-hide-descendants')
  })
})

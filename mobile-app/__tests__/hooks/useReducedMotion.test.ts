import { renderHook, act, waitFor } from '@testing-library/react-native'
import { AccessibilityInfo } from 'react-native'
import { useReducedMotion } from '../../src/hooks/useReducedMotion'

describe('useReducedMotion', () => {
  let listener: ((enabled: boolean) => void) | undefined
  const remove = jest.fn()

  beforeEach(() => {
    listener = undefined
    remove.mockClear()
    jest
      .spyOn(AccessibilityInfo, 'addEventListener')
      .mockImplementation((event: string, handler: any) => {
        if (event === 'reduceMotionChanged') listener = handler
        return { remove } as any
      })
  })

  afterEach(() => jest.restoreAllMocks())

  it('defaults to false before the system value resolves', () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockReturnValue(new Promise(() => {}))
    const { result } = renderHook(() => useReducedMotion())
    expect(result.current).toBe(false)
  })

  it('adopts the initial system value', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true)
    const { result } = renderHook(() => useReducedMotion())
    await waitFor(() => expect(result.current).toBe(true))
  })

  it('tracks changes made while the app is running', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false)
    const { result } = renderHook(() => useReducedMotion())
    await waitFor(() => expect(result.current).toBe(false))

    act(() => listener?.(true))
    expect(result.current).toBe(true)

    act(() => listener?.(false))
    expect(result.current).toBe(false)
  })

  it('stays false when the system query rejects', async () => {
    jest
      .spyOn(AccessibilityInfo, 'isReduceMotionEnabled')
      .mockRejectedValue(new Error('unsupported'))
    const { result } = renderHook(() => useReducedMotion())
    await waitFor(() => expect(result.current).toBe(false))
  })

  it('unsubscribes on unmount', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false)
    const { unmount } = renderHook(() => useReducedMotion())
    unmount()
    expect(remove).toHaveBeenCalled()
  })
})

/** Only a successful transition from zero stars to a clear earns node loot. */
export function isFirstClearRewardEligible(passed: boolean, previousStars: number): boolean {
  return passed && previousStars === 0
}

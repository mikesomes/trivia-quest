// GPT-5 reasoning models accept only their default sampling temperature.
export function usesDefaultTemperatureOnly(model: string): boolean {
  return /^gpt-5(?:[.-]|$)/.test(model)
}

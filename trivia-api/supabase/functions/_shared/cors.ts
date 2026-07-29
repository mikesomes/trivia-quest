// Read through globalThis so importing this module does not throw under Node.
// It executes at import time, and _shared/errors.ts pulls it in, so a bare
// `Deno.env` here made every module that reports an error untestable from the
// test runner. Identical behaviour in Deno, where globalThis.Deno is defined.
const denoGlobal = (globalThis as { Deno?: { env: { get(key: string): string | undefined } } }).Deno
const allowedOrigin = denoGlobal?.env.get('APP_ORIGIN') ?? '*'

export const corsHeaders = {
  'Access-Control-Allow-Origin': allowedOrigin,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
}

export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }
  return null
}

type LogLevel = 'info' | 'warn' | 'error'

interface LogEntry {
  level: LogLevel
  fn: string
  msg: string
  requestId?: string
  userId?: string
  durationMs?: number
  [key: string]: unknown
}

function log(entry: LogEntry): void {
  // Supabase Edge Function logs are captured as stdout
  console.log(JSON.stringify({ ts: new Date().toISOString(), ...entry }))
}

export function makeLogger(fn: string, requestId?: string, userId?: string) {
  return {
    info: (msg: string, extra?: Record<string, unknown>) =>
      log({ level: 'info', fn, msg, requestId, userId, ...extra }),

    warn: (msg: string, extra?: Record<string, unknown>) =>
      log({ level: 'warn', fn, msg, requestId, userId, ...extra }),

    error: (msg: string, extra?: Record<string, unknown>) =>
      log({ level: 'error', fn, msg, requestId, userId, ...extra }),

    timed: (msg: string, startMs: number, extra?: Record<string, unknown>) =>
      log({ level: 'info', fn, msg, requestId, userId, durationMs: Date.now() - startMs, ...extra }),
  }
}

/** Extract a request ID from headers (set by Supabase gateway) or generate one. */
export function getRequestId(req: Request): string {
  return req.headers.get('x-request-id') ?? crypto.randomUUID().slice(0, 8)
}

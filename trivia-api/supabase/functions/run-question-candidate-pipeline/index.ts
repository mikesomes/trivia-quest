import { handleCors } from '../_shared/cors.ts'
import { createServiceClient } from '../_shared/supabaseClient.ts'
import { errorResponse, jsonResponse } from '../_shared/errors.ts'
import { parseBody } from '../_shared/validation.ts'
import type { PipelineTarget } from '../../src/questions/pipeline.ts'
import { parsePipelineTargets, parseTargets } from '../../src/questions/pipeline.ts'

function isAuthorized(req: Request): boolean {
  const authorization = req.headers.get('Authorization')
  const cronSecret = Deno.env.get('CRON_SECRET')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  return Boolean(
    (cronSecret && authorization === `Bearer ${cronSecret}`) ||
    (serviceRoleKey && authorization === `Bearer ${serviceRoleKey}`),
  )
}

async function invokeStage(name: string, secret: string, body: Record<string, unknown>): Promise<Record<string, unknown>> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  if (!supabaseUrl) throw new Error('Missing SUPABASE_URL')

  const response = await fetch(`${supabaseUrl}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  const payload = await response.json().catch(() => ({})) as Record<string, unknown>
  if (!response.ok) throw new Error(`${name} returned ${response.status}: ${String(payload.error ?? 'unknown error')}`)
  return payload
}

function requiredSecret(name: string): string {
  const value = Deno.env.get(name)
  if (!value) throw new Error(`Missing ${name}`)
  return value
}

Deno.serve(async (req) => {
  const corsResult = handleCors(req)
  if (corsResult) return corsResult
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405)
  if (!isAuthorized(req)) return errorResponse('Unauthorized', 401)

  const body = await parseBody<{ targets?: unknown }>(req)
  if (body instanceof Response) return body

  let targets: PipelineTarget[]
  try {
    targets = body.targets === undefined
      ? parsePipelineTargets(Deno.env.get('AI_PIPELINE_TARGETS'))
      : parseTargets(body.targets)
  } catch (error) {
    return errorResponse(error instanceof Error ? error.message : 'Invalid pipeline targets', 400)
  }

  const db = createServiceClient()
  const { data: runId, error: startError } = await db.rpc('start_question_candidate_pipeline_run', {
    p_targets: targets,
  })
  if (startError) return errorResponse(`Could not start pipeline run: ${startError.message}`, 500)
  if (!runId) return jsonResponse({ status: 'skipped', reason: 'A question-candidate pipeline run is already in progress' })

  const results: Array<Record<string, unknown>> = []
  let status: 'succeeded' | 'partial' | 'failed' = 'succeeded'

  try {
    const cronSecret = requiredSecret('CRON_SECRET')
    const blindReviewSecret = requiredSecret('AI_REVIEW_SECRET')
    const verificationSecret = requiredSecret('AI_VERIFY_SECRET')
    const editorialSecret = requiredSecret('AI_EDITORIAL_SECRET')
    const promotionSecret = requiredSecret('CANDIDATE_PROMOTION_SECRET')

    for (const target of targets) {
      const generated = await invokeStage('generate-questions', cronSecret, target)
      const staged = typeof generated.staged === 'number' ? generated.staged : 0
      const generationBatchId = typeof generated.generationBatchId === 'string' ? generated.generationBatchId : null
      const targetResult: Record<string, unknown> = { target, generated }

      if (!generationBatchId || staged === 0) {
        status = 'partial'
        targetResult.error = 'Generation returned no staged candidates or batch identifier'
        results.push(targetResult)
        continue
      }

      const scopedBody = { limit: staged, generationBatchId }
      targetResult.blindReview = await invokeStage('run-ai-blind-review', blindReviewSecret, scopedBody)
      targetResult.factVerification = await invokeStage('run-ai-fact-verification', verificationSecret, scopedBody)
      targetResult.editorialReview = await invokeStage('run-ai-editorial-review', editorialSecret, scopedBody)
      targetResult.promotion = await invokeStage('promote-approved-candidates', promotionSecret, scopedBody)
      results.push(targetResult)
    }

    if (results.some(result => 'error' in result)) status = 'partial'
  } catch (error) {
    status = results.length === 0 ? 'failed' : 'partial'
    results.push({ error: error instanceof Error ? error.message : String(error) })
  }

  const { error: finishError } = await db
    .from('question_candidate_pipeline_runs')
    .update({ status, finished_at: new Date().toISOString(), results })
    .eq('id', runId)
  if (finishError) return errorResponse(`Pipeline ran but could not record its result: ${finishError.message}`, 500)

  return jsonResponse({ runId, status, results }, status === 'failed' ? 500 : 200)
})

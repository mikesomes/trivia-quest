import { handleCors } from '../_shared/cors.ts'
import { createServiceClient } from '../_shared/supabaseClient.ts'
import { createOpenAIClient } from '../_shared/openaiClient.ts'
import { errorResponse, jsonResponse } from '../_shared/errors.ts'
import { parseBody } from '../_shared/validation.ts'
import { blindReviewQuestion, makeBlindReviewPatch } from '../../src/openai/blindReviewer.ts'

const MAX_BATCH_SIZE = 10

function isServiceCall(req: Request): boolean {
  const authHeader = req.headers.get('Authorization')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const reviewSecret = Deno.env.get('AI_REVIEW_SECRET')
  return Boolean(
    (serviceKey && authHeader === `Bearer ${serviceKey}`) ||
    (reviewSecret && authHeader === `Bearer ${reviewSecret}`),
  )
}

Deno.serve(async (req) => {
  const corsResult = handleCors(req)
  if (corsResult) return corsResult
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405)
  if (!isServiceCall(req)) return errorResponse('Unauthorized', 401)

  const body = await parseBody<{ limit?: unknown }>(req)
  if (body instanceof Response) return body
  const limit = typeof body.limit === 'number' && Number.isInteger(body.limit)
    ? Math.min(Math.max(body.limit, 1), MAX_BATCH_SIZE)
    : MAX_BATCH_SIZE

  const supabase = createServiceClient()
  const { data: candidates, error } = await supabase
    .from('question_candidates')
    // Deliberately excludes correct_answer, explanation, and correct_answer_index
    // from the model-bound payload below. The index remains server-side only.
    .select('id, category, question_text, choices, correct_answer_index')
    .in('editorial_status', ['pending', 'revise'])
    .is('blind_reviewed_at', null)
    .order('created_at', { ascending: true })
    .limit(limit)
  if (error) return errorResponse(`Failed to load candidates: ${error.message}`, 500)

  const openai = createOpenAIClient()
  const reviewerModel = Deno.env.get('AI_BLIND_REVIEW_MODEL') || Deno.env.get('OPENAI_MODEL') || 'gpt-4o-mini'
  const results: Array<{ candidateId: string; reviewed: boolean; blindReviewMatches?: boolean; error?: string }> = []

  for (const candidate of candidates ?? []) {
    try {
      const result = await blindReviewQuestion(
        {
          id: candidate.id,
          category: candidate.category,
          question_text: candidate.question_text,
          choices: candidate.choices,
          correct_answer_index: candidate.correct_answer_index,
        },
        (params) => openai.chat({ ...params, model: reviewerModel }),
      )
      const patch = makeBlindReviewPatch(result, candidate.correct_answer_index)
      const { error: updateError } = await supabase
        .from('question_candidates')
        .update({ ...patch, blind_reviewer_model: reviewerModel, blind_reviewed_at: new Date().toISOString() })
        .eq('id', candidate.id)
        .is('blind_reviewed_at', null)
      if (updateError) throw new Error(updateError.message)
      results.push({ candidateId: candidate.id, reviewed: true, blindReviewMatches: patch.blind_review_matches })
    } catch (reviewError) {
      results.push({ candidateId: candidate.id, reviewed: false, error: String(reviewError) })
    }
  }

  return jsonResponse({ reviewed: results.filter(result => result.reviewed).length, results })
})

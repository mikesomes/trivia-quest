import { handleCors } from '../_shared/cors.ts'
import { createServiceClient } from '../_shared/supabaseClient.ts'
import { createOpenAIClient } from '../_shared/openaiClient.ts'
import { errorResponse, jsonResponse } from '../_shared/errors.ts'
import { isValidUUID, parseBody } from '../_shared/validation.ts'
import { EDITORIAL_SCHEMA, editorialPrompt, enforceEditorialGuardrails, parseEditorial } from '../../src/openai/editorialReviewer.ts'
const MAX = 10
Deno.serve(async req => {
  const cors = handleCors(req); if (cors) return cors
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405)
  const secret = Deno.env.get('AI_EDITORIAL_SECRET'); if (!secret || req.headers.get('Authorization') !== `Bearer ${secret}`) return errorResponse('Unauthorized', 401)
  const body = await parseBody<{ limit?: unknown; generationBatchId?: unknown }>(req); if (body instanceof Response) return body
  if (body.generationBatchId !== undefined && !isValidUUID(body.generationBatchId)) return errorResponse('generationBatchId must be a UUID', 400)
  const limit = typeof body.limit === 'number' && Number.isInteger(body.limit) ? Math.min(Math.max(body.limit, 1), MAX) : MAX
  const db = createServiceClient(); let query = db.from('question_candidates').select('id,question_text,choices,correct_answer,explanation,difficulty_rating,blind_review_answer_index,blind_review_matches,reviewer_confidence,blind_reviewer_notes,verification_status,verification_source,verification_notes').in('editorial_status', ['pending', 'revise']).is('editorial_reviewed_at', null).not('blind_reviewed_at', 'is', null).not('verified_at', 'is', null).order('created_at').limit(limit)
  if (body.generationBatchId) query = query.eq('generation_batch_id', body.generationBatchId)
  const { data: candidates, error } = await query
  if (error) return errorResponse(error.message, 500)
  const ai = createOpenAIClient(); const model = Deno.env.get('AI_EDITORIAL_MODEL') || 'gpt-5.5'; const results: unknown[] = []
  for (const candidate of candidates ?? []) try {
    const raw = await ai.chat({ model, systemPrompt: 'Return only the requested structured editorial decision.', userPrompt: editorialPrompt(candidate), jsonSchema: EDITORIAL_SCHEMA, schemaName: 'trivia_editorial_review' })
    const result = enforceEditorialGuardrails(parseEditorial(raw), candidate.verification_status)
    const { error: updateError } = await db.from('question_candidates').update({ editorial_status: result.editorial_status, reviewer_confidence: result.confidence, reviewer_notes: result.notes, editorial_reviewer_model: model, editorial_reviewed_at: new Date().toISOString(), reviewed_at: new Date().toISOString() }).eq('id', candidate.id).is('editorial_reviewed_at', null)
    if (updateError) throw updateError; results.push({ candidateId: candidate.id, status: result.editorial_status })
  } catch (e) { results.push({ candidateId: candidate.id, status: 'error', error: String(e) }) }
  return jsonResponse({ processed: results.length, results })
})

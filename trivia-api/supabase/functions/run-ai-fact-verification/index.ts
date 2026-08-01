import { handleCors } from '../_shared/cors.ts'
import { createServiceClient } from '../_shared/supabaseClient.ts'
import { createOpenAIClient } from '../_shared/openaiClient.ts'
import { errorResponse, jsonResponse } from '../_shared/errors.ts'
import { parseBody } from '../_shared/validation.ts'
import { FACT_VERIFICATION_SCHEMA, parseFactVerification, verificationPrompt } from '../../src/openai/factVerifier.ts'
const MAX = 5
Deno.serve(async req => {
  const cors = handleCors(req); if (cors) return cors
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405)
  const secret = Deno.env.get('AI_VERIFY_SECRET'); if (!secret || req.headers.get('Authorization') !== `Bearer ${secret}`) return errorResponse('Unauthorized', 401)
  const body = await parseBody<{ limit?: unknown }>(req); if (body instanceof Response) return body
  const limit = typeof body.limit === 'number' && Number.isInteger(body.limit) ? Math.min(Math.max(body.limit, 1), MAX) : MAX
  const db = createServiceClient(); const { data: candidates, error } = await db.from('question_candidates').select('id,question_text,choices,correct_answer,explanation').in('editorial_status', ['pending', 'revise']).eq('verification_status', 'unverified').is('verified_at', null).order('created_at').limit(limit)
  if (error) return errorResponse(error.message, 500)
  const ai = createOpenAIClient(); const model = Deno.env.get('AI_VERIFICATION_MODEL') || 'gpt-5.5'; const results: unknown[] = []
  for (const candidate of candidates ?? []) try {
    const response = await ai.webVerify({ model, instructions: 'You are a conservative trivia fact verifier. Use web search before deciding. Return only the requested structured result.', input: verificationPrompt(candidate), jsonSchema: FACT_VERIFICATION_SCHEMA, schemaName: 'trivia_fact_verification' })
    const result = parseFactVerification(response.outputText, response.sourceUrls)
    const { error: updateError } = await db.from('question_candidates').update({ verification_status: result.status, verification_source: result.source_url, verification_notes: result.notes, verification_model: model, verified_at: new Date().toISOString() }).eq('id', candidate.id).is('verified_at', null)
    if (updateError) throw updateError; results.push({ candidateId: candidate.id, verified: result.status })
  } catch (e) { results.push({ candidateId: candidate.id, verified: false, error: String(e) }) }
  return jsonResponse({ processed: results.length, results })
})

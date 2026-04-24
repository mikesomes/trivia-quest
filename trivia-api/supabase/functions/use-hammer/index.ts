import { handleCors } from '../_shared/cors.ts'
import { requireAuth, isAuthError } from '../_shared/auth.ts'
import { createServiceClient } from '../_shared/supabaseClient.ts'
import { errorResponse, jsonResponse } from '../_shared/errors.ts'
import { isValidUUID, parseBody } from '../_shared/validation.ts'
import type { AnswerOption } from '../_shared/types.ts'

interface UseHammerBody {
  roundId?: unknown
  questionId?: unknown
  position?: unknown
}

Deno.serve(async (req) => {
  const corsResult = handleCors(req)
  if (corsResult) return corsResult
  if (req.method !== 'POST') return errorResponse('Method not allowed', 405)

  const auth = await requireAuth(req)
  if (isAuthError(auth)) return auth

  const body = await parseBody<UseHammerBody>(req)
  if (body instanceof Response) return body

  if (!isValidUUID(body.roundId)) return errorResponse('Invalid roundId', 400)
  if (!isValidUUID(body.questionId)) return errorResponse('Invalid questionId', 400)
  if (typeof body.position !== 'number' || body.position < 0 || body.position > 9) {
    return errorResponse('Invalid position', 400)
  }

  const supabase = createServiceClient()

  // Fetch round and verify ownership + active status
  const { data: round, error: roundError } = await supabase
    .from('rounds')
    .select('id, status, hammers, expires_at, current_question_index')
    .eq('id', body.roundId)
    .eq('user_id', auth.userId)
    .maybeSingle()

  if (roundError) return errorResponse('Failed to fetch round', 500)
  if (!round) return errorResponse('Round not found', 404)
  if (round.status !== 'active') return errorResponse('Round is not active', 410)
  if (new Date(round.expires_at) < new Date()) return errorResponse('Round has expired', 410)
  if (round.hammers <= 0) return errorResponse('No hammers available', 400)
  if (body.position !== round.current_question_index) {
    return errorResponse('Question is out of sequence', 409)
  }

  // Verify question belongs to this round at this position
  const { data: rq, error: rqError } = await supabase
    .from('round_questions')
    .select('question_id')
    .eq('round_id', body.roundId)
    .eq('position', body.position)
    .eq('question_id', body.questionId)
    .maybeSingle()

  if (rqError) return errorResponse('Failed to verify question', 500)
  if (!rq) return errorResponse('Question not found in this round at this position', 400)

  // Check this position hasn't already been answered
  const { data: existingAnswer } = await supabase
    .from('answers')
    .select('id')
    .eq('round_id', body.roundId)
    .eq('position', body.position)
    .maybeSingle()

  if (existingAnswer) return errorResponse('Question already answered', 400)

  // Look up the correct answer server-side — pick 2 random wrong options to eliminate
  const { data: question, error: qError } = await supabase
    .from('question_bank')
    .select('correct_option')
    .eq('id', body.questionId)
    .single()

  if (qError || !question) return errorResponse('Question not found', 404)

  const allOptions: AnswerOption[] = ['a', 'b', 'c', 'd']
  const wrongOptions = allOptions.filter((o) => o !== question.correct_option)
  // Fisher-Yates shuffle then take first 2
  for (let i = wrongOptions.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[wrongOptions[i], wrongOptions[j]] = [wrongOptions[j], wrongOptions[i]]
  }
  const eliminatedOptions = wrongOptions.slice(0, 2)

  // Decrement hammer count
  const { data: updatedRound, error: updateError } = await supabase
    .from('rounds')
    .update({ hammers: round.hammers - 1 })
    .eq('id', body.roundId)
    .eq('hammers', round.hammers)
    .gt('hammers', 0)
    .select('hammers')
    .maybeSingle()

  if (updateError) return errorResponse('Failed to use hammer', 500)
  if (!updatedRound) return errorResponse('Hammer state changed, please retry', 409)

  return jsonResponse({
    eliminatedOptions,
    hammersRemaining: updatedRound.hammers,
  })
})

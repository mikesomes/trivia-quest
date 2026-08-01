import { describe, expect, it, vi } from 'vitest'
import { promoteQuestionCandidate } from '../../supabase/src/questions/candidates.ts'

describe('batch promotion uses the guarded RPC', () => {
  it('delegates promotion rather than writing the live table directly', async () => {
    const rpc = vi.fn().mockResolvedValue({ data: { id: 'live-1' }, error: null })
    await expect(promoteQuestionCandidate({ rpc }, 'candidate-1')).resolves.toEqual({ id: 'live-1' })
    expect(rpc).toHaveBeenCalledWith('promote_question_candidate', { p_candidate_id: 'candidate-1', p_allow_unverified: false })
  })
})

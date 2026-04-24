export async function getActiveRoundForUser(
  supabase: ReturnType<typeof import('../../functions/_shared/supabaseClient.ts').createServiceClient>,
  userId: string
) {
  const { data, error } = await supabase
    .from('rounds')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()

  if (error) throw new Error(`Failed to check active round: ${error.message}`)
  return data
}

export async function getRoundWithOwnerCheck(
  supabase: ReturnType<typeof import('../../functions/_shared/supabaseClient.ts').createServiceClient>,
  roundId: string,
  userId: string
) {
  const { data, error } = await supabase
    .from('rounds')
    .select('*')
    .eq('id', roundId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw new Error(`Failed to fetch round: ${error.message}`)
  return data
}

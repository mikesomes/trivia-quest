async function apiFlagRequest(method: 'POST' | 'DELETE', questionId: string) {
  const { supabase } = await import('../lib/supabase')
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.access_token) throw new Error('Not authenticated')

  const API_BASE = process.env.EXPO_PUBLIC_API_BASE_URL ?? ''
  const res = await fetch(`${API_BASE}/flag-question`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({ questionId }),
  })
  if (!res.ok) throw new Error('Request failed')
  return res.json() as Promise<{ flagged: boolean; flagCount: number }>
}

export const flagsApi = {
  flag: (questionId: string) => apiFlagRequest('POST', questionId),
  unflag: (questionId: string) => apiFlagRequest('DELETE', questionId),
}

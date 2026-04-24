-- Bind quest rounds to a specific quest node so completions can be verified
ALTER TABLE public.rounds
  ADD COLUMN IF NOT EXISTS quest_node_id TEXT REFERENCES public.quest_nodes(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_rounds_user_quest_node
  ON public.rounds(user_id, quest_node_id)
  WHERE quest_node_id IS NOT NULL;

-- Prevent authenticated clients from enumerating the full users table.
DROP POLICY IF EXISTS "Users can read all profiles" ON public.users;

CREATE POLICY "Users can read own profile"
  ON public.users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

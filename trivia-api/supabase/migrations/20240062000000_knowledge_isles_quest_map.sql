-- Knowledge Isles: first server-authoritative world-map region.
-- Existing quest rows and player progress are retained; legacy nodes are only
-- hidden from the new active map.

ALTER TABLE public.quest_nodes
  ADD COLUMN IF NOT EXISTS region_id TEXT NOT NULL DEFAULT 'legacy',
  ADD COLUMN IF NOT EXISTS visual_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS loot_tier TEXT NOT NULL DEFAULT 'wood'
    CHECK (loot_tier IN ('wood', 'silver', 'gold')),
  ADD COLUMN IF NOT EXISTS unlock_rule TEXT NOT NULL DEFAULT 'all'
    CHECK (unlock_rule IN ('all', 'any'));

CREATE TABLE IF NOT EXISTS public.quest_node_reward_claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  node_id TEXT NOT NULL REFERENCES public.quest_nodes(id) ON DELETE CASCADE,
  tier TEXT NOT NULL CHECK (tier IN ('wood', 'silver', 'gold')),
  reward_type TEXT NOT NULL CHECK (
    reward_type IN ('coins', 'life', 'hammer', 'shield', 'xp_booster', 'jackpot')
  ),
  reward_amount INTEGER NOT NULL CHECK (reward_amount > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, node_id)
);

CREATE INDEX IF NOT EXISTS idx_quest_reward_claims_user
  ON public.quest_node_reward_claims (user_id, created_at DESC);

ALTER TABLE public.quest_node_reward_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own quest rewards"
  ON public.quest_node_reward_claims FOR SELECT
  USING (auth.uid() = user_id);

-- Called only by the service-role complete-quest-node function. The unique
-- ledger constraint makes a first-clear reward idempotent under retries.
CREATE OR REPLACE FUNCTION public.claim_quest_node_reward(
  p_user_id UUID,
  p_node_id TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tier TEXT;
  v_roll DOUBLE PRECISION;
  v_item_roll DOUBLE PRECISION;
  v_type TEXT;
  v_amount INTEGER;
  v_inventory_column TEXT;
  v_inventory_count INTEGER;
  v_max_inventory INTEGER;
  v_lives INTEGER;
  v_hammers INTEGER;
  v_shields INTEGER;
  v_boosters INTEGER;
  v_existing public.quest_node_reward_claims%ROWTYPE;
  v_inserted public.quest_node_reward_claims%ROWTYPE;
  v_coin_min INTEGER;
  v_coin_max INTEGER;
BEGIN
  SELECT loot_tier INTO v_tier
  FROM public.quest_nodes
  WHERE id = p_node_id AND is_active = true;

  IF v_tier IS NULL THEN
    RAISE EXCEPTION 'Active quest node not found';
  END IF;

  SELECT * INTO v_existing
  FROM public.quest_node_reward_claims
  WHERE user_id = p_user_id AND node_id = p_node_id;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'tier', v_existing.tier,
      'rewardType', v_existing.reward_type,
      'amount', v_existing.reward_amount,
      'alreadyClaimed', true
    );
  END IF;

  SELECT
    inventory_lives,
    inventory_hammers,
    inventory_shields,
    inventory_xp_booster
  INTO STRICT
    v_lives,
    v_hammers,
    v_shields,
    v_boosters
  FROM public.users
  WHERE id = p_user_id
  FOR UPDATE;

  v_roll := random() * 100;
  IF v_roll < 60 THEN
    v_type := 'coins';
  ELSIF v_roll < 85 THEN
    v_type := 'power_up';
  ELSIF v_roll < 95 THEN
    v_type := 'xp_booster';
  ELSE
    v_type := 'jackpot';
  END IF;

  IF v_tier = 'gold' THEN
    v_coin_min := 180; v_coin_max := 350;
  ELSIF v_tier = 'silver' THEN
    v_coin_min := 90; v_coin_max := 180;
  ELSE
    v_coin_min := 40; v_coin_max := 90;
  END IF;

  IF v_type = 'power_up' THEN
    v_item_roll := random();
    IF v_item_roll < 0.333333 THEN
      v_type := 'life'; v_inventory_column := 'inventory_lives'; v_max_inventory := 4;
    ELSIF v_item_roll < 0.666666 THEN
      v_type := 'hammer'; v_inventory_column := 'inventory_hammers'; v_max_inventory := 4;
    ELSE
      v_type := 'shield'; v_inventory_column := 'inventory_shields'; v_max_inventory := 3;
    END IF;
  ELSIF v_type = 'xp_booster' THEN
    v_inventory_column := 'inventory_xp_booster'; v_max_inventory := 3;
  END IF;

  IF v_inventory_column IS NOT NULL THEN
    EXECUTE format('SELECT %I FROM public.users WHERE id = $1', v_inventory_column)
      INTO v_inventory_count USING p_user_id;
    IF v_inventory_count >= v_max_inventory THEN
      v_type := 'coins';
      v_inventory_column := NULL;
    END IF;
  END IF;

  IF v_type IN ('coins', 'jackpot') THEN
    v_amount := v_coin_min + floor(random() * (v_coin_max - v_coin_min + 1))::INTEGER;
    IF v_type = 'jackpot' THEN v_amount := v_amount * 3; END IF;
  ELSE
    v_amount := 1;
  END IF;

  INSERT INTO public.quest_node_reward_claims
    (user_id, node_id, tier, reward_type, reward_amount)
  VALUES
    (p_user_id, p_node_id, v_tier, v_type, v_amount)
  ON CONFLICT (user_id, node_id) DO NOTHING
  RETURNING * INTO v_inserted;

  IF v_inserted.id IS NULL THEN
    SELECT * INTO v_existing
    FROM public.quest_node_reward_claims
    WHERE user_id = p_user_id AND node_id = p_node_id;
    RETURN jsonb_build_object(
      'tier', v_existing.tier,
      'rewardType', v_existing.reward_type,
      'amount', v_existing.reward_amount,
      'alreadyClaimed', true
    );
  END IF;

  IF v_inventory_column IS NULL THEN
    UPDATE public.users SET coins = coins + v_amount WHERE id = p_user_id;
  ELSE
    EXECUTE format(
      'UPDATE public.users SET %I = %I + $1 WHERE id = $2',
      v_inventory_column,
      v_inventory_column
    ) USING v_amount, p_user_id;
  END IF;

  RETURN jsonb_build_object(
    'tier', v_tier,
    'rewardType', v_type,
    'amount', v_amount,
    'alreadyClaimed', false
  );
END;
$$;

REVOKE ALL ON FUNCTION public.claim_quest_node_reward(UUID, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_quest_node_reward(UUID, TEXT)
  TO service_role;

UPDATE public.quest_nodes SET is_active = false WHERE region_id = 'legacy';

INSERT INTO public.quest_nodes (
  id, title, description, category, difficulty, game_mode, branch,
  position_x, position_y, xp_reward, pass_threshold, star_2_threshold,
  star_3_threshold, unlock_level, is_active, region_id, visual_metadata,
  loot_tier, unlock_rule, mode_config
) VALUES
  (
    'ki_arrival', 'Arrival Camp', 'Begin your expedition through the Knowledge Isles.',
    'general_knowledge', 'easy', 'classic', 'arrival',
    0.50, 0.875, 150, 0.60, 0.80, 1.00, 1, true, 'knowledge_isles',
    '{"landmark":"camp","accent":"#58D7A4","mapLabel":"ARRIVAL"}',
    'wood', 'all', '{}'::jsonb
  ),
  (
    'ki_observatory', 'Stargazer Observatory', 'A welcoming route through everyday discoveries.',
    'general_knowledge', 'easy', 'classic', 'easy',
    0.205, 0.535, 200, 0.60, 0.80, 1.00, 1, true, 'knowledge_isles',
    '{"landmark":"observatory","accent":"#65DFC1","mapLabel":"OBSERVATORY"}',
    'wood', 'all', '{}'::jsonb
  ),
  (
    'ki_archive', 'Archive of Answers', 'Deeper knowledge waits among the ancient shelves.',
    'general_knowledge', 'medium', 'classic', 'medium',
    0.505, 0.635, 350, 0.65, 0.82, 1.00, 1, true, 'knowledge_isles',
    '{"landmark":"archive","accent":"#F1B84B","mapLabel":"ARCHIVE"}',
    'silver', 'all', '{}'::jsonb
  ),
  (
    'ki_tempest', 'Tempest Peak', 'Face the hardest questions beneath a living storm.',
    'general_knowledge', 'hard', 'classic', 'hard',
    0.805, 0.515, 550, 0.70, 0.88, 1.00, 1, true, 'knowledge_isles',
    '{"landmark":"peak","accent":"#9C7CFF","mapLabel":"TEMPEST PEAK"}',
    'gold', 'all', '{}'::jsonb
  ),
  (
    'ki_summit', 'Golden Summit', 'Conquer the final vault of the Knowledge Isles.',
    'general_knowledge', 'boss', 'boss_battle', 'summit',
    0.505, 0.155, 900, 0.80, 0.90, 1.00, 1, true, 'knowledge_isles',
    '{"landmark":"vault","accent":"#FFD66B","mapLabel":"GOLDEN SUMMIT"}',
    'gold', 'any', '{}'::jsonb
  )
ON CONFLICT (id) DO UPDATE SET
  title = EXCLUDED.title,
  description = EXCLUDED.description,
  category = EXCLUDED.category,
  difficulty = EXCLUDED.difficulty,
  game_mode = EXCLUDED.game_mode,
  branch = EXCLUDED.branch,
  position_x = EXCLUDED.position_x,
  position_y = EXCLUDED.position_y,
  xp_reward = EXCLUDED.xp_reward,
  pass_threshold = EXCLUDED.pass_threshold,
  star_2_threshold = EXCLUDED.star_2_threshold,
  star_3_threshold = EXCLUDED.star_3_threshold,
  unlock_level = EXCLUDED.unlock_level,
  is_active = EXCLUDED.is_active,
  region_id = EXCLUDED.region_id,
  visual_metadata = EXCLUDED.visual_metadata,
  loot_tier = EXCLUDED.loot_tier,
  unlock_rule = EXCLUDED.unlock_rule,
  mode_config = EXCLUDED.mode_config;

DELETE FROM public.quest_node_connections
WHERE from_node_id LIKE 'ki_%' OR to_node_id LIKE 'ki_%';

INSERT INTO public.quest_node_connections (from_node_id, to_node_id) VALUES
  ('ki_arrival', 'ki_observatory'),
  ('ki_arrival', 'ki_archive'),
  ('ki_arrival', 'ki_tempest'),
  ('ki_observatory', 'ki_summit'),
  ('ki_archive', 'ki_summit'),
  ('ki_tempest', 'ki_summit');

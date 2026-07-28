-- Universal day streak: any completed round keeps the streak alive (not just
-- daily challenges). Dates are Eastern-time calendar days, matching the daily
-- challenge reset. streak_freezes are consumed automatically, one per missed
-- day, when a gap would otherwise break the streak.
ALTER TABLE public.users
  ADD COLUMN current_streak INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN longest_streak INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN last_active_date DATE,
  ADD COLUMN streak_freezes INTEGER NOT NULL DEFAULT 0;

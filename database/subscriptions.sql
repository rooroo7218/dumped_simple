-- ─────────────────────────────────────────────────────────────────────────────
-- Subscriptions table
-- Run this in your Supabase SQL editor.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS subscriptions (
  id                    uuid         DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id               uuid         REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  stripe_customer_id    text         UNIQUE,
  stripe_subscription_id text        UNIQUE,
  -- status values: trialing | active | past_due | canceled | expired
  status                text         NOT NULL DEFAULT 'trialing',
  trial_ends_at         timestamptz  NOT NULL DEFAULT (now() + interval '14 days'),
  current_period_end    timestamptz,
  created_at            timestamptz  DEFAULT now(),
  updated_at            timestamptz  DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read their own subscription row
CREATE POLICY "Users can read own subscription"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Authenticated users can insert their own row (client-side first-time setup)
CREATE POLICY "Users can insert own subscription"
  ON subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ─── Auto-create subscription row on signup ───────────────────────────────────
-- This trigger fires when a new auth.users row is created (Google Sign-In).
-- It ensures every user has a subscription row with a 14-day trial from day 1.

CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created_subscription ON auth.users;
CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_subscription();

-- ─── Backfill existing users ──────────────────────────────────────────────────
-- Run this once to create subscription rows for users who signed up before
-- this migration. They get a trial that ends immediately, sending them to the
-- paywall — or you can bump trial_ends_at to give them extra time.

INSERT INTO subscriptions (user_id, status, trial_ends_at)
SELECT id, 'trialing', now() + interval '14 days'
FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

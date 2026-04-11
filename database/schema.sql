-- Dumped — Database Schema
-- Reflects the ACTUAL live Supabase tables as of March 2026.
-- Run this in a fresh Supabase project to recreate the database from scratch.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── profiles ────────────────────────────────────────────────────────────────
-- User identity (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  picture TEXT,
  last_login TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── memories ────────────────────────────────────────────────────────────────
-- Each brain dump the user submits
CREATE TABLE IF NOT EXISTS memories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  timestamp BIGINT NOT NULL,
  content TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('text', 'voice', 'file')),
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
  tags TEXT[] DEFAULT '{}',
  processed BOOLEAN DEFAULT FALSE,
  category TEXT NOT NULL,
  life_context_insight TEXT,
  mood TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── actions ─────────────────────────────────────────────────────────────────
-- Tasks extracted from memories (child of memories)
-- NOTE: this table is named 'actions' in the live DB (not 'action_items')
CREATE TABLE IF NOT EXISTS actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  urgency INTEGER NOT NULL CHECK (urgency >= 1 AND urgency <= 10),
  effort TEXT NOT NULL CHECK (effort IN ('low', 'medium', 'high')),
  category TEXT NOT NULL,
  rationale TEXT,
  completed BOOLEAN DEFAULT FALSE,
  scheduled_time BIGINT,
  x FLOAT,
  y FLOAT,
  description TEXT,
  category_order INTEGER,
  alignment_score FLOAT,
  impact_area TEXT,
  deadline BIGINT,
  last_reviewed BIGINT,
  context_tags TEXT[] DEFAULT '{}',
  complete_by BIGINT,
  trend TEXT CHECK (trend IN ('up', 'down', 'same')),
  trend_delta INTEGER,
  time_of_day TEXT,
  parked BOOLEAN DEFAULT FALSE,
  global_order INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── task_steps ──────────────────────────────────────────────────────────────
-- Subtasks created by AI breakdown (child of actions)
CREATE TABLE IF NOT EXISTS task_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  memory_id UUID REFERENCES memories(id) ON DELETE CASCADE,
  task_text TEXT,
  step_text TEXT NOT NULL,
  duration_minutes INTEGER,
  completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── diary ───────────────────────────────────────────────────────────────────
-- Journal entries with mood
-- NOTE: this table is named 'diary' in the live DB (not 'diary_entries')
CREATE TABLE IF NOT EXISTS diary (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  timestamp BIGINT NOT NULL,
  content TEXT NOT NULL,
  mood TEXT,
  transmutation_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── stickers ────────────────────────────────────────────────────────────────
-- Gamification layer (archived — no longer shown in UI, table kept for data)
CREATE TABLE IF NOT EXISTS stickers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  sticker_id TEXT NOT NULL,
  x FLOAT,
  y FLOAT,
  rotation FLOAT,
  scale FLOAT,
  style TEXT,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_memories_user_id ON memories(user_id);
CREATE INDEX IF NOT EXISTS idx_memories_timestamp ON memories(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_actions_user_id ON actions(user_id);
CREATE INDEX IF NOT EXISTS idx_actions_memory_id ON actions(memory_id);
CREATE INDEX IF NOT EXISTS idx_actions_completed ON actions(completed);
CREATE INDEX IF NOT EXISTS idx_diary_user_id ON diary(user_id);
CREATE INDEX IF NOT EXISTS idx_diary_timestamp ON diary(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_task_steps_memory_id ON task_steps(memory_id);

-- ─── Row Level Security ───────────────────────────────────────────────────────
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE diary ENABLE ROW LEVEL SECURITY;
ALTER TABLE stickers ENABLE ROW LEVEL SECURITY;

-- RLS Policies: each user can only read/write their own rows
CREATE POLICY "Users can manage own profile" ON profiles
  FOR ALL USING (auth.uid() = id);

CREATE POLICY "Users can manage own memories" ON memories
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own actions" ON actions
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own task steps" ON task_steps
  FOR ALL USING (
    memory_id IN (SELECT id FROM memories WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can manage own diary entries" ON diary
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own stickers" ON stickers
  FOR ALL USING (auth.uid() = user_id);

-- ─── Auto-update updated_at ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_memories_updated_at
  BEFORE UPDATE ON memories FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_actions_updated_at
  BEFORE UPDATE ON actions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_diary_updated_at
  BEFORE UPDATE ON diary FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

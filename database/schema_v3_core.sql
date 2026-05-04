-- ─────────────────────────────────────────────────────────────────────────────
-- DUMPED V3 CORE SCHEMA & ROBUST AUTH TRIGGER
-- Run this in your Supabase SQL Editor to fix the "Database error saving new user"
-- and consolidate your database structure.
-- ─────────────────────────────────────────────────────────────────────────────

-- 0. Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. PROFILES (Extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT, -- Removed NOT NULL to prevent OAuth crashes
    email TEXT,
    picture TEXT,
    last_login TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. MEMORIES (Each brain dump submission)
CREATE TABLE IF NOT EXISTS public.memories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    timestamp BIGINT NOT NULL,
    content TEXT NOT NULL,
    source TEXT DEFAULT 'text',
    priority TEXT DEFAULT 'medium',
    tags TEXT[] DEFAULT '{}',
    processed BOOLEAN DEFAULT false,
    category TEXT DEFAULT 'General',
    mood TEXT,
    life_context_insight TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. ITEMS (The deduplicated "recurring thoughts")
CREATE TABLE IF NOT EXISTS public.items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    label TEXT NOT NULL,
    mention_count INTEGER DEFAULT 1,
    last_mentioned_at TIMESTAMPTZ DEFAULT NOW(),
    first_mentioned_at TIMESTAMPTZ DEFAULT NOW(),
    is_flagged BOOLEAN DEFAULT false,
    flag_order INTEGER,
    is_completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMPTZ,
    faded_at TIMESTAMPTZ,
    style JSONB DEFAULT '{"color": "default", "texture": "none"}',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. DUMP_ITEMS (Junction for excerpts)
CREATE TABLE IF NOT EXISTS public.dump_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dump_id UUID NOT NULL REFERENCES public.memories(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
    raw_excerpt TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. ACTIONS (Tasks from traditional v1/v2 flow)
CREATE TABLE IF NOT EXISTS public.actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    memory_id UUID REFERENCES public.memories(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    urgency INTEGER DEFAULT 5,
    effort TEXT DEFAULT 'medium',
    category TEXT,
    rationale TEXT,
    completed BOOLEAN DEFAULT false,
    scheduled_time TIMESTAMPTZ,
    x FLOAT,
    y FLOAT,
    description TEXT,
    category_order INTEGER,
    alignment_score INTEGER,
    impact_area TEXT,
    deadline TIMESTAMPTZ,
    last_reviewed TIMESTAMPTZ,
    context_tags TEXT[] DEFAULT '{}',
    complete_by TEXT,
    trend TEXT,
    trend_delta FLOAT,
    time_of_day TEXT,
    parked BOOLEAN DEFAULT false,
    global_order INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. RPC FUNCTIONS
CREATE OR REPLACE FUNCTION public.increment_item_mention(item_id_param UUID)
RETURNS void AS $$
BEGIN
    UPDATE items
    SET mention_count = mention_count + 1,
        last_mentioned_at = NOW()
    WHERE id = item_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. ENABLE RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dump_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actions ENABLE ROW LEVEL SECURITY;

-- 8. POLICIES
DROP POLICY IF EXISTS "Users can manage own profile" ON public.profiles;
CREATE POLICY "Users can manage own profile" ON public.profiles
    FOR ALL USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can manage own memories" ON public.memories;
CREATE POLICY "Users can manage own memories" ON public.memories
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own items" ON public.items;
CREATE POLICY "Users can manage own items" ON public.items
    FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can manage own dump_items" ON public.dump_items;
CREATE POLICY "Users can manage own dump_items" ON public.dump_items
    FOR ALL USING (
        dump_id IN (SELECT id FROM memories WHERE user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Users can manage own actions" ON public.actions;
CREATE POLICY "Users can manage own actions" ON public.actions
    FOR ALL USING (auth.uid() = user_id);

-- 9. ROBUST AUTH TRIGGER
-- This function handles the creation of a public.profile whenever a user signs up.
-- It safely extracts metadata from Google/Discord etc. and provides fallbacks to prevent crashes.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    username TEXT;
    avatar TEXT;
BEGIN
    -- Extract name from metadata with multiple fallbacks
    username := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        NEW.raw_user_meta_data->>'custom_display_name',
        'User ' || substr(NEW.id::text, 1, 5)
    );
    
    -- Extract avatar URL
    avatar := COALESCE(
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_user_meta_data->>'picture'
    );

    INSERT INTO public.profiles (id, name, email, picture)
    VALUES (NEW.id, username, NEW.email, avatar)
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        email = EXCLUDED.email,
        picture = EXCLUDED.picture;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Safety fallback: ensure the trigger never blocks the auth signup even if it fails
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 10. INDEXES
CREATE INDEX IF NOT EXISTS idx_items_user_id ON items(user_id);
CREATE INDEX IF NOT EXISTS idx_memories_user_id ON memories(user_id);
CREATE INDEX IF NOT EXISTS idx_actions_user_id ON actions(user_id);

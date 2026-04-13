-- Supabase Schema for "Dumped Simple" (Zen Minimalist)

-- 1. Create memories table
CREATE TABLE IF NOT EXISTS memories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp BIGINT NOT NULL,
    content TEXT NOT NULL,
    source TEXT,
    priority TEXT DEFAULT 'medium',
    tags TEXT[],
    processed BOOLEAN DEFAULT false,
    category TEXT DEFAULT 'General',
    mood TEXT,
    life_context_insight TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- 2. Create actions table (Tasks)
CREATE TABLE IF NOT EXISTS actions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    memory_id UUID REFERENCES memories(id) ON DELETE CASCADE,
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
    context_tags TEXT[],
    complete_by TEXT,
    trend TEXT,
    trend_delta FLOAT,
    time_of_day TEXT,
    parked BOOLEAN DEFAULT false,
    global_order INTEGER
);

-- 3. Enable RLS (Row Level Security)
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE actions ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies for memories
CREATE POLICY "Users can only access their own memories"
ON memories FOR ALL
USING (auth.uid() = user_id);

-- 5. Create Policies for actions
CREATE POLICY "Users can only access their own actions"
ON actions FOR ALL
USING (auth.uid() = user_id);

-- ─── DUMPED v3 TABLES ───────────────────────────────────────────────────────

-- 1. Items (The deduplicated "recurring thoughts")
CREATE TABLE IF NOT EXISTS items (
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
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Dump Items (Junction table for excerpts)
CREATE TABLE IF NOT EXISTS dump_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    dump_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
    raw_excerpt TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Enable RLS
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE dump_items ENABLE ROW LEVEL SECURITY;

-- 4. Policies
CREATE POLICY "Users can manage own items" ON items
    FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own dump_items" ON dump_items
    FOR ALL USING (
        dump_id IN (SELECT id FROM memories WHERE user_id = auth.uid())
    );

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_items_user_id ON items(user_id);
CREATE INDEX IF NOT EXISTS idx_items_is_completed ON items(is_completed);
-- 6. RPC Functions
CREATE OR REPLACE FUNCTION increment_item_mention(item_id_param UUID)
RETURNS void AS $$
BEGIN
    UPDATE items
    SET mention_count = mention_count + 1,
        last_mentioned_at = NOW()
    WHERE id = item_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


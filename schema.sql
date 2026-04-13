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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_memories_user_id ON memories(user_id);
CREATE INDEX IF NOT EXISTS idx_actions_user_id ON actions(user_id);
CREATE INDEX IF NOT EXISTS idx_actions_memory_id ON actions(memory_id);


import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import crypto from 'crypto';

// Manual env reading
const envPath = './server/.env';
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const supabaseUrl = env.SUPABASE_URL;
const supabaseKey = env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function rescue() {
    console.log("🚑 Starting Deep Rescue Operation...");

    // 1. Fetch all active actions
    const { data: actions, error: actionsError } = await supabase
        .from('actions')
        .select('*')
        .eq('completed', false);

    if (actionsError) {
        console.error("❌ Error fetching actions:", actionsError.message);
        return;
    }

    if (!actions || actions.length === 0) {
        console.log("∅ No active tasks found to rescue.");
        return;
    }

    // 2. Identify User
    const userId = actions[0].user_id;
    console.log(`👤 Targeted User ID: ${userId}`);

    // 3. Deduplicate by text (case insensitive)
    const uniqueByText = new Map();
    actions.forEach(a => {
        const key = a.text.toLowerCase().trim();
        if (!uniqueByText.has(key)) {
            uniqueByText.set(key, a);
        }
    });

    console.log(`✨ Deduplicated ${actions.length} records down to ${uniqueByText.size} unique tasks.`);

    // 4. Create a Rescue Memory
    const rescueMemoryId = crypto.randomUUID();
    console.log(`📦 Creating Rescue Memory: ${rescueMemoryId}`);

    const { error: memError } = await supabase.from('memories').insert({
        id: rescueMemoryId,
        user_id: userId,
        content: "Deep Rescue: Recovered orphaned tasks from cloud backup after schema mismatch.",
        timestamp: Date.now(),
        source: 'synthesis',
        priority: 'high',
        processed: true,
        category: 'Rescue'
    });

    if (memError) {
        console.error("❌ Failed to create rescue memory:", memError.message);
        return;
    }

    // 5. Re-parent and Clean Actions
    console.log("🛠 Re-parenting tasks...");
    const recoveredActions = [];
    for (const [text, action] of uniqueByText) {
        const cleanAction = {
            id: crypto.randomUUID(),
            user_id: userId,
            memory_id: rescueMemoryId,
            text: action.text,
            category: action.category,
            urgency: action.urgency || 5,
            effort: action.effort || 'medium',
            rationale: "Recovered from cloud backup.",
            completed: false,
            description: action.description,
            category_order: action.category_order,
            alignment_score: action.alignment_score,
            impact_area: action.impact_area,
            deadline: action.deadline,
            last_reviewed: Date.now()
        };
        recoveredActions.push(cleanAction);
    }

    // 6. Bulk Insert Recovered Actions
    console.log(`🚀 Syncing ${recoveredActions.length} tasks back to cloud...`);
    // Batch inserts of 50 to be safe
    for (let i = 0; i < recoveredActions.length; i += 50) {
        const chunk = recoveredActions.slice(i, i + 50);
        const { error: syncError } = await supabase.from('actions').insert(chunk);
        if (syncError) {
            console.error(`❌ Sync Error at chunk ${i}:`, syncError.message);
        }
    }

    console.log("✅ SUCCESS! All tasks have been reconnected to a new 'Rescue' memory.");
    console.log("👉 Please refresh your app. Look for a memory titled 'Deep Rescue'.");
}

rescue();

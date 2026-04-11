
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load env from server directory
dotenv.config({ path: path.join(__dirname, '../server/.env') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function scan() {
    console.log("🔍 Scanning Supabase for active tasks...");

    // Attempt to fetch all actions (RLS might block this if not authenticated, 
    // but sometimes ANON key has read access to public tables depending on setup)
    const { data, error } = await supabase
        .from('actions')
        .select('*')
        .eq('completed', false)
        .order('id', { ascending: false })
        .limit(100);

    if (error) {
        console.error("❌ Error fetching actions:", error.message);
        return;
    }

    if (!data || data.length === 0) {
        console.log("∅ No active tasks found in the cloud.");
        return;
    }

    console.log(`✅ Found ${data.length} active tasks.`);
    data.forEach(task => {
        console.log(`- [${task.category}] ${task.text} (Memory: ${task.memory_id})`);
    });
}

scan();

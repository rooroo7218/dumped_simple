
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Manual env reading to avoid dependency issues
const envPath = './server/.env';
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) env[key.trim()] = value.trim();
});

const supabaseUrl = env.SUPABASE_URL;
const supabaseKey = env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials in .env");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function scan() {
    console.log("🔍 Scanning Supabase for orphaned active tasks...");

    // Fetch ALL active actions
    const { data, error } = await supabase
        .from('actions')
        .select('*')
        .eq('completed', false)
        .order('id', { ascending: false });

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

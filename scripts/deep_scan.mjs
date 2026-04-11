
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

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

async function deepScan() {
    let output = "🚀 Starting Deep Scan of Supabase...\n";

    // 1. Fetch ALL actions
    output += "📥 Fetching all actions...\n";
    const { data: actions, error: actionsError } = await supabase
        .from('actions')
        .select('*');

    if (actionsError) output += `❌ Actions Error: ${actionsError.message}\n`;
    else output += `✅ Found ${actions?.length || 0} total actions.\n`;

    // 2. Fetch ALL memories
    output += "📥 Fetching all memories...\n";
    const { data: memories, error: memError } = await supabase
        .from('memories')
        .select('*');

    if (memError) output += `❌ Memories Error: ${memError.message}\n`;
    else output += `✅ Found ${memories?.length || 0} total memories.\n`;

    // 4. Analysis
    output += "\n--- Analysis Report ---\n";

    if (actions) {
        const completed = actions.filter(a => a.completed);
        const active = actions.filter(a => !a.completed);
        output += `Active: ${active.length}, Completed: ${completed.length}\n`;

        output += "\nDetail List (Actions):\n";
        actions.forEach(a => {
            output += `[${a.completed ? 'DONE' : 'OPEN'}] [ID: ${a.id}] [MemID: ${a.memory_id}] [Cat: ${a.category}] ${a.text}\n`;
        });
    }

    if (memories) {
        output += "\nMemories List:\n";
        memories.forEach(m => {
            const date = new Date(m.timestamp).toLocaleString();
            output += `[ID: ${m.id}] [${date}] ${m.content}\n`;
        });
    }

    fs.writeFileSync('cloud_scan_results.log', output);
    console.log("✅ Results written to cloud_scan_results.log");
}

deepScan();

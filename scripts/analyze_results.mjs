
import fs from 'fs';

const log = fs.readFileSync('cloud_scan_results.log', 'utf8');

const actions = [];
const lines = log.split('\n');
let section = "";

lines.forEach(line => {
    if (line.includes("Detail List (Actions):")) section = "actions";
    else if (line.includes("Memories List:")) section = "memories";

    if (section === "actions" && line.startsWith("[OPEN]")) {
        const match = line.match(/\[Cat: (.*?)\] (.*)$/);
        if (match) {
            actions.push({
                category: match[1].trim(),
                text: match[2].trim()
            });
        }
    }
});

// Deduplicate by text
const uniqueActions = [];
const seen = new Set();
actions.forEach(a => {
    const key = a.text.toLowerCase();
    if (!seen.has(key)) {
        seen.add(key);
        uniqueActions.push(a);
    }
});

let report = "# Expanded Found Tasks Report\n\n";
report += `I've found **${uniqueActions.length} unique active tasks** in the cloud. Many were duplicates across different brain dumps.\n\n`;
report += "| Category | Task Description |\n";
report += "| :--- | :--- |\n";
uniqueActions.sort((a, b) => a.category.localeCompare(b.category)).forEach(a => {
    report += `| ${a.category} | ${a.text} |\n`;
});

fs.writeFileSync('expanded_found_tasks.md', report);
console.log("✅ Expanded report written to expanded_found_tasks.md");

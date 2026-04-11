// Using native fetch available in Node 18+

async function testDuplicates() {
    console.log("🧪 Testing Duplicate Detection...");
    const tasks = [
        { id: "1", text: "Buy milk and eggs", category: "Grocery" },
        { id: "2", text: "Get eggs and milk from store", category: "Grocery" },
        { id: "3", text: "Finish the report", category: "Work" }
    ];

    try {
        const response = await fetch('http://localhost:3001/api/gemini/duplicates', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: '00000000-0000-0000-0000-000000000000',
                tasks: tasks
            })
        });

        if (!response.ok) {
            console.error(`❌ HTTP Error: ${response.status}`);
            const text = await response.text();
            console.error(text);
            return;
        }

        const data = await response.json();
        console.log("✅ Response received:");
        console.log(JSON.stringify(data, null, 2));

        if (data.duplicateGroups && data.duplicateGroups.length > 0) {
            console.log("🎯 Duplicates found!");
        } else {
            console.log("❓ No duplicates found.");
        }
    } catch (e) {
        console.error("❌ Catch error:", e.message);
    }
}

testDuplicates();

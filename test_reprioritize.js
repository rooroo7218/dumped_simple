import fetch from 'node-fetch';

async function testReprioritize() {
    try {
        const response = await fetch('http://localhost:3001/api/gemini/reprioritize', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: '00000000-0000-0000-0000-000000000000',
                diaryEntries: []
            })
        });
        const data = await response.json();
        console.log(JSON.stringify(data, null, 2));
    } catch (e) {
        console.error(e);
    }
}

testReprioritize();

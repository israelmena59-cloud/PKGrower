const fetch = require('node-fetch');

async function test() {
    const res = await fetch('https://pkgrower-backend-664237832244.us-central1.run.app/api/sensors/history?range=day');
    const data = await res.json();

    const sorted = data.sort((a, b) => a.timestamp.localeCompare(b.timestamp)).slice(-48);

    let zeros = 0;
    let nulls = 0;
    let valid = 0;

    for (const d of sorted) {
        const t = d.temperature;
        const h = d.humidity;

        if (t === 0 || h === 0) {
            zeros++;
            console.log(`${d.timestamp.slice(-12)}: t=${t}, h=${h} [ZERO]`);
        } else if (t === null || t === undefined || h === null || h === undefined) {
            nulls++;
            console.log(`${d.timestamp.slice(-12)}: t=${t}, h=${h} [NULL]`);
        } else {
            valid++;
        }
    }

    console.log(`\nSummary: ${valid} valid, ${zeros} zeros, ${nulls} nulls`);
}

test().catch(console.error);

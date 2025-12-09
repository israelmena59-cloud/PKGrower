const http = require('http');
const fs = require('fs');
const path = require('path');

// 1x1 Pixel Transparent GIF (Mock Image)
const mockImageBuffer = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
const BOUNDARY = '--------------------------validboundary';

const postDataStart = Buffer.from(
    `--${BOUNDARY}\r\n` +
    `Content-Disposition: form-data; name="image"; filename="test.gif"\r\n` +
    `Content-Type: image/gif\r\n\r\n`
);

const postDataEnd = Buffer.from(`\r\n--${BOUNDARY}--\r\n`);

const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/api/ai/analyze-image',
    method: 'POST',
    headers: {
        'Content-Type': `multipart/form-data; boundary=${BOUNDARY}`,
        'Content-Length': postDataStart.length + mockImageBuffer.length + postDataEnd.length,
        'x-api-key': '3ea88c89-43e8-495b-be3c-56b541a8cc49'
    }
};

const req = http.request(options, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        console.log(`Status: ${res.statusCode}`);
        console.log(`Body: ${data.substring(0, 200)}...`); // Log first 200 chars
        if (res.statusCode === 200) {
             try {
                const json = JSON.parse(data);
                if (json.success) console.log("✅ AI Vision Test PASSED");
                else console.log("❌ AI Vision Test FAILED (API Error)");
             } catch(e) { console.log("❌ AI Vision Test FAILED (Invalid JSON)"); }
        } else {
             console.log("❌ AI Vision Test FAILED (HTTP Error)");
        }
    });
});

req.on('error', (e) => console.error(`Problem with request: ${e.message}`));

req.write(postDataStart);
req.write(mockImageBuffer);
req.write(postDataEnd);
req.end();

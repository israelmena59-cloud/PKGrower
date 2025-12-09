const fetch = require('node-fetch');
require('dotenv').config({ path: require('path').join(__dirname, '.env') });

const API_KEY = process.env.API_KEY || '3ea88c89-43e8-495b-be3c-56b541a8cc49';
const BASE_URL = 'http://localhost:3000';

async function diagnose() {
    console.log('🔍 INICIANDO DIAGNÓSTICO PROFUNDO...');
    console.log(`📡 URL: ${BASE_URL}`);

    // 1. Check Tuya Devices (Raw)
    try {
        console.log('\n[1] Consultando Dispositivos (General)...');
        const res = await fetch(`${BASE_URL}/api/devices`, { headers: { 'x-api-key': API_KEY } });
        const data = await res.json();
        console.log(`   Status: ${res.status}`);
        console.log(`   Keys found: ${Object.keys(data).length}`);
        console.log(`   Sample Data:`, JSON.stringify(data, null, 2).substring(0, 500) + '...');

        if (Object.keys(data).length === 0) {
            console.error('   ❌ ALERTA: La lista de dispositivos está VACÍA.');
        } else if (Object.keys(data).length < 5) {
             console.warn('   ⚠️ ALERTA: Pocos dispositivos encontrados. Posible fallo parcial.');
        } else {
             console.log('   ✅ Dispositivos detectados correctamente.');
        }
    } catch(e) { console.error('   ❌ Error fatal:', e.message); }

    // 2. Check Tuya Specific Diagnostic Endpoint
    try {
        console.log('\n[2] Consultando Diagnóstico Tuya Interno...');
        const res = await fetch(`${BASE_URL}/api/devices/tuya`, { headers: { 'x-api-key': API_KEY } });
        if (res.ok) {
            const data = await res.json();
            console.log(`   Internal Count: ${data.total}`);
            console.log(`   Debug Info:`, JSON.stringify(data.debug, null, 2));
        } else {
            console.log('   Warning: Endpoint /api/devices/tuya no disponible o error 500');
        }
    } catch(e) { console.error('   ❌ Error:', e.message); }

    // 3. Check Gemini (AI)
    try {
        console.log('\n[3] Probando Google Gemini (Generación de Texto)...');
        const res = await fetch(`${BASE_URL}/api/chat`, {
            method: 'POST',
            headers: { 'x-api-key': API_KEY, 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'Respond simply: "OK System Active"' })
        });
        const data = await res.json();
        console.log(`   Status: ${res.status}`);
        console.log(`   Respuesta IA: "${data.reply}"`);

        if (data.reply && (data.reply.includes('OK System') || data.reply.includes('Active'))) {
             console.log('   ✅ IA Respondió correctamente.');
        } else if (data.reply && data.reply.includes('Error')) {
             console.error('   ❌ IA Reportó Error:', data.reply);
        } else {
             console.warn('   ⚠️ Respuesta IA ambigua o fallback.');
        }
    } catch(e) { console.error('   ❌ Error IA:', e.message); }
}

diagnose();

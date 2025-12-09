// const ping = require('ping'); // Removed dependency
// const net = require('net'); // Removed dependency

const TARGETS = [
    { name: 'Humidificador Xiaomi', ip: '192.168.1.13', port: 54321 }, // Puerto UDP usual miio
    { name: 'Cámara Xiaomi', ip: '192.168.1.5', port: 54321 }
];

async function checkNetwork() {
    console.log('=== DIAGNÓSTICO DE RED XIAOMI ===');

    for (const target of TARGETS) {
        console.log(`\nProbando ${target.name} (${target.ip})...`);

        // 1. PING (ICMP)
        try {
            const res = await ping.promise.probe(target.ip, { timeout: 2 });
            if (res.alive) {
                console.log(`   [✓] Ping exitoso: ${res.time}ms`);
            } else {
                console.log(`   [✗] Ping fallido (Host unreachable)`);
            }
        } catch (e) {
            console.log(`   [?] Error de ping: ${e.message}`);
        }

        // 2. SOCKET (TCP handshake check, aunque miio es UDP, a veces responden o al menos rechazan)
        // Nota: miio es UDP, net.connect es TCP. Solo validamos si hay ALGO escuchando o si la IP existe en ARP.
        // Para UDP node puro es mejor dgram, pero verificaremos conectividad básica.
    }
    console.log('\n=== FIN DIAGNÓSTICO ===');
}

// Necesitamos 'ping' library, si no está instalada, intentar ping de sistema
// Fallback manual con child_process si no hay lib
const { exec } = require('child_process');

function systemPing(ip) {
    return new Promise((resolve) => {
        const cmd = process.platform === 'win32' ? `ping -n 1 -w 2000 ${ip}` : `ping -c 1 -W 2 ${ip}`;
        exec(cmd, (err, stdout, stderr) => {
            resolve(!err && stdout.includes('TTL=') || stdout.includes('ttl='));
        });
    });
}

// Sobreescribir funcion principal para usar sistema nativo y no depender de npm install extra
async function checkNetworkNative() {
    console.log('=== DIAGNÓSTICO DE RED XIAOMI (NATIVO) ===');

    for (const target of TARGETS) {
        console.log(`\nProbando ${target.name} (${target.ip})...`);
        const alive = await systemPing(target.ip);
        if (alive) {
             console.log(`   [✓] Ping responde correctamente.`);
        } else {
             console.log(`   [✗] Sin respuesta de Ping. (¿IP Incorrecta? ¿Dispositivo apagado?)`);
        }
    }
}

checkNetworkNative();

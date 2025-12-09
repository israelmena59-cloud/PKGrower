const miHome = require('node-mihome');
require('dotenv').config();

async function interactiveLogin() {
    const user = process.env.XIAOMI_CLOUD_USERNAME;
    const pass = process.env.XIAOMI_CLOUD_PASSWORD;
    const region = process.env.XIAOMI_CLOUD_REGION || 'us';

    console.log(`Intentando login manual en Xiaomi Cloud (${region})...`);
    console.log(`Usuario: ${user}`);

    try {
        await miHome.miCloudProtocol.login(user, pass);
        console.log('¡Login Exitoso!');
        console.log('La sesión debería persistir. Intenta iniciar el servidor ahora.');

        // Listar dispositivos para confirmar
        const devices = await miHome.miCloudProtocol.getDevices();
        console.log(`Dispositivos encontrados: ${devices.length}`);
        devices.forEach(d => console.log(` - ${d.name} (${d.localip})`));

    } catch (e) {
        console.error('ERROR DE LOGIN:', e.message);

        if (e.message.includes('Step 2')) {
            console.log('\n--- DIAGNÓSTICO DE 2FA ---');
            console.log('Xiaomi requiere verificación de dos pasos.');
            console.log('Lamentablemente, esta librería no soporta ingresar el código 2FA interactivamente.');
            console.log('SOLUCIÓN RECOMENDADA:');
            console.log('1. Entra a la app Mi Home en tu móvil.');
            console.log('2. Desactiva temporalmente "Account Security / 2-Step Verification" en tu perfil Xiaomi.');
            console.log('3. Ejecuta este script de nuevo.');
            console.log('4. Una vez logueado, puedes volver a activarlo (a veces el token dura).');
        } else {
             console.log('Revisa usuario/contraseña.');
        }
    }
}

interactiveLogin();

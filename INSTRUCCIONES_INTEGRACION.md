# Guía: Cómo Integrar PKGrower con tus Dispositivos Smart Life (Tuya)

¡Felicidades por llegar a este punto! Esta guía te ayudará a conectar la aplicación PKGrower con tus dispositivos reales.

**ADVERTENCIA IMPORTANTE:** Este proceso implica manejar credenciales sensibles. **NUNCA** compartas estas claves con nadie ni las subas a repositorios públicos como GitHub. Son como las contraseñas de tus dispositivos.

## ¿Qué Necesitas?

1.  **Una cuenta en la app Smart Life (o Tuya Smart)** donde ya tengas tus dispositivos configurados.
2.  **Un ordenador** para seguir los pasos y editar un archivo de texto.
3.  **Paciencia.** El proceso en la plataforma de Tuya puede ser un poco confuso, ¡pero esta guía te ayudará!

---

## Paso 1: Crea una Cuenta de Desarrollador en Tuya IoT

Esto es lo más importante: necesitas una cuenta de *desarrollador*, que es *diferente* a tu cuenta de la app móvil.

1.  Ve a [https://iot.tuya.com/](https://iot.tuya.com/).
2.  Regístrate para obtener una nueva cuenta.

## Paso 2: Crea un Nuevo "Cloud Project"

Una vez dentro de la plataforma Tuya IoT, vamos a crear un proyecto para nuestra aplicación.

1.  En el menú de la izquierda, ve a **Cloud -> Development**.
2.  Haz clic en el botón **Create Cloud Project**.
3.  Rellena el formulario:
    *   **Project Name:** `PKGrower` (o el nombre que prefieras).
    *   **Industry:** `Smart Home`.
    *   **Development Method:** `Smart Home`.
    *   **Data Center:** **¡ESTE ES EL PASO MÁS IMPORTANTE!** Debes elegir la región que corresponda a tu cuenta de la app Smart Life.
        *   *¿Cómo saber tu región?* En la app Smart Life, ve a `Yo > Ajustes (el icono de engranaje) > Cuenta y Seguridad > Región`.
        *   Elige el centro de datos que coincida (ej: "Western Europe Data Center" si tu región es España). Si te equivocas en este paso, tus dispositivos no aparecerán.
4.  Haz clic en **Create**.

## Paso 3: Autoriza los Servicios de API

Tu proyecto necesita permiso para "hablar" con tus dispositivos.

1.  Después de crear el proyecto, verás una pestaña de "APIs" o un asistente de configuración. Haz clic en la pestaña **APIs**.
2.  Asegúrate de que los siguientes servicios estén en la lista de "Authorized APIs". Si no lo están, búscalos y añádelos:
    *   **Smart Home Basic Service**
    *   **Device Status Notification**
3.  Si te pide autorizarlos, haz clic en **Authorize**.

## Paso 4: Vincula tu App Smart Life con el Proyecto

Ahora vamos a decirle a Tuya que este proyecto tiene permiso para ver los dispositivos de tu app.

1.  Dentro de tu proyecto, ve a la pestaña **Devices**.
2.  Haz clic en **Link Tuya App Account -> Add App Account**.
3.  Aparecerá un **código QR**.
4.  Abre tu app **Smart Life**, ve a `Yo` y pulsa el icono de escanear `[+]` que suele estar arriba a la derecha.
5.  Escanea el código QR de la página web con tu móvil y confirma el vínculo en la app.
6.  Para comprobar que ha funcionado, ve a la sub-pestaña **All Devices** en la web. ¡Tus dispositivos deberían aparecer en la lista!

## Paso 5: Obtén tus Credenciales (¡La Parte Importante!)

1.  Vuelve a la vista general de tu proyecto, haciendo clic en la pestaña **Overview**.
2.  Aquí encontrarás tu **Access ID** y tu **Access Secret**.
    *   **Access ID** (también llamado Client ID o API Key).
    *   **Access Secret** (también llamado Client Secret o API Secret).
3.  **¡Copia estos dos valores!**

## Paso 6: Configura el Backend de PKGrower

Ahora que tienes tus claves, vamos a ponerlas en la aplicación.

1.  Abre el archivo `backend/index.js` en tu editor de código.
2.  Busca la sección llamada `--- CREDENCIALES TUYA ---`.
3.  Rellena las variables con los valores que acabas de copiar:
    *   Reemplaza `'AQUI_VA_TU_ACCESS_KEY'` con tu **Access ID**.
    *   Reemplaza `'AQUI_VA_TU_SECRET_KEY'` con tu **Access Secret**.
4.  Busca la variable `apiHost`. En la web de Tuya, donde copiaste tus credenciales, también debería aparecer la URL de la API de tu región. Cópiala y pégala en lugar de `'AQUI_VA_LA_URL_DE_TU_REGION'`.
    *   Ejemplo: `'https://openapi.tuyaus.com'`

## Paso 7: Mapea tus Dispositivos Tuya

Para que la aplicación sepa qué dispositivo es cuál, necesitas sus IDs.

1.  En la web de Tuya IoT, en la pestaña **Devices**, haz clic en uno de tus dispositivos.
2.  Verás el **Device ID**. Cópialo.
3.  En `backend/index.js`, busca la sección `--- MAPEO DE DISPOSITIVOS ---` y pega el ID donde corresponda.
    *   Ejemplo: `interruptorLuces: { id: 'eb123456789abcdefgh' ... }`
4.  Para los `code` de los interruptores, `'switch'` o `'switch_1'` es muy común. Para los sensores, tendrás que explorar la pestaña "Device Debugging" en la plataforma de Tuya para ver los nombres exactos de las funciones (ej: `temp_value`, `humidity_value`).

---

## Integración con Xiaomi Home

La integración con dispositivos Xiaomi se realiza a través de la cuenta de Mi Home en la nube. Necesitarás tus credenciales de usuario y saber la región de tu servidor.

### ¿Qué Necesitas?

1.  **Tu cuenta de Xiaomi Mi Home** (email o ID de usuario) y tu **contraseña**.
2.  Saber en **qué servidor** está registrada tu cuenta de Mi Home (ej: `us` para América, `eu` para Europa, `cn` para China, etc.).

### Paso 1: Obtén tus Credenciales de Xiaomi

1.  **Usuario y Contraseña:** Son los mismos que usas para iniciar sesión en la aplicación Mi Home.
    *   **Importante:** Si usas autenticación de dos factores (2FA), es posible que `node-mihome` tenga problemas para iniciar sesión. Una solución temporal podría ser desactivar el 2FA durante el proceso de configuración, aunque esto reduce la seguridad.
    *   **Verificación de Cuenta:** A veces, Xiaomi requiere una verificación de cuenta adicional. Inicia sesión en [account.xiaomi.com](https://account.xiaomi.com/) desde el mismo ordenador donde estás ejecutando el backend.
2.  **Servidor/Región:** Esta es la región donde tus dispositivos están registrados en la app Mi Home.
    *   Puedes probar con `us`, `eu`, `cn`, `ru`, `tw`, `sg`, `de`.
    *   La región `cn` (China) a menudo tiene la mayor compatibilidad, pero usa la que corresponda a tu ubicación o a la que elegiste al configurar tus dispositivos.

### Paso 2: Configura el Backend de PKGrower para Xiaomi

1.  Abre el archivo `backend/index.js` en tu editor de código.
2.  Busca la sección llamada `--- CREDENCIALES XIAOMI ---`.
3.  Rellena las variables con tus credenciales:
    *   Reemplaza `'AQUI_VA_TU_USUARIO_XIAOMI'` con tu email o ID de usuario de Xiaomi.
    *   Reemplaza `'AQUI_VA_TU_PASSWORD_XIAOMI'` con tu contraseña de Xiaomi.
    *   Reemplaza `'AQUI_VA_TU_SERVIDOR_XIAOMI'` con la región de tu servidor (ej: `'us'` para América).

### Paso 3: Mapea tus Dispositivos Xiaomi

En la sección `DEVICE_MAP` de `backend/index.js`, he añadido marcadores de posición para el humidificador y la cámara.

*   **`humidifier`:** Necesitarás el **Device ID** de tu humidificador Xiaomi. Lo puedes encontrar en la app Mi Home.
    *   Ve a tu dispositivo en la app.
    *   Generalmente, en los ajustes o "Acerca de" del dispositivo, encontrarás el "ID de Dispositivo" (o un equivalente).
*   **`camera`:** De manera similar, para tu cámara Xiaomi, necesitarás su **Device ID**.

**Importante sobre la cámara:** El control de cámaras Xiaomi a través de APIs es notoriamente complejo y limitado. Por ahora, la integración de la cámara será mayormente un marcador de posición que mostrará si está "encendida" o "apagada" de forma simulada en la app, ya que los comandos específicos de streaming o control avanzado suelen requerir soluciones más elaboradas.

---

## Paso 8: ¡Prueba! (Para Tuya y Xiaomi)

1.  Guarda el archivo `backend/index.js`.
2.  En la línea 7 del mismo archivo, cambia `const MODO_SIMULACION = true;` a `const MODO_SIMULACION = false;`.
3.  Abre una terminal, ve a la carpeta `backend` y ejecuta `node index.js`.
4.  Si todo ha ido bien, la consola no debería mostrar errores de conexión y la aplicación web debería empezar a mostrar los datos reales de tus dispositivos.

---

¡Eso es todo! Si tienes problemas, el error más común es haber elegido el "Data Center" incorrecto para Tuya o el "Servidor/Región" incorrecto para Xiaomi. ¡Verifícalos dos veces!
# ✅ PKGrower - Checklist de Verificación

## 📋 Pre-Inicio

- [ ] Node.js instalado (`node --version`)
- [ ] npm instalado (`npm --version`)
- [ ] Carpeta del proyecto accesible
- [ ] PowerShell o cmd abierto en la carpeta raíz

## 🚀 Inicio de Servidores

- [ ] Ejecutar `npm run dev:all` o `.\start.ps1`
- [ ] Esperar a que ambos servidores inicien
- [ ] Ver mensaje "Backend server running on http://localhost:3000"
- [ ] Ver mensaje "VITE ready in XXX ms"

## 🌐 Frontend

- [ ] Abre http://localhost:5173 en el navegador
- [ ] La página carga sin errores
- [ ] Se ve el layout de Material-UI
- [ ] El sidebar navegación es visible
- [ ] El tema claro/oscuro funciona

## 📊 Dashboard

- [ ] Se cargan las tarjetas de sensores
- [ ] Se muestran valores de temperatura, humedad, luz
- [ ] El gráfico histórico se renderiza
- [ ] Los botones de dispositivos están presentes
- [ ] El auto-refresh cada 5 segundos funciona

## 💬 AI Assistant

- [ ] La página de chat carga
- [ ] Se puede escribir un mensaje
- [ ] El botón "Enviar" responde
- [ ] Se recibe respuesta del backend

## 🔌 Control de Dispositivos

- [ ] Se ven los toggles de dispositivos
- [ ] Se puede hacer click en un dispositivo
- [ ] El estado cambia inmediatamente
- [ ] La actualización es visible en el Dashboard

## 📡 API Backend

Terminal 1 (o en PowerShell nuevo):
```powershell
curl http://localhost:3000/api/sensors/latest
```

- [ ] Se obtiene respuesta JSON con sensores
- [ ] Contiene temperatura, humedad, luz
- [ ] Los valores son válidos (números)

## 🔗 Integración

- [ ] Frontend se conecta a backend
- [ ] No hay errores CORS en consola (F12)
- [ ] Las llamadas API están en Network tab
- [ ] Los datos se actualizan correctamente

## 🐛 DevTools (F12)

- [ ] No hay errores en la consola (Console tab)
- [ ] Las llamadas HTTP son 200 OK (Network tab)
- [ ] Los tiempos de respuesta son < 100ms
- [ ] No hay advertencias de TypeScript

## 🎨 Tema y Estilos

- [ ] Material-UI está aplicado
- [ ] No se ve Tailwind CSS
- [ ] Los colores son consistentes
- [ ] El espaciado es uniforme
- [ ] Las tipografías son legibles

## 📦 Dependencias

```powershell
npm list
```

- [ ] React 18.2.0 instalado
- [ ] Material-UI 5.14.8 instalado
- [ ] Vite 5.4.21 instalado
- [ ] Concurrently instalado
- [ ] Dotenv instalado en backend

## 🔐 Variables de Entorno

- [ ] `.env.local` existe con VITE_API_BASE_URL
- [ ] `backend/.env` existe con PORT y MODO_SIMULACION
- [ ] Backend está en modo simulación (`MODO_SIMULACION=true`)
- [ ] Frontend apunta a backend correcto

## 🛠️ Build

```powershell
npm run build
```

- [ ] Build completa sin errores
- [ ] Se crea carpeta `dist/`
- [ ] El tamaño es razonable (< 500KB)

## 📝 Linting

```powershell
npm run lint
```

- [ ] No hay errores eslint
- [ ] Las advertencias están controladas
- [ ] El código sigue estándares

## 🎯 Funcionalidad Completa

- [ ] Puedo ver Dashboard completo
- [ ] Puedo navegar entre páginas
- [ ] El chat funciona
- [ ] Los dispositivos responden
- [ ] Los datos se actualizan
- [ ] No hay crashes o freezes

## 📱 Responsivo (Opcional)

- [ ] Abre DevTools (F12)
- [ ] Toggle "Device Toolbar"
- [ ] Prueba resoluciones:
  - [ ] Mobile (375px)
  - [ ] Tablet (768px)
  - [ ] Desktop (1920px)
- [ ] Layout se adapta correctamente

## 🌙 Tema Oscuro (Opcional)

En el navegador (si hay botón):
- [ ] Cambia a tema oscuro
- [ ] El tema se aplica correctamente
- [ ] El texto es legible
- [ ] Los colores son consistentes

## 🔧 Reset Completo (Si hay problemas)

```powershell
# 1. Detener servidores (Ctrl+C)

# 2. Limpiar
rm -r node_modules
rm -r backend/node_modules
rm -r dist

# 3. Reinstalar
npm install
cd backend; npm install; cd ..

# 4. Iniciar de nuevo
npm run dev:all
```

## 📊 Métricas de Rendimiento

**Acceptable:**
- ✅ Backend response time: < 100ms
- ✅ Frontend load time: < 2s
- ✅ First paint: < 1s
- ✅ Devices score: > 50

## ✅ Final Verification

```
FRONTED: ✅ Running
BACKEND: ✅ Running
API: ✅ Responding
THEME: ✅ Material-UI
INTEGRATION: ✅ Working
```

---

## ✨ Felicidades!

Si todo está marcado como ✅, **¡PKGrower está funcionando correctamente!**

### Próximos Pasos:
1. Explorar las funcionalidades
2. Probar integración con dispositivos reales
3. Personalizar configuración
4. Hacer deploy

### Documentación:
- 📖 `README.md` - Guía principal
- ⚙️ `SETUP.md` - Detalles técnicos
- 🚀 `COMMANDS.md` - Comandos útiles
- 🔗 `INTEGRATION_GUIDE.md` - Integración

---

**Fecha de verificación:** [Tu fecha]
**Estado:** ✅ Funcional
**Última actualización:** 2024

# 📚 PKGrower - Índice de Documentación

Bienvenido a PKGrower. Esta es tu guía rápida de documentación.

## 🚀 Inicio Rápido (5 minutos)

1. **Comienza aquí:** `README.md`
2. **Iniciar servidores:** `.\start.ps1` o `npm run dev:all`
3. **Accede a:** http://localhost:5173

## 📖 Documentación Completa

### 🎯 Guías de Usuario

| Documento | Contenido | Lectura |
|-----------|----------|---------|
| `README.md` | Visión general del proyecto | 10 min |
| `SETUP.md` | Instalación y configuración | 15 min |
| `COMMANDS.md` | Comandos útiles y atajos | 5 min |
| `QUICK_START.ps1` | Script de inicio (ejecutar) | instant |
| `health-check.ps1` | Verificar estado de servicios | instant |

### 🌍 Integración IoT Real (NUEVO)

| Documento | Contenido | Lectura |
|-----------|----------|---------|
| `XIAOMI_COMPLETE.md` | Resumen ejecutivo de integración | 10 min |
| `XIAOMI_QUICK_START.md` | Inicio rápido (10 minutos) | 10 min |
| `XIAOMI_GUIDE.md` | Guía completa con ejemplos | 20 min |
| `XIAOMI_SETUP.md` | Configuración detallada | 30 min |
| `XIAOMI_ADVANCED.md` | Ejemplos avanzados de código | 30 min |
| `xiaomi-setup.ps1` | Script de configuración automática | instant |

### ✅ Verificación

| Documento | Contenido | Lectura |
|-----------|----------|---------|
| `VERIFICATION.md` | Checklist de funcionamiento | 15 min |

## 🎓 Rutas de Aprendizaje

### Si acabas de llegar (Principiante)

1. Lee: `README.md`
2. Ejecuta: `.\start.ps1`
3. Prueba: La aplicación en http://localhost:5173
4. Consulta: `COMMANDS.md` para opciones

**Tiempo:** ~30 minutos

### Si quieres entender la arquitectura (Intermedio)

1. Lee: `README.md`
2. Lee: `ARCHITECTURE.md`
3. Lee: `INTEGRATION_GUIDE.md`
4. Revisa el código en:
   - `src/api/client.ts` (Cliente API)
   - `src/main.tsx` (Tema Material-UI)
   - `src/pages/Dashboard.tsx` (Integración)
   - `backend/index.js` (Servidor)

**Tiempo:** ~2 horas

### Si necesitas hacer cambios (Avanzado)

1. Revisa: `ARCHITECTURE.md`
2. Edita: `src/components` o `src/pages`
3. Verifica: `npm run lint` y `npm run build`
4. Consulta: `MIGRATION_PR_TEMPLATE.md` para commits

**Tiempo:** ~Variable

## 🔍 Búsqueda Rápida

### "¿Cómo inicio la aplicación?"
→ `QUICK_START.ps1` o `SETUP.md`

### "¿Qué comandos disponibles hay?"
→ `COMMANDS.md`

### "¿Cómo está estruturado el código?"
→ `ARCHITECTURE.md`

### "¿Cómo funciona la integración frontend-backend?"
→ `INTEGRATION_GUIDE.md`

### "¿Cómo verifico que todo funciona?"
→ `VERIFICATION.md`

### "¿Cuáles fueron los cambios recientes?"
→ `MIGRATION_PR_TEMPLATE.md` o `STATUS.md`

### "¿Hay problemas?"
→ `SETUP.md` - Sección Troubleshooting

## 📁 Estructura de Archivos

```
PKGrower/
├── README.md                    ← EMPIEZA AQUÍ
├── SETUP.md                     ← Instalación
├── QUICK_START.ps1              ← Script de inicio
├── COMMANDS.md                  ← Comandos rápidos
├── ARCHITECTURE.md              ← Estructura técnica
├── INTEGRATION_GUIDE.md         ← Frontend + Backend
├── MIGRATION_PR_TEMPLATE.md     ← Historial
├── STATUS.md                    ← Estado actual
├── VERIFICATION.md              ← Checklist
└── health-check.ps1             ← Verificador
```

## 🎯 Por Donde Empezar

### ✅ Yo solo quiero usar la app
```
1. Ejecuta: .\start.ps1
2. Abre: http://localhost:5173
3. ¡Disfruta!
```

### 🏠 Yo quiero conectar con mis dispositivos Xiaomi
```
1. Lee: XIAOMI_QUICK_START.md (10 min)
2. Descarga: Token Extractor
3. Obtén: Tokens de tus dispositivos
4. Configura: backend/.env
5. Ejecuta: npm run dev:backend
6. Abre: http://localhost:5173
```

### 🔧 Yo quiero configurar/instalar
```
1. Lee: SETUP.md
2. Ejecuta: npm install
3. Ejecuta: .\start.ps1
```

### 💻 Yo quiero desarrollar/cambiar código
```
1. Lee: ARCHITECTURE.md
2. Lee: INTEGRATION_GUIDE.md
3. Abre: Visual Studio Code
4. Edita: src/components o src/pages
5. Verifica: npm run lint
```

### 🐛 Hay un problema
```
1. Consulta: SETUP.md (Troubleshooting)
2. Ejecuta: .\health-check.ps1
3. Revisa: STATUS.md
```

## 📊 Documentos por Tipo

### Inicio & Setup
- `README.md` - Visión general
- `SETUP.md` - Instalación paso a paso
- `QUICK_START.ps1` - Script automático
- `health-check.ps1` - Verificador

### Uso & Referencia
- `COMMANDS.md` - Comandos npm y CLI
- `VERIFICATION.md` - Checklist de validación
- `STATUS.md` - Estado del proyecto

### Técnico & Desarrollo
- `ARCHITECTURE.md` - Arquitectura del sistema
- `INTEGRATION_GUIDE.md` - Integración API
- `MIGRATION_PR_TEMPLATE.md` - Detalles de cambios

## 🔗 Links Útiles

**Documentación de dependencias:**
- Material-UI: https://mui.com
- React: https://react.dev
- Express: https://expressjs.com
- Vite: https://vitejs.dev
- TypeScript: https://www.typescriptlang.org

**Puertos locales:**
- Frontend: http://localhost:5173
- Backend: http://localhost:3000
- API Test: http://localhost:3000/api/sensors/latest

## ❓ Preguntas Frecuentes

**¿Por dónde empiezo?**
→ Ejecuta `.\start.ps1` y abre http://localhost:5173

**¿Cómo cambio la configuración?**
→ Edita `.env.local` (frontend) o `backend/.env` (backend)

**¿Cómo integro dispositivos reales?**
→ Mira `INTEGRATION_GUIDE.md` - sección "Real Devices"

**¿Cómo hago deploy?**
→ Ejecuta `npm run build` - luego sube el contenido de `dist/`

**¿Dónde reporto problemas?**
→ Consulta `SETUP.md` - Troubleshooting

## 📞 Soporte

- 📖 **Documentación:** Todos los archivos `.md`
- 🔍 **Búsqueda:** Usa Ctrl+F en los documentos
- 🐛 **Problemas:** Consulta `SETUP.md` Troubleshooting
- 💬 **Preguntas:** Revisa este índice

## ✨ Próximos Pasos

1. **Ahora:** Lee `README.md`
2. **Luego:** Ejecuta `.\start.ps1`
3. **Después:** Prueba la aplicación
4. **Finalmente:** Explora el código si lo deseas

---

## 🎉 ¡Listo para Empezar!

```powershell
.\start.ps1
```

**Disfruta PKGrower!** 🌱

---

**Última actualización:** 2024
**Versión:** 1.0.0 Documentation
**Estado:** ✅ Completo

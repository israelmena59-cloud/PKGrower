# Configuración de Cloud Scheduler para PKGrower

## Problema
Cloud Run apaga las instancias cuando no hay tráfico. Esto causa que los `setInterval` no funcionen y no se recolecten datos de sensores ni se ejecuten automatizaciones.

## Solución
Usar **Google Cloud Scheduler** para hacer un ping cada 5 minutos al endpoint `/api/tick`.

---

## Pasos de Configuración

### 1. Habilitar Cloud Scheduler API

```bash
gcloud services enable cloudscheduler.googleapis.com
```

### 2. Crear el Job de Cloud Scheduler

```bash
gcloud scheduler jobs create http pkgrower-tick \
  --location=us-central1 \
  --schedule="*/5 * * * *" \
  --uri="https://YOUR-CLOUD-RUN-URL/api/tick" \
  --http-method=POST \
  --headers="Content-Type=application/json,x-api-key=YOUR_API_KEY" \
  --attempt-deadline=60s \
  --description="Keep PKGrower alive and run background tasks"
```

**Reemplazar:**
- `YOUR-CLOUD-RUN-URL` con la URL de tu servicio Cloud Run
- `YOUR_API_KEY` con tu API key configurada en el backend

### 3. Verificar el Job

```bash
# Listar jobs
gcloud scheduler jobs list --location=us-central1

# Ejecutar manualmente para probar
gcloud scheduler jobs run pkgrower-tick --location=us-central1

# Ver logs
gcloud scheduler jobs describe pkgrower-tick --location=us-central1
```

---

## Endpoint /api/tick

El nuevo endpoint `/api/tick` hace lo siguiente cada vez que es llamado:

1. **Refresca dispositivos Tuya** - Sincroniza el estado de los dispositivos IoT
2. **Ejecuta el scheduler de iluminación** - Verifica si las luces deben estar encendidas/apagadas
3. **Ejecuta reglas de automatización** - Procesa reglas basadas en sensores
4. **Guarda snapshot de sensores** - Persiste datos en Firestore

---

## Costos Estimados

- Cloud Scheduler: **Primeros 3 jobs gratis**, luego $0.10/job/mes
- Llamadas adicionales (*/5 = 288 llamadas/día): ~$0.01/día

---

## Alternativa: Minimum Instances

En lugar de Cloud Scheduler, puedes configurar `--min-instances=1` en Cloud Run para mantener siempre una instancia activa. Esto es más costoso pero más simple.

```bash
gcloud run services update pkgrower \
  --min-instances=1 \
  --region=us-central1
```

**Nota**: Esto mantendrá la instancia activa 24/7 con costo asociado.

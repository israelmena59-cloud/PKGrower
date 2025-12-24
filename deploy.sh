#!/bin/bash
echo "Iniciando despliegue de PKGrower Backend..."
gcloud run deploy pkgrower \
  --source backend \
  --region us-central1 \
  --allow-unauthenticated \
  --quiet

echo "Despliegue completado (o fallido si hubo errores arriba)."

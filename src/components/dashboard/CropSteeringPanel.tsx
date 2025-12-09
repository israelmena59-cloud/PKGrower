import React from 'react';
import { Card, CardContent, CardHeader, Typography, Grid, Box, Alert, Divider, Chip } from '@mui/material';
import { Sprout, Timer, Droplets, ArrowDownRight, TrendingUp, Activity } from 'lucide-react';

interface CropSteeringPanelProps {
  phase: 'vegetative' | 'generative';
  currentVWC: number; // Volumetric Water Content (Humedad Sustrato %)
}

export const CropSteeringPanel: React.FC<CropSteeringPanelProps> = ({ phase, currentVWC }) => {

  // --- CONSTANTES Y CONFIGURACIÓN ---
  // Idealmente esto vendría de una configuración global (Lights On/Off)
  // Asumimos ciclo estándar por ahora:
  // - Vegetativo: 18/6 (On: 06:00, Off: 00:00)
  // - Generativo: 12/12 (On: 08:00, Off: 20:00)

  const lightsOn = phase === 'vegetative' ? 6 : 8;
  const lightsOff = phase === 'vegetative' ? 24 : 20; // 24 = 00:00

  // --- LÓGICA DE CÁLCULO (CROP STEERING) ---

  // P1: Riego de Generación (Ramp Up)
  // Objetivo: Alcanzar Capacidad de Campo (FC) rápidamente.
  // Veg: Menos agresivo (3-5% shots). Gen: Más agresivo (4-6% shots).
  const p1StartTime = lightsOn + 1; // 1 hora después de encender luces
  const p1TargetVWC = phase === 'vegetative' ? 55 : 50; // Ejemplo: Veg requiere más agua disponible
  const p1ShotSize = phase === 'vegetative' ? '3%' : '5%';
  const p1Duration = phase === 'vegetative' ? '2 horas' : '1.5 horas';

  // P2: Mantenimiento
  // Objetivo: Mantener la humedad sin saturar ni secar.
  // Veg: Plano (muchos micros). Gen: Caída controlada o nulo (estrés).
  const p2Strategy = phase === 'vegetative'
    ? 'Mantenimiento Plano: Micro-riegos (1-2%) cada 30-45 min para mantener VWC constante.'
    : 'Mantenimiento Mínimo: Solo si VWC cae bajo 40%. Dejar caer ligeramente (LD).';

  // P3: Dryback (Secado)
  // Objetivo: Secar sustrato para oxigenar raíces (Veg) o generar estrés generativo (Gen).
  // Veg: Dryback moderado (15-20%). Gen: Dryback fuerte (25-30%).
  const p3StopTime = lightsOff - (phase === 'vegetative' ? 2 : 3); // Veg: parar 2h antes. Gen: parar 3h antes.
  const targetDryback = phase === 'vegetative' ? '15-20%' : '25-30%';
  const targetMorningVWC = p1TargetVWC - (phase === 'vegetative' ? 18 : 28); // Estimado

  return (
    <Card sx={{ boxShadow: 3, borderRadius: 2 }}>
      <CardHeader
        title={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Sprout size={24} color={phase === 'vegetative' ? '#4caf50' : '#9c27b0'} />
                <Typography variant="h6" fontWeight="bold">
                    Estrategia de Riego: {phase === 'vegetative' ? 'Vegetativa' : 'Generativa'}
                </Typography>
            </Box>
        }
        subheader={`Directrices automáticas para fase ${phase === 'vegetative' ? 'Crecimiento' : 'Floración'}`}
      />
      <CardContent>
        {/* Resumen Estado Actual */}
        <Box sx={{ mb: 3, p: 2, bgcolor: 'background.default', borderRadius: 2, display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
            <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">VWC Actual</Typography>
                <Typography variant="h4" fontWeight="bold" color="primary.main">{currentVWC.toFixed(1)}%</Typography>
            </Box>
            <Divider orientation="vertical" flexItem />
            <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">Meta P1 (FC)</Typography>
                <Typography variant="h4" fontWeight="bold" color="success.main">{p1TargetVWC}%</Typography>
            </Box>
            <Divider orientation="vertical" flexItem />
            <Box sx={{ textAlign: 'center' }}>
                <Typography variant="caption" color="text.secondary">Meta Dryback</Typography>
                <Typography variant="h4" fontWeight="bold" color="secondary.main">{targetDryback}</Typography>
            </Box>
        </Box>

        <Grid container spacing={3}>
            {/* P1: Ramp Up */}
            <Grid item xs={12} md={4}>
                <Card variant="outlined" sx={{ height: '100%', borderColor: 'success.light' }}>
                    <Box sx={{ p: 1.5, bgcolor: 'rgba(76, 175, 80, 0.1)', borderBottom: '1px solid', borderColor: 'success.light', display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TrendingUp size={18} color="#2e7d32" />
                        <Typography variant="subtitle2" fontWeight="bold" color="success.dark">P1: Ramp Up (Hidratación)</Typography>
                    </Box>
                    <Box sx={{ p: 2 }}>
                        <Typography variant="body2" paragraph>
                            <strong>Inicio:</strong> {p1StartTime}:00 hrs
                        </Typography>
                        <Typography variant="body2" paragraph>
                            <strong>Shot Size:</strong> {p1ShotSize} del volumen de maceta.
                        </Typography>
                        <Typography variant="body2" paragraph>
                            <strong>Duración:</strong> {p1Duration} hasta alcanzar {p1TargetVWC}%.
                        </Typography>
                        <Alert severity="success" sx={{ py: 0, '& .MuiAlert-message': { fontSize: '0.75rem' } }}>
                            {phase === 'vegetative' ? 'Buscar curva suave.' : 'Subir rápido la humedad.'}
                        </Alert>
                    </Box>
                </Card>
            </Grid>

            {/* P2: Maintenance */}
            <Grid item xs={12} md={4}>
                <Card variant="outlined" sx={{ height: '100%', borderColor: 'info.light' }}>
                    <Box sx={{ p: 1.5, bgcolor: 'rgba(3, 169, 244, 0.1)', borderBottom: '1px solid', borderColor: 'info.light', display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Activity size={18} color="#0288d1" />
                        <Typography variant="subtitle2" fontWeight="bold" color="info.dark">P2: Mantenimiento</Typography>
                    </Box>
                    <Box sx={{ p: 2 }}>
                        <Typography variant="body2" paragraph sx={{ minHeight: 60 }}>
                            {p2Strategy}
                        </Typography>
                        <Alert severity="info" sx={{ py: 0, '& .MuiAlert-message': { fontSize: '0.75rem' } }}>
                            {phase === 'vegetative' ? 'No dejar caer VWC.' : 'Permitir pequeña caída (estrés).'}
                        </Alert>
                    </Box>
                </Card>
            </Grid>

            {/* P3: Dryback */}
            <Grid item xs={12} md={4}>
                <Card variant="outlined" sx={{ height: '100%', borderColor: 'secondary.light' }}>
                    <Box sx={{ p: 1.5, bgcolor: 'rgba(156, 39, 176, 0.1)', borderBottom: '1px solid', borderColor: 'secondary.light', display: 'flex', alignItems: 'center', gap: 1 }}>
                        <ArrowDownRight size={18} color="#7b1fa2" />
                        <Typography variant="subtitle2" fontWeight="bold" color="secondary.dark">P3: Dryback (Secado)</Typography>
                    </Box>
                    <Box sx={{ p: 2 }}>
                        <Typography variant="body2" paragraph>
                            <strong>Hora Corte (Stop):</strong> {p3StopTime}:00 hrs
                        </Typography>
                        <Typography variant="body2" paragraph>
                            <strong>Meta Mañana:</strong> ~{targetMorningVWC.toFixed(0)}% VWC
                        </Typography>
                        <Typography variant="body2" paragraph>
                             <strong>Total Dryback:</strong> {targetDryback}
                        </Typography>
                        <Alert severity="secondary" sx={{ py: 0, '& .MuiAlert-message': { fontSize: '0.75rem' } }}>
                            {phase === 'vegetative' ? 'Oxigenación radicular.' : 'Señal Generativa (Fruta).'}
                        </Alert>
                    </Box>
                </Card>
            </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

/**
 * Nutrients Page
 * Athena Pro Line feeding calculator and reference tables
 * Data extracted from Spanish Handbook - Metric DIGITAL V16
 */

import React, { useState, useMemo } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  TextField,
  Slider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  Divider,
  Alert,
  Paper
} from '@mui/material';
import { Beaker, Droplets, Thermometer, Leaf, Calculator, BookOpen } from 'lucide-react';
import {
  PRO_LINE_DOSING,
  ENVIRONMENT_BY_PHASE,
  IRRIGATION_BY_STAGE,
  IRRIGATION_PHASES,
  DRYBACK_TARGETS,
  calculateDosing,
  getPhaseEnvironment,
  getStageIrrigation
} from '../data/athena-nutrients';
import { useCropSteering } from '../context/CropSteeringContext';

type GrowthPhase = 'veg' | 'stretch' | 'bulk' | 'finish';

const PHASE_LABELS: Record<GrowthPhase, string> = {
  veg: 'Vegetativo',
  stretch: 'Estiramiento (S1-4)',
  bulk: 'Engorde (S5-7)',
  finish: 'Finalizar (S8-10)'
};

const PHASE_COLORS: Record<GrowthPhase, string> = {
  veg: '#22c55e',
  stretch: '#eab308',
  bulk: '#f97316',
  finish: '#8b5cf6'
};

const Nutrients: React.FC = () => {
  const { settings } = useCropSteering();
  const [selectedPhase, setSelectedPhase] = useState<GrowthPhase>('veg');
  const [targetEC, setTargetEC] = useState<number>(2.0);

  // Calculate dosing based on target EC
  const dosing = useMemo(() => calculateDosing(targetEC), [targetEC]);

  // Get phase-specific recommendations
  const envTargets = useMemo(() => getPhaseEnvironment(selectedPhase), [selectedPhase]);
  const irrigationTargets = useMemo(() => getStageIrrigation(selectedPhase), [selectedPhase]);

  const handlePhaseChange = (_: React.MouseEvent<HTMLElement>, newPhase: GrowthPhase | null) => {
    if (newPhase) setSelectedPhase(newPhase);
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Beaker size={32} />
          Nutrientes Athena Pro Line
        </Typography>
        <Typography color="text.secondary">
          Calculadora de dosificación y tablas de referencia del Handbook
        </Typography>
      </Box>

      {/* Phase Selector */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>Selecciona la Fase de Crecimiento:</Typography>
        <ToggleButtonGroup
          value={selectedPhase}
          exclusive
          onChange={handlePhaseChange}
          sx={{ flexWrap: 'wrap', gap: 1 }}
        >
          {(Object.keys(PHASE_LABELS) as GrowthPhase[]).map((phase) => (
            <ToggleButton
              key={phase}
              value={phase}
              sx={{
                px: 3,
                py: 1,
                borderRadius: '12px !important',
                border: '1px solid',
                borderColor: selectedPhase === phase ? PHASE_COLORS[phase] : 'divider',
                backgroundColor: selectedPhase === phase ? `${PHASE_COLORS[phase]}20` : 'transparent',
                '&.Mui-selected': {
                  backgroundColor: `${PHASE_COLORS[phase]}30`,
                  borderColor: PHASE_COLORS[phase],
                }
              }}
            >
              {PHASE_LABELS[phase]}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>
      </Box>

      <Grid container spacing={3}>
        {/* EC Calculator */}
        <Grid item xs={12} md={6}>
          <Card sx={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)' }}>
            <CardHeader
              title={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Calculator size={20} /> Calculadora EC</Box>}
              subheader="Dosificación Pro Line (226g/L concentrado)"
            />
            <CardContent>
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle2" gutterBottom>EC Objetivo: {targetEC.toFixed(1)}</Typography>
                <Slider
                  value={targetEC}
                  onChange={(_, v) => setTargetEC(v as number)}
                  min={0.5}
                  max={6.0}
                  step={0.1}
                  marks={[
                    { value: 1, label: '1.0' },
                    { value: 2, label: '2.0' },
                    { value: 3, label: '3.0' },
                    { value: 4, label: '4.0' },
                    { value: 5, label: '5.0' },
                    { value: 6, label: '6.0' },
                  ]}
                  sx={{ color: PHASE_COLORS[selectedPhase] }}
                />
              </Box>

              {dosing && (
                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'rgba(34, 197, 94, 0.1)' }}>
                    <Typography variant="caption" color="text.secondary">Pro Grow/Bloom</Typography>
                    <Typography variant="h4" fontWeight={700} color="success.main">
                      {dosing.proGrowBloom} mL/L
                    </Typography>
                  </Paper>
                  <Paper sx={{ p: 2, textAlign: 'center', bgcolor: 'rgba(59, 130, 246, 0.1)' }}>
                    <Typography variant="caption" color="text.secondary">Pro Core</Typography>
                    <Typography variant="h4" fontWeight={700} color="info.main">
                      {dosing.proCore} mL/L
                    </Typography>
                  </Paper>
                </Box>
              )}

              <Alert severity="info" sx={{ mt: 2 }}>
                Para 10L de agua: {dosing ? `${(dosing.proGrowBloom * 10).toFixed(0)} mL Grow/Bloom + ${(dosing.proCore * 10).toFixed(0)} mL Core` : '-'}
              </Alert>
            </CardContent>
          </Card>
        </Grid>

        {/* Environment Targets */}
        <Grid item xs={12} md={6}>
          <Card sx={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)' }}>
            <CardHeader
              title={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Thermometer size={20} /> Entorno Recomendado</Box>}
              subheader={`Fase: ${PHASE_LABELS[selectedPhase]}`}
            />
            <CardContent>
              {envTargets && (
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary">Temperatura</Typography>
                      <Typography variant="h5" fontWeight={600}>
                        {envTargets.tempMin}° - {envTargets.tempMax}°C
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary">Humedad</Typography>
                      <Typography variant="h5" fontWeight={600}>
                        {envTargets.rhMin}% - {envTargets.rhMax}%
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary">VPD</Typography>
                      <Typography variant="h5" fontWeight={600}>
                        {envTargets.vpdMin} - {envTargets.vpdMax} kPa
                      </Typography>
                    </Paper>
                  </Grid>
                  <Grid item xs={6}>
                    <Paper sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="caption" color="text.secondary">PPFD</Typography>
                      <Typography variant="h5" fontWeight={600}>
                        {envTargets.ppfdMin} - {envTargets.ppfdMax}
                      </Typography>
                    </Paper>
                  </Grid>
                </Grid>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Irrigation/Substrate */}
        <Grid item xs={12} md={6}>
          <Card sx={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)' }}>
            <CardHeader
              title={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><Droplets size={20} /> Riego y Sustrato</Box>}
            />
            <CardContent>
              {irrigationTargets && (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">EC Sustrato</Typography>
                      <Typography variant="h5" fontWeight={600}>
                        {irrigationTargets.ecSubstrateMin} - {irrigationTargets.ecSubstrateMax}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">Dryback</Typography>
                      <Typography variant="h5" fontWeight={600}>
                        {irrigationTargets.drybackMin}% - {irrigationTargets.drybackMax}%
                      </Typography>
                    </Box>
                    <Chip
                      label={irrigationTargets.strategy === 'vegetative' ? 'Vegetativo' : 'Generativo'}
                      color={irrigationTargets.strategy === 'vegetative' ? 'success' : 'warning'}
                    />
                  </Box>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" gutterBottom>Fases de Riego:</Typography>
                  {Object.entries(IRRIGATION_PHASES).map(([key, phase]) => (
                    <Box key={key} sx={{ mb: 1, p: 1, borderRadius: 1, bgcolor: 'rgba(255,255,255,0.03)' }}>
                      <Typography variant="body2" fontWeight={600}>{phase.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{phase.timing}</Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Dosing Reference Table */}
        <Grid item xs={12} md={6}>
          <Card sx={{ background: 'rgba(255,255,255,0.05)', backdropFilter: 'blur(10px)' }}>
            <CardHeader
              title={<Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><BookOpen size={20} /> Tabla de Dosificación</Box>}
              subheader="Pro Line (mL/L a 226g/L concentrado)"
            />
            <CardContent sx={{ p: 0 }}>
              <TableContainer sx={{ maxHeight: 300 }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell>EC</TableCell>
                      <TableCell align="right">Pro Grow/Bloom</TableCell>
                      <TableCell align="right">Pro Core</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {PRO_LINE_DOSING.map((row) => (
                      <TableRow
                        key={row.targetEC}
                        sx={{
                          bgcolor: Math.abs(row.targetEC - targetEC) < 0.3 ? 'rgba(34, 197, 94, 0.15)' : 'inherit'
                        }}
                      >
                        <TableCell>{row.targetEC.toFixed(1)}</TableCell>
                        <TableCell align="right">{row.proGrowBloom} mL</TableCell>
                        <TableCell align="right">{row.proCore} mL</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Nutrients;

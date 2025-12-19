/**
 * Nutrients Module - AI-Coated
 * Integrated Athena Calculator & Traceability Tracker
 */
import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Grid, Slider, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Chip, ToggleButton, ToggleButtonGroup, Divider, Alert, Tabs, Tab, TextField
} from '@mui/material';
import { Beaker, Droplets, Thermometer, Calculator, BookOpen, FlaskConical, History, Save } from 'lucide-react';
import { useCropSteering } from '../context/CropSteeringContext';
import { GlassCard, MetricCard } from '../components/common/GlassUI';
import NutrientTracker from '../components/cropsteering/NutrientTracker';
import {
  PRO_LINE_DOSING, ENVIRONMENT_BY_PHASE, IRRIGATION_PHASES, SHOT_VOLUMES,
  calculateDosing, getPhaseEnvironment, getStageIrrigation
} from '../data/athena-nutrients';

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
    const [waterVolume, setWaterVolume] = useState<number>(10);
    const [activeTab, setActiveTab] = useState(0);

    // Fade/Cleanse/Balance mix config
    const [fadeAmount, setFadeAmount] = useState<number>(0);
    const [cleanseAmount, setCleanseAmount] = useState<number>(0);
    const [balanceAmount, setBalanceAmount] = useState<number>(0);

    const dosing = useMemo(() => calculateDosing(targetEC), [targetEC]);
    const envTargets = useMemo(() => getPhaseEnvironment(selectedPhase), [selectedPhase]);
    const irrigationTargets = useMemo(() => getStageIrrigation(selectedPhase), [selectedPhase]);

    const handlePhaseChange = (_: any, newPhase: GrowthPhase | null) => {
        if (newPhase) setSelectedPhase(newPhase);
    };

    const phaseColor = PHASE_COLORS[selectedPhase];

    return (
        <Box sx={{ maxWidth: 1600, mx: 'auto', p: { xs: 2, md: 4 } }}>
            {/* Header */}
            <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                    <Typography variant="h4" fontWeight="800" className="ai-gradient-text" sx={{ mb: 1 }}>
                        Nutrientes & Alimentación
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Athena Pro Line • Trazabilidad • Calculadora IA
                    </Typography>
                </Box>
            </Box>

            {/* Main Tabs */}
            <GlassCard sx={{ mb: 4, p: 0, overflow: 'hidden' }}>
                <Tabs
                    value={activeTab}
                    onChange={(_, v) => setActiveTab(v)}
                    textColor="secondary"
                    indicatorColor="secondary"
                    sx={{ borderBottom: '1px solid rgba(255,255,255,0.1)', px: 2, pt: 2 }}
                >
                    <Tab icon={<Calculator size={20} />} label="Calculadora Athena" iconPosition="start" />
                    <Tab icon={<History size={20} />} label="Trazabilidad (Tracker)" iconPosition="start" />
                    <Tab icon={<BookOpen size={20} />} label="Tablas de Referencia" iconPosition="start" />
                </Tabs>

                <Box sx={{ p: 4 }}>
                    {/* TAB 0: CALCULATOR */}
                    {activeTab === 0 && (
                        <Grid container spacing={4}>
                             {/* Phase Selector */}
                             <Grid item xs={12}>
                                <Typography variant="subtitle2" gutterBottom color="text.secondary">SELECCIONAR FASE DE CULTIVO</Typography>
                                <ToggleButtonGroup
                                    value={selectedPhase}
                                    exclusive
                                    onChange={handlePhaseChange}
                                    sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}
                                >
                                    {(Object.keys(PHASE_LABELS) as GrowthPhase[]).map((phase) => (
                                        <ToggleButton
                                            key={phase}
                                            value={phase}
                                            sx={{
                                                flex: 1,
                                                borderRadius: '16px !important',
                                                border: '1px solid rgba(255,255,255,0.1) !important',
                                                color: selectedPhase === phase ? '#fff' : 'text.secondary',
                                                bgcolor: selectedPhase === phase ? `${PHASE_COLORS[phase]}40` : 'transparent',
                                                '&:hover': { bgcolor: `${PHASE_COLORS[phase]}20` },
                                                '&.Mui-selected': { bgcolor: `${PHASE_COLORS[phase]}40`, color: '#fff', borderColor: PHASE_COLORS[phase] }
                                            }}
                                        >
                                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                <Typography fontWeight="bold">{PHASE_LABELS[phase]}</Typography>
                                            </Box>
                                        </ToggleButton>
                                    ))}
                                </ToggleButtonGroup>
                             </Grid>

                             {/* Calculator Controls */}
                             <Grid item xs={12} lg={6}>
                                <GlassCard sx={{ bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                                        <Box sx={{ p: 1, borderRadius: '12px', bgcolor: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6' }}>
                                            <FlaskConical size={24} />
                                        </Box>
                                        <Typography variant="h6" fontWeight="bold">Calculadora de Mezcla</Typography>
                                    </Box>

                                    <Grid container spacing={3}>
                                        <Grid item xs={12} md={6}>
                                            <Typography gutterBottom>Volumen de Agua (Litros)</Typography>
                                            <TextField
                                                fullWidth type="number" value={waterVolume}
                                                onChange={(e) => setWaterVolume(Number(e.target.value))}
                                                InputProps={{ sx: { borderRadius: '12px', bgcolor: 'rgba(0,0,0,0.2)' } }}
                                            />
                                        </Grid>
                                        <Grid item xs={12} md={6}>
                                            <Typography gutterBottom>EC Objetivo: <span style={{ color: phaseColor, fontWeight: 'bold' }}>{targetEC.toFixed(1)}</span></Typography>
                                            <Slider
                                                value={targetEC} onChange={(_, v) => setTargetEC(v as number)}
                                                min={0.5} max={4.0} step={0.1}
                                                sx={{ color: phaseColor }}
                                            />
                                        </Grid>
                                    </Grid>

                                    <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.1)' }} />

                                    {/* Results */}
                                    {dosing && (
                                        <Grid container spacing={2}>
                                            <Grid item xs={6}>
                                                <Box sx={{ p: 2, borderRadius: '16px', bgcolor: 'rgba(34, 197, 94, 0.1)', border: '1px solid rgba(34, 197, 94, 0.3)', textAlign: 'center' }}>
                                                    <Typography variant="caption" color="#22c55e" fontWeight="bold">PRO GROW/BLOOM</Typography>
                                                    <Typography variant="h3" fontWeight="bold" sx={{ my: 1 }}>{(dosing.proGrowBloom * waterVolume).toFixed(0)}</Typography>
                                                    <Typography variant="caption" color="text.secondary">mililitros</Typography>
                                                </Box>
                                            </Grid>
                                            <Grid item xs={6}>
                                                <Box sx={{ p: 2, borderRadius: '16px', bgcolor: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', textAlign: 'center' }}>
                                                    <Typography variant="caption" color="#3b82f6" fontWeight="bold">PRO CORE</Typography>
                                                    <Typography variant="h3" fontWeight="bold" sx={{ my: 1 }}>{(dosing.proCore * waterVolume).toFixed(0)}</Typography>
                                                    <Typography variant="caption" color="text.secondary">mililitros</Typography>
                                                </Box>
                                            </Grid>
                                        </Grid>
                                    )}
                                </GlassCard>
                             </Grid>

                             {/* Environment Targets */}
                             <Grid item xs={12} lg={6}>
                                {envTargets && (
                                    <Grid container spacing={2} sx={{ height: '100%' }}>
                                        <Grid item xs={6}>
                                            <MetricCard label="Temp Objetivo" value={`${envTargets.tempMin}-${envTargets.tempMax}`} unit="°C" icon={Thermometer} color="#f59e0b" />
                                        </Grid>
                                        <Grid item xs={6}>
                                            <MetricCard label="Humedad Objetivo" value={`${envTargets.rhMin}-${envTargets.rhMax}`} unit="%" icon={Droplets} color="#3b82f6" />
                                        </Grid>
                                        <Grid item xs={6}>
                                            <MetricCard label="VPD Objetivo" value={`${envTargets.vpdMin}-${envTargets.vpdMax}`} unit="kPa" icon={Calculator} color="#10b981" />
                                        </Grid>
                                        <Grid item xs={6}>
                                            <MetricCard label="PPFD" value={`${envTargets.ppfdMin}-${envTargets.ppfdMax}`} unit="umol" icon={Beaker} color="#8b5cf6" />
                                        </Grid>
                                    </Grid>
                                )}
                             </Grid>
                        </Grid>
                    )}

                    {/* TAB 1: TRACKER */}
                    {activeTab === 1 && (
                        <Box>
                            <Alert severity="info" sx={{ mb: 3, borderRadius: '12px', bgcolor: 'rgba(33, 150, 243, 0.1)' }}>
                                Los registros de nutrientes se guardan localmente para trazabilidad completa.
                            </Alert>
                            <NutrientTracker />
                        </Box>
                    )}

                    {/* TAB 2: TABLES */}
                    {activeTab === 2 && (
                         <Grid container spacing={3}>
                            <Grid item xs={12} lg={6}>
                                <GlassCard>
                                    <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>Tabla de Dosificación (mL/L)</Typography>
                                    <TableContainer>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell sx={{ color: 'text.secondary' }}>EC Target</TableCell>
                                                    <TableCell align="right" sx={{ color: 'text.secondary' }}>Grow/Bloom</TableCell>
                                                    <TableCell align="right" sx={{ color: 'text.secondary' }}>Core</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {PRO_LINE_DOSING.map((row) => (
                                                    <TableRow key={row.targetEC} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                                        <TableCell component="th" scope="row" fontWeight="bold" sx={{ color: '#fff' }}>
                                                            {row.targetEC.toFixed(1)}
                                                        </TableCell>
                                                        <TableCell align="right">{row.proGrowBloom}</TableCell>
                                                        <TableCell align="right">{row.proCore}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </GlassCard>
                            </Grid>
                            <Grid item xs={12} lg={6}>
                                <GlassCard>
                                    <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>Entorno por Fase</Typography>
                                    <TableContainer>
                                        <Table size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell sx={{ color: 'text.secondary' }}>Fase</TableCell>
                                                    <TableCell sx={{ color: 'text.secondary' }}>Temp</TableCell>
                                                    <TableCell sx={{ color: 'text.secondary' }}>VPD</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {ENVIRONMENT_BY_PHASE.map((row) => (
                                                    <TableRow key={row.phase}>
                                                        <TableCell sx={{ textTransform: 'capitalize', color: '#fff', fontWeight: 'bold' }}>{row.phase}</TableCell>
                                                        <TableCell>{row.tempMin}-{row.tempMax}°C</TableCell>
                                                        <TableCell>{row.vpdMin}-{row.vpdMax}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                </GlassCard>
                            </Grid>
                         </Grid>
                    )}
                </Box>
            </GlassCard>
        </Box>
    );
};

export default Nutrients;

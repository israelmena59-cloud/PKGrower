
import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Grid, Slider, Switch, FormControlLabel, TextField, Button, CircularProgress, IconButton } from '@mui/material';
import { Sun, Moon, Zap, Activity, Info, AlertTriangle, Lightbulb } from 'lucide-react';
import { apiClient } from '../api/client';
import { useAuth } from '../context/AuthContext';

// --- TYPES ---
type SpectrumMode = 'veg' | 'flower' | 'final';

// --- COMPONENTS ---
const SpectrumCard = ({
    mode,
    active,
    onClick,
    title,
    desc,
    color
}: {
    mode: SpectrumMode,
    active: boolean,
    onClick: () => void,
    title: string,
    desc: string,
    color: string
}) => (
    <Paper
        onClick={onClick}
        elevation={0}
        sx={{
            p: 3,
            cursor: 'pointer',
            borderRadius: '16px',
            border: active ? `2px solid ${color}` : '1px solid rgba(255,255,255,0.1)',
            background: active
                ? `linear-gradient(135deg, ${color}22 0%, ${color}05 100%)`
                : 'var(--glass-bg)',
            backdropFilter: 'var(--backdrop-blur)',
            transition: 'all 0.3s ease',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: 1,
            '&:hover': {
                transform: 'translateY(-2px)',
                boxShadow: `0 8px 24px ${color}33`
            }
        }}
    >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
             <Box sx={{ bgcolor: `${color}22`, p: 1, borderRadius: '12px' }}>
                <Sun size={24} color={color} />
             </Box>
             {active && (
                 <Box sx={{ bgcolor: color, borderRadius: '20px', px: 1.5, py: 0.5 }}>
                     <Typography variant="caption" sx={{ color: '#000', fontWeight: 'bold' }}>ACTIVO</Typography>
                 </Box>
             )}
        </Box>
        <Typography variant="h6" fontWeight="bold" sx={{ mt: 1 }}>{title}</Typography>
        <Typography variant="body2" color="text.secondary">{desc}</Typography>

        {/* Spectrum visualizer bar */}
        <Box sx={{ display: 'flex', height: 6, borderRadius: 4, mt: 2, overflow: 'hidden', opacity: 0.8 }}>
            {mode === 'veg' && (
                <>
                    <Box sx={{ flex: 6, bgcolor: '#3b82f6' }} />
                    <Box sx={{ flex: 3, bgcolor: '#ef4444' }} />
                    <Box sx={{ flex: 1, bgcolor: '#ffffff' }} />
                </>
            )}
            {mode === 'flower' && (
                <>
                    <Box sx={{ flex: 3, bgcolor: '#3b82f6' }} />
                    <Box sx={{ flex: 6, bgcolor: '#ef4444' }} />
                    <Box sx={{ flex: 1, bgcolor: '#ffffff' }} />
                </>
            )}
             {mode === 'final' && (
                <>
                    <Box sx={{ flex: 2, bgcolor: '#3b82f6' }} />
                    <Box sx={{ flex: 4, bgcolor: '#ef4444' }} />
                    <Box sx={{ flex: 4, bgcolor: '#8b5cf6' }} />
                </>
            )}
        </Box>
    </Paper>
);

const Lighting: React.FC = () => {
    const { user } = useAuth();

    // STATE
    const [intensity, setIntensity] = useState<number>(75);
    const [mode, setMode] = useState<SpectrumMode>('flower');
    const [emerson, setEmerson] = useState<boolean>(false);

    // DLI Calculator State
    const [ppfd, setPpfd] = useState<string>('800');
    const [hours, setHours] = useState<string>('12');
    const [dli, setDli] = useState<number>(0);

    // Calculate DLI on change
    useEffect(() => {
        const p = parseFloat(ppfd);
        const h = parseFloat(hours);
        if (!isNaN(p) && !isNaN(h)) {
            // Formula: PPFD * Hours * 3600 / 1000000 -> approx PPFD * Hours * 0.0036
            setDli(parseFloat((p * h * 0.0036).toFixed(1)));
        }
    }, [ppfd, hours]);

    return (
        <Box sx={{ maxWidth: 1600, mx: 'auto', p: { xs: 2, md: 4 } }}>
            {/* Header */}
            <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                    <Typography variant="h4" fontWeight="800" className="ai-gradient-text" sx={{ mb: 1 }}>
                        Control Fotónico
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Gestión avanzada de espectro y densidad fotónica (DLI)
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                     <Paper sx={{ px: 2, py: 1, borderRadius: '12px', background: 'rgba(251, 191, 36, 0.1)', border: '1px solid rgba(251, 191, 36, 0.3)', display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Sun size={20} color="#fbbf24" />
                        <Box>
                            <Typography variant="caption" sx={{ color: '#fbbf24', display: 'block', lineHeight: 1 }}>INTENSIDAD</Typography>
                            <Typography variant="body1" fontWeight="bold" sx={{ color: '#fbbf24', lineHeight: 1 }}>{intensity}%</Typography>
                        </Box>
                     </Paper>
                </Box>
            </Box>

            <Grid container spacing={3}>
                {/* LEFT COL: SPECTRUM & CONTROLS */}
                <Grid item xs={12} lg={8}>
                    {/* Main Intensity Control */}
                    <Paper elevation={0} sx={{ p: 4, mb: 3, borderRadius: '24px', background: 'var(--glass-bg)', backdropFilter: 'var(--backdrop-blur)', border: 'var(--glass-border)' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4 }}>
                            <Typography variant="h6" fontWeight="bold">Potencia Global (PPF)</Typography>
                            <Zap size={24} color="#fbbf24" />
                        </Box>

                        <Slider
                            value={intensity}
                            onChange={(_, v) => setIntensity(v as number)}
                            valueLabelDisplay="on"
                            step={5}
                            marks
                            min={0}
                            max={100}
                            sx={{
                                height: 8,
                                '& .MuiSlider-thumb': {
                                    width: 28,
                                    height: 28,
                                    boxShadow: '0 0 20px rgba(34, 197, 94, 0.5)',
                                },
                                '& .MuiSlider-track': {
                                    background: 'linear-gradient(90deg, #22c55e, #fbbf24)'
                                },
                                '& .MuiSlider-rail': {
                                    opacity: 0.1
                                }
                            }}
                        />
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                            Ajuste directo al driver del panel. Recomendado: 75% para Floración Semana 1-4.
                        </Typography>
                    </Paper>

                    {/* Spectrum Modes */}
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={4}>
                            <SpectrumCard
                                title="Vegetativo"
                                desc="Alto Azul (450nm) para entrenudos cortos."
                                mode="veg"
                                color="#3b82f6"
                                active={mode === 'veg'}
                                onClick={() => setMode('veg')}
                            />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <SpectrumCard
                                title="Floración"
                                desc="Full Spectrum equilibrado para biomasa."
                                mode="flower"
                                color="#ef4444"
                                active={mode === 'flower'}
                                onClick={() => setMode('flower')}
                            />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <SpectrumCard
                                title="Ultravioleta (UV)"
                                desc="Estrés controlado para resina (Fin de ciclo)."
                                mode="final"
                                color="#8b5cf6"
                                active={mode === 'final'}
                                onClick={() => setMode('final')}
                            />
                        </Grid>
                    </Grid>
                </Grid>

                {/* RIGHT COL: TOOLS & EMERSON */}
                <Grid item xs={12} lg={4}>
                    {/* Emerson Effect Toggle */}
                    <Paper elevation={0} sx={{ p: 3, mb: 3, borderRadius: '20px', background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.1) 0%, rgba(220, 38, 38, 0.05) 100%)', border: '1px solid rgba(220, 38, 38, 0.3)' }}>
                         <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                            <Box>
                                <Typography variant="h6" fontWeight="bold" sx={{ color: '#fca5a5' }}>Efecto Emerson</Typography>
                                <Typography variant="caption" sx={{ color: '#fca5a5', opacity: 0.8 }}>
                                    Boost Rojo Lejano (730nm)
                                </Typography>
                            </Box>
                            <Switch
                                checked={emerson}
                                onChange={(e) => setEmerson(e.target.checked)}
                                sx={{
                                    '& .MuiSwitch-switchBase.Mui-checked': { color: '#ef4444' },
                                    '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { backgroundColor: '#ef4444' },
                                }}
                            />
                         </Box>
                         {emerson && (
                             <Box sx={{ mt: 2, p: 1.5, bgcolor: 'rgba(220, 38, 38, 0.2)', borderRadius: '8px', display: 'flex', gap: 1 }}>
                                 <AlertTriangle size={16} color="#fca5a5" />
                                 <Typography variant="caption" sx={{ color: '#fca5a5' }}>
                                     Activo: 15 min antes y después de apagar luces. Acelera el ciclo de sueño.
                                 </Typography>
                             </Box>
                         )}
                    </Paper>

                    {/* DLI Calculator */}
                    <Paper elevation={0} sx={{ p: 3, borderRadius: '24px', background: 'var(--glass-bg)', backdropFilter: 'var(--backdrop-blur)', border: 'var(--glass-border)' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                            <Activity size={20} color="#22c55e" />
                            <Typography variant="h6" fontWeight="bold">Calculadora DLI</Typography>
                        </Box>

                        <Grid container spacing={2}>
                            <Grid item xs={6}>
                                <TextField
                                    label="PPFD (umol)"
                                    value={ppfd}
                                    onChange={(e) => setPpfd(e.target.value)}
                                    type="number"
                                    fullWidth
                                    variant="outlined"
                                    size="small"
                                />
                            </Grid>
                            <Grid item xs={6}>
                                <TextField
                                    label="Horas Luz"
                                    value={hours}
                                    onChange={(e) => setHours(e.target.value)}
                                    type="number"
                                    fullWidth
                                    variant="outlined"
                                    size="small"
                                />
                            </Grid>
                        </Grid>

                        <Box sx={{ mt: 3, textAlign: 'center', p: 2, bgcolor: 'rgba(0,0,0,0.2)', borderRadius: '16px' }}>
                            <Typography variant="caption" color="text.secondary">INTEGRAL LUZ DIARIA</Typography>
                            <Typography variant="h2" fontWeight="800" sx={{ color: dli > 45 ? '#f59e0b' : (dli < 20 ? '#ef4444' : '#22c55e') }}>
                                {dli}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">mol/m²/día</Typography>
                        </Box>

                        <Box sx={{ mt: 2 }}>
                            {dli < 25 && <Typography variant="caption" sx={{ color: '#ef4444', display: 'flex', alignItems: 'center', gap: 0.5 }}><Info size={12}/> Bajo para Floración</Typography>}
                            {dli >= 25 && dli <= 45 && <Typography variant="caption" sx={{ color: '#22c55e', display: 'flex', alignItems: 'center', gap: 0.5 }}><Info size={12}/> Óptimo con CO2 ambiental</Typography>}
                            {dli > 45 && <Typography variant="caption" sx={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 0.5 }}><Info size={12}/> Requiere CO2 suplementario</Typography>}
                        </Box>
                    </Paper>
                </Grid>

                {/* BOTTOM ROW: DEVICE CONTROL */}
                <Grid item xs={12}>
                    <Typography variant="h5" fontWeight="bold" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Lightbulb size={24} className="text-yellow-400" />
                        Dispositivos Conectados
                    </Typography>

                    <Paper elevation={0} sx={{ p: 3, borderRadius: '24px', background: 'var(--glass-bg)', backdropFilter: 'var(--backdrop-blur)', border: 'var(--glass-border)' }}>
                        <DeviceControlSection />
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};

// --- SUB-COMPONENTS ---

const DeviceControlSection = () => {
    const [devices, setDevices] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchDevices = async () => {
        setLoading(true);
        try {
            const allDevs = await apiClient.getAllDevices();
            // Filter for lights or switches that might be lights
            const lights = allDevs.filter(d => d.type === 'light' || d.type === 'switch');

            if (lights.length > 0) {
                // Robust parsing for status
                const parsedLights = lights.map(d => {
                    let isActive = false;
                    const s = d.status;
                    if (typeof s === 'boolean') isActive = s;
                    else if (typeof s === 'string') {
                        const low = s.toLowerCase();
                        isActive = low === 'on' || low === 'true' || low === '1';
                    } else if (typeof s === 'number') {
                        isActive = s === 1;
                    }
                    return { ...d, status: isActive };
                });
                setDevices(parsedLights);
            } else {
                // Fallback Simulation if no real devices found
                setDevices([
                    { id: 'sim_main', name: 'Panel Principal LED', type: 'light', status: true, platform: 'tuya' },
                    { id: 'sim_uv', name: 'Barras UV Suplementarias', type: 'light', status: false, platform: 'meross' },
                    { id: 'sim_side', name: 'Luz Lateral', type: 'light', status: true, platform: 'tuya' }
                ]);
            }
        } catch (e) {
            console.error("Error fetching lighting devices", e);
             setDevices([
                { id: 'err_main', name: 'Panel Principal (Simul)', type: 'light', status: true, platform: 'sim' },
                { id: 'err_uv', name: 'UV Boost (Simul)', type: 'light', status: false, platform: 'sim' }
            ]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDevices();
        const interval = setInterval(fetchDevices, 5000); // Poll every 5s
        return () => clearInterval(interval);
    }, []);

    const handleRefresh = () => {
        fetchDevices();
    };

    const handleToggle = async (id: string, currentStatus: boolean) => {
        // Optimistic update
        setDevices(prev => prev.map(d => d.id === id ? { ...d, status: !currentStatus } : d));
        try {
            if (!id.startsWith('sim_') && !id.startsWith('err_')) {
               await apiClient.controlDevice(id, !currentStatus ? 'on' : 'off');
            }
        } catch (e) {
            console.error("Failed to toggle device", e);
            // Revert on failure
            setDevices(prev => prev.map(d => d.id === id ? { ...d, status: currentStatus } : d));
        }
    };

    const handleMasterToggle = async (turnOn: boolean) => {
        // Optimistic
        setDevices(prev => prev.map(d => ({ ...d, status: turnOn })));

        // Parallel requests
        const realDevices = devices.filter(d => !d.id.startsWith('sim_') && !d.id.startsWith('err_'));
        await Promise.allSettled(realDevices.map(d => apiClient.controlDevice(d.id, turnOn ? 'on' : 'off')));
    };

    const allOn = devices.every(d => d.status);

    if (loading) return <Box sx={{ p: 4, display: 'flex', justifyContent: 'center' }}><CircularProgress /></Box>;

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Button
                    onClick={handleRefresh}
                    disabled={loading}
                    size="small"
                    sx={{ color: 'text.secondary', textTransform: 'none' }}
                >
                    {loading ? 'Buscando...' : 'Refrescar Dispositivos'}
                </Button>
            </Box>

            {/* Master Control */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, pb: 2, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <Box>
                    <Typography variant="subtitle1" fontWeight="bold">Control Maestro</Typography>
                    <Typography variant="caption" color="text.secondary">{devices.length} dispositivos detectados</Typography>
                </Box>
                <Button
                    variant={allOn ? "contained" : "outlined"}
                    color={allOn ? "error" : "success"}
                    onClick={() => handleMasterToggle(!allOn)}
                    startIcon={<PowerIcon size={18} />}
                >
                    {allOn ? "APAGAR TODO" : "ENCENDER TODO"}
                </Button>
            </Box>

            {/* Individual Cards */}
            <Grid container spacing={2}>
                {devices.map((device) => (
                    <Grid item xs={12} sm={6} md={4} key={device.id}>
                        <Paper sx={{
                            p: 2,
                            borderRadius: '16px',
                            bgcolor: device.status ? 'rgba(34, 197, 94, 0.1)' : 'rgba(255,255,255,0.03)',
                            border: device.status ? '1px solid #22c55e' : '1px solid rgba(255,255,255,0.1)',
                            transition: 'all 0.3s ease',
                            '&:hover': { transform: 'translateY(-2px)' }
                        }}>
                             <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                <Typography variant="subtitle2" fontWeight="bold">{device.name}</Typography>
                                <Switch
                                    checked={!!device.status}
                                    onChange={() => handleToggle(device.id, device.status)}
                                    color="success"
                                />
                             </Box>
                             <Typography variant="caption" sx={{ color: device.status ? '#22c55e' : 'text.secondary', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Zap size={12} /> {device.status ? 'ENCENDIDO' : 'APAGADO'}
                             </Typography>
                        </Paper>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
};

const PowerIcon = ({ size }: { size: number }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line></svg>
);

export default Lighting;

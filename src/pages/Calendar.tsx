import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Grid, List, ListItem, ListItemIcon, ListItemText, Divider,
  Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField,
  FormControl, InputLabel, Select, MenuItem, Tabs, Tab, Switch, Chip, Alert, IconButton
} from '@mui/material';
import {
  Droplet, Sun, Scissors, AlertCircle, Calendar as CalIcon, Plus, Zap,
  Clock, TrendingUp, Database, Play, Pause, Sprout
} from 'lucide-react';
import { API_BASE_URL, apiClient } from '../api/client';
import { useCropSteering } from '../context/CropSteeringContext';
import HistoryChart from '../components/dashboard/HistoryChart';
import { GlassCard, MetricCard, GlassButton } from '../components/common/GlassUI';
import PlantInventory from '../components/cropsteering/PlantInventory';

interface CalendarEvent {
  id?: string;
  title: string;
  date: string;
  type: 'water' | 'light' | 'prune' | 'issue' | 'automation' | 'other';
  description?: string;
}

interface AutomationRule {
  id: string;
  name: string;
  enabled: boolean;
  trigger: {
    type: 'time' | 'sensor' | 'condition';
    value: string;
    operator?: '>' | '<' | '==' | '!=';
    threshold?: number;
  };
  action: {
    device: string;
    command: 'on' | 'off' | 'pulse';
    duration?: number;
  };
  lastRun?: string;
}

const DEFAULT_RULES: AutomationRule[] = [
  {
    id: '1', name: 'Luces ON 6AM', enabled: true,
    trigger: { type: 'time', value: '06:00' },
    action: { device: 'luzPanel1', command: 'on' }
  },
  {
    id: '2', name: 'Luces OFF 12AM', enabled: true,
    trigger: { type: 'time', value: '00:00' },
    action: { device: 'luzPanel1', command: 'off' }
  },
  {
    id: '3', name: 'Humidificador si HR < 60%', enabled: false,
    trigger: { type: 'sensor', value: 'humidity', operator: '<', threshold: 60 },
    action: { device: 'humidifier', command: 'on' }
  },
  {
    id: '4', name: 'Extractor si Temp > 28°C', enabled: true,
    trigger: { type: 'sensor', value: 'temperature', operator: '>', threshold: 28 },
    action: { device: 'extractorControlador', command: 'on' }
  },
];

const Calendar: React.FC = () => {
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [rules, setRules] = useState<AutomationRule[]>(DEFAULT_RULES);
    const [open, setOpen] = useState(false);
    const [newEvent, setNewEvent] = useState({ title: '', type: 'water', description: '' });
    const [activeTab, setActiveTab] = useState(0);
    const [dateRange, setDateRange] = useState<'day' | 'week' | 'month'>('day');

    // Context data
    const { settings, daysIntoGrow, currentStage } = useCropSteering();
    const growWeek = Math.ceil(daysIntoGrow / 7);

    // Sensor data for Trazabilidad
    const [sensorData, setSensorData] = useState<any>(null);
    const [irrigationEvents, setIrrigationEvents] = useState<any[]>([]);

    useEffect(() => {
        // Fetch calendar events
        fetch(`${API_BASE_URL}/api/calendar`)
            .then(res => res.json())
            .then(data => setEvents(Array.isArray(data) ? data.reverse() : []))
            .catch(console.error);

        const fetchSensorData = async () => {
            try {
                const sensors = await apiClient.getLatestSensors();
                setSensorData(sensors);
            } catch (e) {
                console.error('Error fetching sensors:', e);
            }
        };

        const fetchIrrigationEvents = async () => {
            try {
                const todayStr = new Date().toISOString().split('T')[0];
                const res = await apiClient.request<any>(`/api/irrigation/events?date=${todayStr}`);
                if (res?.events) setIrrigationEvents(res.events);
            } catch (e) {
                console.error('Error fetching irrigation events:', e);
            }
        };

        fetchSensorData();
        fetchIrrigationEvents();

        const interval = setInterval(() => {
            fetchSensorData();
            fetchIrrigationEvents();
        }, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleAdd = async () => {
        const payload = { ...newEvent, date: new Date().toISOString() };
        try {
            const res = await fetch(`${API_BASE_URL}/api/calendar`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const saved = await res.json();
            if (saved.success) {
                setEvents(prev => [saved.event, ...prev]);
                setOpen(false);
                setNewEvent({ title: '', type: 'water', description: '' });
            }
        } catch (e) { console.error(e); }
    };

    const handleRuleToggle = (ruleId: string) => {
        setRules(prev => prev.map(r => r.id === ruleId ? { ...r, enabled: !r.enabled } : r));
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'water': return <Droplet color="#3b82f6" />;
            case 'light': return <Sun color="#f59e0b" />;
            case 'prune': return <Scissors color="#22c55e" />;
            case 'issue': return <AlertCircle color="#ef4444" />;
            case 'automation': return <Zap color="#a855f7" />;
            default: return <CalIcon color="#fff" />;
        }
    };

    const getTriggerLabel = (trigger: AutomationRule['trigger']) => {
        if (trigger.type === 'time') return `⏰ ${trigger.value}`;
        if (trigger.type === 'sensor') {
            const sensorName = trigger.value === 'temperature' ? 'Temp' : trigger.value === 'humidity' ? 'HR' : trigger.value;
            return `📊 ${sensorName} ${trigger.operator} ${trigger.threshold}`;
        }
        return trigger.value;
    };

    return (
        <Box sx={{ maxWidth: 1600, mx: 'auto', p: { xs: 2, md: 4 } }}>
            {/* Header */}
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                    <Typography variant="h4" fontWeight="800" className="ai-gradient-text">Hub de Gestión</Typography>
                    <Typography variant="body1" color="text.secondary">Control Integral de Cultivo • Inventario • Eventos</Typography>
                </Box>
                <GlassButton
                    variant="contained"
                    startIcon={<Plus size={18} />}
                    onClick={() => setOpen(true)}
                    className="hide-mobile"
                    sx={{ background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)' }}
                >
                    Nuevo Evento
                </GlassButton>
            </Box>

            {/* Main Tabs */}
            <GlassCard sx={{ mb: 4, p: 0, overflow: 'hidden' }}>
                <Tabs
                    value={activeTab}
                    onChange={(_, v) => setActiveTab(v)}
                    textColor="secondary"
                    indicatorColor="secondary"
                    variant="scrollable"
                    scrollButtons="auto"
                    sx={{ borderBottom: '1px solid rgba(255,255,255,0.1)', px: 2, pt: 2 }}
                >
                    <Tab icon={<CalIcon size={20} />} label="Cronología" iconPosition="start" />
                    <Tab icon={<Sprout size={20} />} label="Inventario" iconPosition="start" />
                    <Tab icon={<Zap size={20} />} label="Automatizaciones" iconPosition="start" />
                    <Tab icon={<Droplet size={20} />} label="Trazabilidad" iconPosition="start" />
                    <Tab icon={<Database size={20} />} label="Historial" iconPosition="start" />
                </Tabs>

                <Box sx={{ p: { xs: 2, md: 4 } }}>
                    {/* TAB 0: EVENTS */}
                    {activeTab === 0 && (
                        <Grid container spacing={4}>
                            <Grid item xs={12} lg={4}>
                                <GlassCard sx={{ background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(22, 163, 74, 0.2) 100%)', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                                    <Box sx={{ textAlign: 'center', py: 2 }}>
                                        <Typography variant="subtitle1" color="#86efac" fontWeight="bold" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>Día de Cultivo</Typography>
                                        <Typography variant="h1" fontWeight="900" sx={{ color: '#fff', fontSize: '6rem', lineHeight: 1 }}>
                                            {daysIntoGrow > 0 ? daysIntoGrow : '--'}
                                        </Typography>
                                        <Chip
                                            label={`Semana ${growWeek} • ${currentStage || 'Sin Fase'}`}
                                            sx={{ mt: 2, bgcolor: 'rgba(34, 197, 94, 0.2)', color: '#fff', border: '1px solid #22c55e' }}
                                        />
                                    </Box>
                                </GlassCard>
                            </Grid>

                            <Grid item xs={12} lg={8}>
                                <GlassCard>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                        <Typography variant="h6" fontWeight="bold">Historial de Eventos</Typography>
                                        <Button size="small" startIcon={<Plus size={14} />} onClick={() => setOpen(true)} className="hide-desktop">Nuevo</Button>
                                    </Box>
                                    <List sx={{ maxHeight: 500, overflow: 'auto' }}>
                                        {events.length === 0 && <Typography color="text.secondary" align="center" sx={{ py: 4 }}>No hay eventos registrados.</Typography>}
                                        {events.map((evt) => (
                                            <React.Fragment key={evt.id}>
                                                <ListItem sx={{ borderRadius: '12px', mb: 1, '&:hover': { bgcolor: 'rgba(255,255,255,0.03)' } }}>
                                                    <ListItemIcon sx={{ minWidth: 40 }}>
                                                        <Box sx={{ p: 1, borderRadius: '8px', bgcolor: 'rgba(255,255,255,0.05)' }}>
                                                            {getIcon(evt.type)}
                                                        </Box>
                                                    </ListItemIcon>
                                                    <ListItemText
                                                        primary={<Typography fontWeight="600">{evt.title}</Typography>}
                                                        secondary={
                                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                                                <Clock size={12} />
                                                                {new Date(evt.date).toLocaleDateString()} {new Date(evt.date).toLocaleTimeString()}
                                                                {evt.description && ` • ${evt.description}`}
                                                            </Typography>
                                                        }
                                                    />
                                                </ListItem>
                                                <Divider component="li" sx={{ borderColor: 'rgba(255,255,255,0.05)' }} />
                                            </React.Fragment>
                                        ))}
                                    </List>
                                </GlassCard>
                            </Grid>
                        </Grid>
                    )}

                    {/* TAB 1: INVENTORY */}
                    {activeTab === 1 && (
                        <PlantInventory />
                    )}

                    {/* TAB 2: AUTOMATIONS */}
                    {activeTab === 2 && (
                        <Grid container spacing={3}>
                            {rules.map((rule) => (
                                <Grid item xs={12} md={6} key={rule.id}>
                                    <GlassCard sx={{ opacity: rule.enabled ? 1 : 0.6, transition: 'all 0.3s ease', border: rule.enabled ? '1px solid rgba(168, 85, 247, 0.3)' : '1px solid rgba(255,255,255,0.05)' }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                <Box sx={{ p: 1, borderRadius: '50%', bgcolor: rule.enabled ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255,255,255,0.05)' }}>
                                                    {rule.enabled ? <Play size={16} color="#22c55e" /> : <Pause size={16} color="#666" />}
                                                </Box>
                                                <Typography fontWeight="bold" variant="h6">{rule.name}</Typography>
                                            </Box>
                                            <Switch checked={rule.enabled} onChange={() => handleRuleToggle(rule.id)} color="secondary" />
                                        </Box>
                                        <Divider sx={{ mb: 2, borderColor: 'rgba(255,255,255,0.05)' }} />
                                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                            <Chip label={getTriggerLabel(rule.trigger)} color="primary" variant="filled" size="small" />
                                            <Chip label={`→ ${rule.action.device} ${rule.action.command.toUpperCase()}`} color="secondary" variant="filled" size="small" />
                                        </Box>
                                        {rule.lastRun && (
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
                                                Última ej: {new Date(rule.lastRun).toLocaleString()}
                                            </Typography>
                                        )}
                                    </GlassCard>
                                </Grid>
                            ))}
                            <Grid item xs={12} sx={{ textAlign: 'center', mt: 2 }}>
                                <GlassButton variant="outlined" startIcon={<Plus />}>Crear Nueva Regla</GlassButton>
                            </Grid>
                        </Grid>
                    )}

                    {/* TAB 3: TRAZABILIDAD */}
                    {activeTab === 3 && (
                        <Box>
                            <Alert severity="info" sx={{ mb: 3, borderRadius: '12px', bgcolor: 'rgba(59, 130, 246, 0.1)' }}>
                                <strong>Metodología Athena CCI</strong>: P0 Saturación | P1 Mantenimiento | P2 Ajuste | P3 Dryback
                            </Alert>
                             <Grid container spacing={3}>
                                <Grid item xs={6} md={3}>
                                    <MetricCard label="Fase 1 (Shots)" value={irrigationEvents.filter(e => e.phase === 'p1').length} unit="shots" color="#22c55e" icon={Droplet} subValue="Mantenimiento" />
                                </Grid>
                                <Grid item xs={6} md={3}>
                                    <MetricCard label="Fase 2 (Shots)" value={irrigationEvents.filter(e => e.phase === 'p2').length} unit="shots" color="#3b82f6" icon={Droplet} subValue="Ajuste" />
                                </Grid>
                                <Grid item xs={6} md={3}>
                                    <MetricCard label="Fase 3 (Dryback)" value={irrigationEvents.filter(e => e.phase === 'p3').length} unit="hrs" color="#8b5cf6" icon={Clock} subValue="Nocturno" />
                                </Grid>
                                <Grid item xs={6} md={3}>
                                    <MetricCard label="Dryback Total" value={sensorData?.drybackPercent?.toFixed(0) || '--'} unit="%" color="#f97316" icon={TrendingUp} subValue="Objetivo 15-20%" />
                                </Grid>
                            </Grid>
                        </Box>
                    )}

                    {/* TAB 4: HISTORIAL */}
                    {activeTab === 4 && (
                        <Box>
                            <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
                                <FormControl size="small" sx={{ minWidth: 150 }}>
                                    <InputLabel>Rango Temporal</InputLabel>
                                    <Select value={dateRange} label="Rango Temporal" onChange={(e) => setDateRange(e.target.value as any)}>
                                        <MenuItem value="day">Últimas 24h</MenuItem>
                                        <MenuItem value="week">Última Semana</MenuItem>
                                        <MenuItem value="month">Último Mes</MenuItem>
                                    </Select>
                                </FormControl>
                                <GlassButton variant="contained" startIcon={<TrendingUp size={18} />}>Generar Reporte</GlassButton>
                            </Box>
                            <Box sx={{ height: 400 }}>
                                <HistoryChart type="environment" title="Historial Ambiental" />
                            </Box>
                        </Box>
                    )}
                </Box>
            </GlassCard>

            {/* ADD EVENT DIALOG */}
            <Dialog
                open={open}
                onClose={() => setOpen(false)}
                PaperProps={{
                    sx: {
                        borderRadius: '24px',
                        bgcolor: '#1e293b',
                        backgroundImage: 'none',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }
                }}
            >
                <DialogTitle>Nuevo Evento</DialogTitle>
                <DialogContent sx={{ minWidth: 300, pt: 1 }}>
                    <TextField
                        autoFocus margin="dense" label="Título" fullWidth
                        value={newEvent.title} onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                        sx={{ mb: 2 }}
                    />
                    <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
                        <InputLabel>Tipo</InputLabel>
                        <Select value={newEvent.type} label="Tipo" onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value as any })}>
                            <MenuItem value="water">Riego</MenuItem>
                            <MenuItem value="light">Iluminación</MenuItem>
                            <MenuItem value="prune">Poda/Entreno</MenuItem>
                            <MenuItem value="issue">Problema</MenuItem>
                            <MenuItem value="automation">Automatización</MenuItem>
                            <MenuItem value="other">Otro</MenuItem>
                        </Select>
                    </FormControl>
                    <TextField
                        margin="dense" label="Descripción" fullWidth multiline rows={3}
                        value={newEvent.description} onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    />
                </DialogContent>
                <DialogActions sx={{ p: 3 }}>
                    <Button onClick={() => setOpen(false)}>Cancelar</Button>
                    <Button onClick={handleAdd} variant="contained" sx={{ borderRadius: '12px' }}>Guardar</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default Calendar;

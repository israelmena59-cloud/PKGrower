import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Grid, Card, CardHeader, CardContent, Divider,
  List, ListItem, ListItemIcon, ListItemText, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, FormControl, InputLabel, Select,
  MenuItem, Tabs, Tab, Switch, Chip, Alert, IconButton, Paper
} from '@mui/material';
import { Droplet, Sun, Scissors, AlertCircle, Calendar as CalIcon, Plus, Zap, Clock, Trash2, Play, Pause, TrendingUp, Database } from 'lucide-react';
import { API_BASE_URL, apiClient } from '../api/client';
import { useCropSteering } from '../context/CropSteeringContext';
import HistoryChart from '../components/dashboard/HistoryChart';

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
  const { settings } = useCropSteering();

  // Calculate grow day
  const startDate = settings?.growStartDate ? new Date(settings.growStartDate) : new Date();
  const today = new Date();
  const growDay = Math.floor((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const growWeek = Math.ceil(growDay / 7);

  useEffect(() => {
    fetch(`${API_BASE_URL}/api/calendar`)
      .then(res => res.json())
      .then(data => setEvents(Array.isArray(data) ? data.reverse() : []))
      .catch(console.error);
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
      case 'water': return <Droplet color="#2196f3" />;
      case 'light': return <Sun color="#ff9800" />;
      case 'prune': return <Scissors color="#4caf50" />;
      case 'issue': return <AlertCircle color="#f44336" />;
      case 'automation': return <Zap color="#9c27b0" />;
      default: return <CalIcon />;
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
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h4" fontWeight="bold">Cronología y Automatización</Typography>
        <Button variant="contained" startIcon={<Plus />} onClick={() => setOpen(true)}>Nuevo Evento</Button>
      </Box>

      {/* Tabs */}
      <Tabs value={activeTab} onChange={(_, v) => setActiveTab(v)} sx={{ mb: 3 }}>
        <Tab icon={<CalIcon size={18} />} label="Eventos" />
        <Tab icon={<Zap size={18} />} label="Automatizaciones" />
        <Tab icon={<Database size={18} />} label="Consulta Histórica" />
        <Tab icon={<Droplet size={18} />} label="Trazabilidad" />
      </Tabs>

      {/* TAB 0: Events */}
      {activeTab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', color: 'white' }}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h6">Día de Cultivo</Typography>
                <Typography variant="h1" fontWeight="bold">{growDay > 0 ? growDay : '--'}</Typography>
                <Typography variant="subtitle1">Semana {growWeek} - {settings?.currentStage || 'Sin definir'}</Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={8}>
            <Card>
              <CardHeader title="Historial de Eventos" />
              <Divider />
              <CardContent sx={{ maxHeight: 400, overflow: 'auto' }}>
                <List>
                  {events.length === 0 && <Typography color="text.secondary" align="center">No hay eventos registrados.</Typography>}
                  {events.map((evt) => (
                    <React.Fragment key={evt.id}>
                      <ListItem>
                        <ListItemIcon>{getIcon(evt.type)}</ListItemIcon>
                        <ListItemText
                          primary={evt.title}
                          secondary={`${new Date(evt.date).toLocaleDateString()} ${new Date(evt.date).toLocaleTimeString()} - ${evt.description || ''}`}
                        />
                      </ListItem>
                      <Divider variant="inset" component="li" />
                    </React.Fragment>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* TAB 1: Automations */}
      {activeTab === 1 && (
        <Box>
          <Alert severity="info" sx={{ mb: 2 }}>
            Las automatizaciones se ejecutan automáticamente según las condiciones definidas.
          </Alert>

          <Grid container spacing={2}>
            {rules.map((rule) => (
              <Grid item xs={12} md={6} key={rule.id}>
                <Paper sx={{ p: 2, opacity: rule.enabled ? 1 : 0.6 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {rule.enabled ? <Play size={16} color="#22c55e" /> : <Pause size={16} color="#666" />}
                      <Typography fontWeight="bold">{rule.name}</Typography>
                    </Box>
                    <Switch checked={rule.enabled} onChange={() => handleRuleToggle(rule.id)} color="success" />
                  </Box>

                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
                    <Chip size="small" label={getTriggerLabel(rule.trigger)} color="primary" variant="outlined" />
                    <Chip size="small" label={`→ ${rule.action.device} ${rule.action.command.toUpperCase()}`} color="secondary" variant="outlined" />
                  </Box>

                  {rule.lastRun && (
                    <Typography variant="caption" color="text.secondary">
                      Última ejecución: {new Date(rule.lastRun).toLocaleString()}
                    </Typography>
                  )}
                </Paper>
              </Grid>
            ))}
          </Grid>

          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Button variant="outlined" startIcon={<Plus />}>Crear Nueva Regla</Button>
          </Box>
        </Box>
      )}

      {/* TAB 2: Historical Query */}
      {activeTab === 2 && (
        <Box>
          <Paper sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Consultar Datos Históricos</Typography>
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
              <FormControl size="small" sx={{ minWidth: 150 }}>
                <InputLabel>Rango</InputLabel>
                <Select value={dateRange} label="Rango" onChange={(e) => setDateRange(e.target.value as any)}>
                  <MenuItem value="day">Últimas 24h</MenuItem>
                  <MenuItem value="week">Última Semana</MenuItem>
                  <MenuItem value="month">Último Mes</MenuItem>
                </Select>
              </FormControl>
              <Button variant="contained" startIcon={<TrendingUp size={18} />}>Consultar</Button>
            </Box>
          </Paper>

          <Box sx={{ height: 400 }}>
            <HistoryChart type="environment" title="Historial Ambiental" />
          </Box>
        </Box>
      )}

      {/* TAB 3: Trazabilidad (Daily P1/P2/P3 Tracking) */}
      {activeTab === 3 && (
        <Box>
          <Alert severity="info" sx={{ mb: 3 }}>
            <strong>🌱 Trazabilidad Diaria</strong> - Basada en metodología Athena CCI.
            P0: Saturación pre-amanecer | P1: Mantenimiento rápido | P2: Ajuste fino | P3: Dryback nocturno
          </Alert>

          {/* Daily Summary Cards */}
          <Grid container spacing={3}>
            {/* P1 Shots */}
            <Grid item xs={6} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center', background: 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)', color: 'white' }}>
                <Typography variant="overline">Phase 1</Typography>
                <Typography variant="h2" fontWeight="bold">--</Typography>
                <Typography variant="caption">disparos hoy</Typography>
                <Chip label="Mantenimiento" size="small" sx={{ mt: 1, bgcolor: 'rgba(255,255,255,0.2)' }} />
              </Paper>
            </Grid>

            {/* P2 Shots */}
            <Grid item xs={6} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', color: 'white' }}>
                <Typography variant="overline">Phase 2</Typography>
                <Typography variant="h2" fontWeight="bold">--</Typography>
                <Typography variant="caption">disparos hoy</Typography>
                <Chip label="Ajuste" size="small" sx={{ mt: 1, bgcolor: 'rgba(255,255,255,0.2)' }} />
              </Paper>
            </Grid>

            {/* P3 Duration */}
            <Grid item xs={6} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center', background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)', color: 'white' }}>
                <Typography variant="overline">Phase 3</Typography>
                <Typography variant="h2" fontWeight="bold">--</Typography>
                <Typography variant="caption">horas dryback</Typography>
                <Chip label="Nocturno" size="small" sx={{ mt: 1, bgcolor: 'rgba(255,255,255,0.2)' }} />
              </Paper>
            </Grid>

            {/* Dryback % */}
            <Grid item xs={6} md={3}>
              <Paper sx={{ p: 2, textAlign: 'center', background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', color: 'white' }}>
                <Typography variant="overline">Dryback</Typography>
                <Typography variant="h2" fontWeight="bold">--%</Typography>
                <Typography variant="caption">desde lights on</Typography>
                <Chip label="Objetivo 15-20%" size="small" sx={{ mt: 1, bgcolor: 'rgba(255,255,255,0.2)' }} />
              </Paper>
            </Grid>
          </Grid>

          {/* Sensor Summary for the Day */}
          <Paper sx={{ p: 3, mt: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>📊 Resumen de Sensores (Hoy)</Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} md={3}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#FEE2E2', borderRadius: 2 }}>
                  <Typography variant="caption" color="text.secondary">Temp Promedio</Typography>
                  <Typography variant="h5" fontWeight="bold" color="#DC2626">-- °C</Typography>
                  <Typography variant="caption">Min: -- / Max: --</Typography>
                </Box>
              </Grid>
              <Grid item xs={6} md={3}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#DBEAFE', borderRadius: 2 }}>
                  <Typography variant="caption" color="text.secondary">HR Promedio</Typography>
                  <Typography variant="h5" fontWeight="bold" color="#2563EB">-- %</Typography>
                  <Typography variant="caption">Min: -- / Max: --</Typography>
                </Box>
              </Grid>
              <Grid item xs={6} md={3}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#D1FAE5', borderRadius: 2 }}>
                  <Typography variant="caption" color="text.secondary">VPD Promedio</Typography>
                  <Typography variant="h5" fontWeight="bold" color="#059669">-- kPa</Typography>
                  <Typography variant="caption">Ideal: 0.8-1.4</Typography>
                </Box>
              </Grid>
              <Grid item xs={6} md={3}>
                <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#FEF3C7', borderRadius: 2 }}>
                  <Typography variant="caption" color="text.secondary">VWC Promedio</Typography>
                  <Typography variant="h5" fontWeight="bold" color="#D97706">-- %</Typography>
                  <Typography variant="caption">Sustrato</Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>

          {/* Daily Timeline */}
          <Paper sx={{ p: 3, mt: 3 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>⏱️ Timeline del Día</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, overflowX: 'auto', py: 1 }}>
              <Chip icon={<Sun size={14} />} label="06:00 Lights ON" color="warning" variant="outlined" />
              <Typography>→</Typography>
              <Chip icon={<Droplet size={14} />} label="P0 Saturación" color="info" variant="outlined" />
              <Typography>→</Typography>
              <Chip icon={<Droplet size={14} />} label="P1 Shots" color="success" variant="outlined" />
              <Typography>→</Typography>
              <Chip icon={<Droplet size={14} />} label="P2 Shots" color="primary" variant="outlined" />
              <Typography>→</Typography>
              <Chip icon={<Clock size={14} />} label="00:00 Lights OFF" color="secondary" variant="outlined" />
              <Typography>→</Typography>
              <Chip label="P3 Dryback" color="default" variant="outlined" />
            </Box>
          </Paper>
        </Box>
      )}

      {/* ADD EVENT DIALOG */}
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>Nuevo Evento</DialogTitle>
        <DialogContent sx={{ minWidth: 300 }}>
          <TextField
            autoFocus margin="dense" label="Título" fullWidth
            value={newEvent.title} onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
          />
          <FormControl fullWidth margin="dense">
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
            margin="dense" label="Descripción" fullWidth multiline rows={2}
            value={newEvent.description} onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={handleAdd} variant="contained">Guardar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Calendar;

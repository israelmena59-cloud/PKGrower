import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Switch,
  FormControlLabel,
  Chip,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Zap,
  Plus,
  Play,
  Pause,
  Trash2,
  Sparkles,
  Droplets,
  Thermometer,
  Sun,
  Wind,
  Clock,
  TrendingUp,
  AlertTriangle,
  Settings,
  RefreshCw,
} from 'lucide-react';
import { apiClient } from '../api/client';
import SmartNotifications from '../components/ai/SmartNotifications';

interface AutomationRule {
  id: string;
  name: string;
  enabled: boolean;
  trigger: {
    type: 'sensor' | 'time' | 'device';
    sensor?: string;
    operator?: '>' | '<' | '==' | '!=';
    value?: number;
    time?: string;
    device?: string;
    deviceState?: boolean;
  };
  action: {
    type: 'device' | 'notification';
    deviceId?: string;
    deviceAction?: 'on' | 'off' | 'toggle';
    notificationMessage?: string;
  };
  createdBy: 'user' | 'ai';
  lastTriggered?: string;
}

const DEFAULT_RULES: AutomationRule[] = [
  {
    id: 'vpd-low-humidifier',
    name: 'Encender humidificador si VPD > 1.4',
    enabled: false,
    trigger: { type: 'sensor', sensor: 'vpd', operator: '>', value: 1.4 },
    action: { type: 'device', deviceId: 'humidifier', deviceAction: 'on' },
    createdBy: 'ai'
  },
  {
    id: 'vpd-high-extractor',
    name: 'Encender extractor si VPD < 0.5',
    enabled: false,
    trigger: { type: 'sensor', sensor: 'vpd', operator: '<', value: 0.5 },
    action: { type: 'device', deviceId: 'extractorControlador', deviceAction: 'on' },
    createdBy: 'ai'
  },
  {
    id: 'temp-high-extractor',
    name: 'Ventilar si temperatura > 28°C',
    enabled: false,
    trigger: { type: 'sensor', sensor: 'temperature', operator: '>', value: 28 },
    action: { type: 'device', deviceId: 'extractorControlador', deviceAction: 'on' },
    createdBy: 'ai'
  },
  {
    id: 'substrate-dry-notify',
    name: 'Alerta si sustrato < 35%',
    enabled: false,
    trigger: { type: 'sensor', sensor: 'substrateHumidity', operator: '<', value: 35 },
    action: { type: 'notification', notificationMessage: '⚠️ Sustrato seco. Considera regar.' },
    createdBy: 'ai'
  }
];

const Automations: React.FC = () => {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [loading, setLoading] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<AutomationRule | null>(null);
  const [generatingAI, setGeneratingAI] = useState(false);

  // Form state
  const [newRule, setNewRule] = useState<Partial<AutomationRule>>({
    name: '',
    enabled: true,
    trigger: { type: 'sensor', sensor: 'vpd', operator: '>', value: 1.0 },
    action: { type: 'device', deviceId: '', deviceAction: 'on' }
  });

  // Load rules from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('automation_rules');
    if (saved) {
      setRules(JSON.parse(saved));
    } else {
      setRules(DEFAULT_RULES);
    }
  }, []);

  // Save rules to localStorage
  const saveRules = (newRules: AutomationRule[]) => {
    setRules(newRules);
    localStorage.setItem('automation_rules', JSON.stringify(newRules));
  };

  const toggleRule = (id: string) => {
    const updated = rules.map(r =>
      r.id === id ? { ...r, enabled: !r.enabled } : r
    );
    saveRules(updated);
  };

  const deleteRule = (id: string) => {
    if (confirm('¿Eliminar esta regla?')) {
      saveRules(rules.filter(r => r.id !== id));
    }
  };

  const handleSaveRule = () => {
    if (!newRule.name || !newRule.trigger || !newRule.action) return;

    const rule: AutomationRule = {
      id: editingRule?.id || `rule-${Date.now()}`,
      name: newRule.name,
      enabled: newRule.enabled ?? true,
      trigger: newRule.trigger as AutomationRule['trigger'],
      action: newRule.action as AutomationRule['action'],
      createdBy: 'user'
    };

    if (editingRule) {
      saveRules(rules.map(r => r.id === editingRule.id ? rule : r));
    } else {
      saveRules([...rules, rule]);
    }

    setIsAddOpen(false);
    setEditingRule(null);
    setNewRule({
      name: '',
      enabled: true,
      trigger: { type: 'sensor', sensor: 'vpd', operator: '>', value: 1.0 },
      action: { type: 'device', deviceId: '', deviceAction: 'on' }
    });
  };

  const generateAISuggestions = async () => {
    setGeneratingAI(true);
    try {
      // Ask AI for automation suggestions
      const result = await apiClient.sendChatMessageV2(
        'Sugiere 3 reglas de automatización específicas para mi cultivo indoor basándote en los datos actuales de sensores. Formato: nombre, condición, acción.'
      );

      // For now, just show a notification - in real implementation would parse the response
      alert('Sugerencias de IA:\n\n' + result.reply);
    } catch (error) {
      console.error('Error generating AI suggestions:', error);
    } finally {
      setGeneratingAI(false);
    }
  };

  const getSensorIcon = (sensor?: string) => {
    switch (sensor) {
      case 'temperature': return <Thermometer size={16} />;
      case 'humidity': return <Droplets size={16} />;
      case 'vpd': return <Wind size={16} />;
      case 'substrateHumidity': return <Droplets size={16} />;
      default: return <TrendingUp size={16} />;
    }
  };

  const getActionIcon = (deviceId?: string) => {
    if (deviceId?.includes('luz') || deviceId?.includes('light')) return <Sun size={16} />;
    if (deviceId?.includes('humid')) return <Droplets size={16} />;
    if (deviceId?.includes('extractor')) return <Wind size={16} />;
    return <Zap size={16} />;
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Zap size={32} color="#fbbf24" />
            Automatizaciones
          </Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mt: 1 }}>
            Crea reglas para controlar dispositivos automáticamente basándote en sensores
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            variant="outlined"
            startIcon={generatingAI ? <CircularProgress size={16} /> : <Sparkles size={16} />}
            onClick={generateAISuggestions}
            disabled={generatingAI}
            sx={{ borderColor: '#a5f3fc', color: '#a5f3fc' }}
          >
            Sugerencias IA
          </Button>
          <Button
            variant="contained"
            startIcon={<Plus size={16} />}
            onClick={() => setIsAddOpen(true)}
            sx={{ background: 'linear-gradient(45deg, #7c3aed 30%, #2563eb 90%)' }}
          >
            Nueva Regla
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Left: Smart Notifications */}
        <Grid item xs={12} md={4}>
          <SmartNotifications autoRefresh={true} refreshInterval={30000} />
        </Grid>

        {/* Right: Rules List */}
        <Grid item xs={12} md={8}>
          <Paper sx={{
            bgcolor: 'rgba(0,0,0,0.3)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 3,
            overflow: 'hidden'
          }}>
            <Box sx={{ p: 2, borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Settings size={20} />
                Reglas de Automatización
              </Typography>
            </Box>

            {rules.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center', color: 'rgba(255,255,255,0.5)' }}>
                <Zap size={48} />
                <Typography variant="body1" sx={{ mt: 2 }}>No hay reglas configuradas</Typography>
                <Button
                  variant="outlined"
                  startIcon={<Plus size={16} />}
                  onClick={() => setIsAddOpen(true)}
                  sx={{ mt: 2 }}
                >
                  Crear Primera Regla
                </Button>
              </Box>
            ) : (
              <List sx={{ p: 0 }}>
                {rules.map((rule, index) => (
                  <React.Fragment key={rule.id}>
                    {index > 0 && <Divider sx={{ borderColor: 'rgba(255,255,255,0.05)' }} />}
                    <ListItem
                      sx={{
                        py: 2,
                        opacity: rule.enabled ? 1 : 0.5,
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' }
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                        <Switch
                          checked={rule.enabled}
                          onChange={() => toggleRule(rule.id)}
                          size="small"
                        />
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Typography variant="body1" sx={{ fontWeight: 'bold', color: 'white' }}>
                              {rule.name}
                            </Typography>
                            {rule.createdBy === 'ai' && (
                              <Chip
                                icon={<Sparkles size={10} />}
                                label="AI"
                                size="small"
                                sx={{ height: 18, fontSize: '0.65rem', bgcolor: 'rgba(165, 243, 252, 0.2)', color: '#a5f3fc' }}
                              />
                            )}
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                            <Chip
                              icon={getSensorIcon(rule.trigger.sensor)}
                              label={`${rule.trigger.sensor} ${rule.trigger.operator} ${rule.trigger.value}`}
                              size="small"
                              sx={{ bgcolor: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa' }}
                            />
                            <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.5)' }}>→</Typography>
                            <Chip
                              icon={getActionIcon(rule.action.deviceId)}
                              label={rule.action.type === 'device'
                                ? `${rule.action.deviceId} ${rule.action.deviceAction}`
                                : 'Notificar'
                              }
                              size="small"
                              sx={{ bgcolor: 'rgba(34, 197, 94, 0.2)', color: '#4ade80' }}
                            />
                          </Box>
                        </Box>
                      </Box>
                      <ListItemSecondaryAction>
                        <IconButton
                          size="small"
                          onClick={() => deleteRule(rule.id)}
                          sx={{ color: 'rgba(255,255,255,0.5)', '&:hover': { color: '#ef4444' } }}
                        >
                          <Trash2 size={16} />
                        </IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                  </React.Fragment>
                ))}
              </List>
            )}
          </Paper>

          {/* Info Card */}
          <Alert
            severity="info"
            sx={{
              mt: 3,
              bgcolor: 'rgba(59, 130, 246, 0.1)',
              border: '1px solid rgba(59, 130, 246, 0.3)',
              '& .MuiAlert-icon': { color: '#3b82f6' }
            }}
          >
            <Typography variant="body2">
              <strong>Nota:</strong> Las reglas se evalúan cada vez que los sensores se actualizan (~5s).
              Las acciones se ejecutan automáticamente cuando las condiciones se cumplen.
            </Typography>
          </Alert>
        </Grid>
      </Grid>

      {/* Add/Edit Rule Dialog */}
      <Dialog open={isAddOpen} onClose={() => setIsAddOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Zap size={20} />
          {editingRule ? 'Editar Regla' : 'Nueva Regla de Automatización'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 2 }}>
            <TextField
              label="Nombre de la Regla"
              fullWidth
              value={newRule.name || ''}
              onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
              placeholder="Ej: Encender humidificador si VPD alto"
            />

            <Divider sx={{ my: 1 }}>
              <Chip label="SI (Condición)" size="small" />
            </Divider>

            <Grid container spacing={2}>
              <Grid item xs={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Sensor</InputLabel>
                  <Select
                    value={newRule.trigger?.sensor || 'vpd'}
                    label="Sensor"
                    onChange={(e) => setNewRule({
                      ...newRule,
                      trigger: { ...newRule.trigger, type: 'sensor', sensor: e.target.value }
                    })}
                  >
                    <MenuItem value="temperature">Temperatura</MenuItem>
                    <MenuItem value="humidity">Humedad</MenuItem>
                    <MenuItem value="vpd">VPD</MenuItem>
                    <MenuItem value="substrateHumidity">Sustrato</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={4}>
                <FormControl fullWidth size="small">
                  <InputLabel>Operador</InputLabel>
                  <Select
                    value={newRule.trigger?.operator || '>'}
                    label="Operador"
                    onChange={(e) => setNewRule({
                      ...newRule,
                      trigger: { ...newRule.trigger, operator: e.target.value as any }
                    })}
                  >
                    <MenuItem value=">">Mayor que (&gt;)</MenuItem>
                    <MenuItem value="<">Menor que (&lt;)</MenuItem>
                    <MenuItem value="==">Igual a (==)</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={4}>
                <TextField
                  label="Valor"
                  type="number"
                  size="small"
                  fullWidth
                  value={newRule.trigger?.value || 0}
                  onChange={(e) => setNewRule({
                    ...newRule,
                    trigger: { ...newRule.trigger, value: parseFloat(e.target.value) }
                  })}
                />
              </Grid>
            </Grid>

            <Divider sx={{ my: 1 }}>
              <Chip label="ENTONCES (Acción)" size="small" />
            </Divider>

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Dispositivo</InputLabel>
                  <Select
                    value={newRule.action?.deviceId || ''}
                    label="Dispositivo"
                    onChange={(e) => setNewRule({
                      ...newRule,
                      action: { ...newRule.action, type: 'device', deviceId: e.target.value }
                    })}
                  >
                    <MenuItem value="humidifier">Humidificador</MenuItem>
                    <MenuItem value="extractorControlador">Extractor</MenuItem>
                    <MenuItem value="luzPanel1">Luz Panel 1</MenuItem>
                    <MenuItem value="luzPanel2">Luz Panel 2</MenuItem>
                    <MenuItem value="bombaControlador">Bomba de Agua</MenuItem>
                    <MenuItem value="deshumidificador">Deshumidificador</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Acción</InputLabel>
                  <Select
                    value={newRule.action?.deviceAction || 'on'}
                    label="Acción"
                    onChange={(e) => setNewRule({
                      ...newRule,
                      action: { ...newRule.action, deviceAction: e.target.value as any }
                    })}
                  >
                    <MenuItem value="on">Encender</MenuItem>
                    <MenuItem value="off">Apagar</MenuItem>
                    <MenuItem value="toggle">Alternar</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsAddOpen(false)}>Cancelar</Button>
          <Button onClick={handleSaveRule} variant="contained" disabled={!newRule.name}>
            {editingRule ? 'Guardar Cambios' : 'Crear Regla'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Automations;

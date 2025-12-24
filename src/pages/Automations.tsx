import React, { useState, useEffect } from 'react';
import {
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
  Switch,
  Button
} from '@mui/material';
import {
  Zap,
  Plus,
  Trash2,
  Sparkles,
  Droplets,
  Thermometer,
  Sun,
  Wind,
  Settings,
  TrendingUp,
  Archive,
  ArrowRight
} from 'lucide-react';
import { apiClient } from '../api/client';
import SmartNotifications from '../components/ai/SmartNotifications';
import { PageHeader } from '../components/layout/PageHeader';

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
    <div className="p-4 md:p-6 max-w-[1600px] mx-auto space-y-6">
      <PageHeader
        title="Automatizaciones"
        subtitle="Crea reglas para controlar dispositivos automáticamente basándote en sensores"
        icon={Zap}
        action={
          <div className="flex gap-3">
             <button
              onClick={generateAISuggestions}
              disabled={generatingAI}
              className="btn-standard glass-card-hover border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10 flex items-center gap-2"
            >
               {generatingAI ? <span className="animate-spin">⏳</span> : <Sparkles size={16} />}
              <span className="hidden sm:inline">Sugerencias IA</span>
            </button>
            <button
              onClick={() => setIsAddOpen(true)}
              className="btn-standard bg-gradient-to-r from-violet-600 to-blue-600 hover:from-violet-500 hover:to-blue-500 text-white shadow-lg shadow-blue-900/20 flex items-center gap-2"
            >
              <Plus size={18} />
              <span>Nueva Regla</span>
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left: Smart Notifications */}
        <div className="md:col-span-4">
          <SmartNotifications autoRefresh={true} refreshInterval={30000} />
        </div>

        {/* Right: Rules List */}
        <div className="md:col-span-8">
          <div className="glass-panel overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center gap-2">
              <Settings size={20} className="text-gray-400" />
              <h3 className="font-semibold text-white">Reglas de Automatización</h3>
            </div>

            {rules.length === 0 ? (
              <div className="p-12 text-center text-gray-500 flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                  <Archive size={32} />
                </div>
                <p className="mb-4">No hay reglas configuradas</p>
                <button
                  onClick={() => setIsAddOpen(true)}
                  className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  <Plus size={16} /> Crear Primera Regla
                </button>
              </div>
            ) : (
              <div className="divide-y divide-white/5">
                {rules.map((rule) => (
                  <div
                    key={rule.id}
                    className={`p-4 flex items-center gap-4 hover:bg-white/5 transition-colors ${!rule.enabled ? 'opacity-50' : ''}`}
                  >
                    <Switch
                      checked={rule.enabled}
                      onChange={() => toggleRule(rule.id)}
                      size="small"
                      color="primary"
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-white truncate">{rule.name}</span>
                        {rule.createdBy === 'ai' && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-0.5">
                            <Sparkles size={8} /> AI
                          </span>
                        )}
                      </div>

                      <div className="flex items-center flex-wrap gap-2 text-sm">
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20">
                          {getSensorIcon(rule.trigger.sensor)}
                          <span>
                           {rule.trigger.sensor === 'substrateHumidity' ? 'Sustrato' :
                            rule.trigger.sensor === 'temperature' ? 'Temp' :
                            rule.trigger.sensor === 'humidity' ? 'Hum' : 'VPD'}
                           {' '}{rule.trigger.operator}{' '}{rule.trigger.value}
                           {rule.trigger.sensor === 'temperature' ? '°C' :
                            (rule.trigger.sensor === 'humidity' || rule.trigger.sensor === 'substrateHumidity') ? '%' : ''}
                          </span>
                        </div>

                        <ArrowRight size={14} className="text-gray-600" />

                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-green-500/10 text-green-300 border border-green-500/20">
                          {getActionIcon(rule.action.deviceId)}
                          <span>
                            {rule.action.type === 'device'
                              ? `${rule.action.deviceId} ➔ ${rule.action.deviceAction === 'on' ? 'ON' : 'OFF'}`
                              : 'Notificar'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <IconButton
                      size="small"
                      onClick={() => deleteRule(rule.id)}
                      sx={{ color: 'rgba(255,255,255,0.3)', '&:hover': { color: '#ef4444' } }}
                    >
                      <Trash2 size={18} />
                    </IconButton>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info Banner */}
          <div className="mt-4 p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 flex gap-3 text-sm text-blue-200/80">
            <Zap size={18} className="text-blue-400 shrink-0 mt-0.5" />
            <p>
              <strong className="text-blue-300">Nota:</strong> Las reglas se evalúan cada vez que los sensores se actualizan (~5s).
              Las acciones se ejecutan automáticamente cuando las condiciones se cumplen y continúan activas hasta que la condición cambie.
            </p>
          </div>
        </div>
      </div>

      {/* Add/Edit Rule Dialog - Keeping MUI for overlay but styling content */}
      <Dialog
        open={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#0f172a',
            backgroundImage: 'none',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px'
          }
        }}
      >
        <DialogTitle sx={{ color: 'white', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Zap size={20} className="text-yellow-400" />
          {editingRule ? 'Editar Regla' : 'Nueva Regla'}
        </DialogTitle>
        <DialogContent>
          <div className="flex flex-col gap-6 mt-2">
            <TextField
              label="Nombre de la Regla"
              fullWidth
              value={newRule.name || ''}
              onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
              placeholder="Ej: Encender humidificador si VPD alto"
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': { color: 'white' },
                '& .MuiInputLabel-root': { color: '#94a3b8' },
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' }
              }}
            />

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-[#0f172a] px-2 text-xs text-blue-400 uppercase tracking-wider font-bold">Si (Condición)</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: '#94a3b8' }}>Sensor</InputLabel>
                <Select
                  value={newRule.trigger?.sensor || 'vpd'}
                  label="Sensor"
                  onChange={(e) => setNewRule({
                    ...newRule,
                    trigger: { ...newRule.trigger!, type: 'sensor', sensor: e.target.value }
                  })}
                  sx={{ color: 'white', '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' } }}
                >
                  <MenuItem value="temperature">Temperatura</MenuItem>
                  <MenuItem value="humidity">Humedad</MenuItem>
                  <MenuItem value="vpd">VPD</MenuItem>
                  <MenuItem value="substrateHumidity">Sustrato</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: '#94a3b8' }}>Operador</InputLabel>
                <Select
                  value={newRule.trigger?.operator || '>'}
                  label="Operador"
                  onChange={(e) => setNewRule({
                    ...newRule,
                    trigger: { ...newRule.trigger!, operator: e.target.value as any }
                  })}
                  sx={{ color: 'white', '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' } }}
                >
                  <MenuItem value=">">Mayor que (&gt;)</MenuItem>
                  <MenuItem value="<">Menor que (&lt;)</MenuItem>
                  <MenuItem value="==">Igual a (==)</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label="Valor"
                type="number"
                size="small"
                fullWidth
                value={newRule.trigger?.value || 0}
                onChange={(e) => setNewRule({
                  ...newRule,
                  trigger: { ...newRule.trigger!, value: parseFloat(e.target.value) }
                })}
                sx={{
                  '& .MuiOutlinedInput-root': { color: 'white' },
                  '& .MuiInputLabel-root': { color: '#94a3b8' },
                  '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' }
                }}
              />
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center">
                <span className="bg-[#0f172a] px-2 text-xs text-green-400 uppercase tracking-wider font-bold">Entonces (Acción)</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: '#94a3b8' }}>Dispositivo</InputLabel>
                <Select
                  value={newRule.action?.deviceId || ''}
                  label="Dispositivo"
                  onChange={(e) => setNewRule({
                    ...newRule,
                    action: { ...newRule.action!, type: 'device', deviceId: e.target.value }
                  })}
                  sx={{ color: 'white', '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' } }}
                >
                  <MenuItem value="humidifier">Humidificador</MenuItem>
                  <MenuItem value="extractorControlador">Extractor</MenuItem>
                  <MenuItem value="luzPanel1">Luz Panel 1</MenuItem>
                  <MenuItem value="luzPanel2">Luz Panel 2</MenuItem>
                  <MenuItem value="bombaControlador">Bomba de Agua</MenuItem>
                  <MenuItem value="deshumidificador">Deshumidificador</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth size="small">
                <InputLabel sx={{ color: '#94a3b8' }}>Acción</InputLabel>
                <Select
                  value={newRule.action?.deviceAction || 'on'}
                  label="Acción"
                  onChange={(e) => setNewRule({
                    ...newRule,
                    action: { ...newRule.action!, deviceAction: e.target.value as any }
                  })}
                  sx={{ color: 'white', '.MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.2)' } }}
                >
                  <MenuItem value="on">Encender</MenuItem>
                  <MenuItem value="off">Apagar</MenuItem>
                  <MenuItem value="toggle">Alternar</MenuItem>
                </Select>
              </FormControl>
            </div>
          </div>
        </DialogContent>
        <DialogActions sx={{ p: 3, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <Button onClick={() => setIsAddOpen(false)} sx={{ color: 'rgba(255,255,255,0.6)' }}>Cancelar</Button>
          <Button
            onClick={handleSaveRule}
            variant="contained"
            disabled={!newRule.name}
            sx={{
              bgcolor: '#2563eb',
              '&:hover': { bgcolor: '#1d4ed8' },
              '&.Mui-disabled': { bgcolor: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.3)' }
            }}
          >
            {editingRule ? 'Guardar Cambios' : 'Crear Regla'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default Automations;

import React, { useState, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions, Button,
    TextField, Select, MenuItem, IconButton, List, ListItem,
    ListItemText, Typography, Box, FormControl, InputLabel
} from '@mui/material';
import { Trash2, Plus, Zap } from 'lucide-react';
import { apiClient } from '../../api/client';

interface RulesModalProps {
    open: boolean;
    onClose: () => void;
}

interface Rule {
    id: string;
    name: string;
    enabled: boolean;
    sensor: string;
    operator: '>' | '<' | '=';
    value: number;
    deviceId: string;
    action: 'on' | 'off';
}

const SENSORS = [
    { id: 'temperature', label: 'Temperatura' },
    { id: 'humidity', label: 'Humedad' },
    { id: 'vpd', label: 'VPD' },
    { id: 'substrateHumidity', label: 'Humedad Sustrato' }
];

export default function RulesModal({ open, onClose }: RulesModalProps) {
    const [rules, setRules] = useState<Rule[]>([]);
    const [devices, setDevices] = useState<any[]>([]); // simplified device list
    const [newRule, setNewRule] = useState<Partial<Rule>>({
        name: '',
        sensor: 'temperature',
        operator: '>',
        value: 25,
        deviceId: '',
        action: 'off',
        enabled: true
    });

    useEffect(() => {
        if (open) {
            fetchRules();
            fetchDevices();
        }
    }, [open]);

    const fetchRules = async () => {
        try {
            const res = await apiClient.request<Rule[]>('/api/rules');
            setRules(res || []);
        } catch (e) { console.error(e); }
    };

    const fetchDevices = async () => {
        try {
            const res = await apiClient.request<any[]>('/api/devices/list');
            // Filter controllable devices
            setDevices(res.filter(d => ['switch', 'light', 'fan_controller', 'pump_controller'].includes(d.type)));
        } catch (e) { console.error(e); }
    };

    const handleAdd = async () => {
        if (!newRule.name || !newRule.deviceId) return;
        try {
            const ruleToAdd = { ...newRule, id: Date.now().toString(), enabled: true };
            await apiClient.request('/api/rules', { method: 'POST', body: JSON.stringify(ruleToAdd) });
            setRules([...rules, ruleToAdd as Rule]);
            setNewRule({ name: '', sensor: 'temperature', operator: '>', value: 0, deviceId: '', action: 'off', enabled: true });
        } catch (e) { alert('Error adding rule'); }
    };

    const handleDelete = async (id: string) => {
        try {
            await apiClient.request(`/api/rules/${id}`, { method: 'DELETE' });
            setRules(rules.filter(r => r.id !== id));
        } catch (e) { alert('Error deleting rule'); }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { background: 'var(--glass-bg)', backdropFilter: 'var(--backdrop-blur)', border: 'var(--glass-border)' } }}>
            <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Zap size={20} className="text-yellow-400" />
                Automatización (Motor de Reglas)
            </DialogTitle>
            <DialogContent>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 4, p: 2, bgcolor: 'rgba(255,255,255,0.05)', borderRadius: 2 }}>
                    <Typography variant="subtitle2">Nueva Regla</Typography>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        <TextField
                            label="Nombre"
                            size="small"
                            value={newRule.name}
                            onChange={e => setNewRule({ ...newRule, name: e.target.value })}
                            sx={{ flex: 2, minWidth: 150 }}
                        />
                        <FormControl size="small" sx={{ minWidth: 120 }}>
                            <InputLabel>Si Sensor</InputLabel>
                            <Select value={newRule.sensor} label="Si Sensor" onChange={e => setNewRule({ ...newRule, sensor: e.target.value })}>
                                {SENSORS.map(s => <MenuItem key={s.id} value={s.id}>{s.label}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ minWidth: 80 }}>
                            <Select value={newRule.operator} onChange={e => setNewRule({ ...newRule, operator: e.target.value as any })}>
                                <MenuItem value=">">{'>'}</MenuItem>
                                <MenuItem value="<">{'<'}</MenuItem>
                                <MenuItem value="=">{'='}</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField
                            label="Valor"
                            type="number"
                            size="small"
                            value={newRule.value}
                            onChange={e => setNewRule({ ...newRule, value: Number(e.target.value) })}
                            sx={{ width: 80 }}
                        />
                        <FormControl size="small" sx={{ minWidth: 150, flex: 2 }}>
                            <InputLabel>Dispositivo</InputLabel>
                            <Select value={newRule.deviceId} label="Dispositivo" onChange={e => setNewRule({ ...newRule, deviceId: e.target.value })}>
                                {devices.map(d => <MenuItem key={d.id} value={d.id}>{d.name}</MenuItem>)}
                            </Select>
                        </FormControl>
                         <FormControl size="small" sx={{ minWidth: 100 }}>
                            <InputLabel>Acción</InputLabel>
                            <Select value={newRule.action} label="Acción" onChange={e => setNewRule({ ...newRule, action: e.target.value as any })}>
                                <MenuItem value="on">ENCENDER</MenuItem>
                                <MenuItem value="off">APAGAR</MenuItem>
                            </Select>
                        </FormControl>
                        <Button variant="contained" startIcon={<Plus />} onClick={handleAdd}>
                            Añadir
                        </Button>
                    </Box>
                </Box>

                <List>
                    {rules.length === 0 && <Typography color="text.secondary" align="center">No hay reglas activas.</Typography>}
                    {rules.map(rule => (
                        <ListItem key={rule.id} secondaryAction={
                            <IconButton edge="end" color="error" onClick={() => handleDelete(rule.id)}>
                                <Trash2 size={18} />
                            </IconButton>
                        } sx={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                            <ListItemText
                                primary={rule.name}
                                secondary={`SI ${rule.sensor} ${rule.operator} ${rule.value} ENTONCES ${rule.deviceId} -> ${rule.action.toUpperCase()}`}
                                primaryTypographyProps={{ fontWeight: 'bold', color: 'primary.main' }}
                            />
                        </ListItem>
                    ))}
                </List>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cerrar</Button>
            </DialogActions>
        </Dialog>
    );
}

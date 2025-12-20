/**
 * NutrientTracker Component
 * Track nutrients applied during irrigation for complete traceability
 * Includes Athena Pro Line dosing calculator
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Alert,
  Divider,
  Tabs,
  Tab,
  Slider
} from '@mui/material';
import { Beaker, Plus, Trash2, Download, Calendar, Droplets, Zap, Calculator } from 'lucide-react';
import { apiClient } from '../../api/client';
import { calculateDosing, PRO_LINE_DOSING } from '../../data/athena-nutrients';

interface NutrientEntry {
  id: string;
  date: string;
  nutrients: {
    name: string;
    mlPerLiter: number;
    brand?: string;
  }[];
  ecInput: number;
  phInput: number;
  ecRunoff?: number;
  phRunoff?: number;
  volumeL?: number;
  notes?: string;
}

// Athena Pro Line nutrients
const ATHENA_NUTRIENTS = [
  { name: 'Pro Grow', brand: 'Athena', category: 'base', color: '#22c55e' },
  { name: 'Pro Bloom', brand: 'Athena', category: 'base', color: '#a855f7' },
  { name: 'Pro Core', brand: 'Athena', category: 'base', color: '#3b82f6' },
  { name: 'CaMg', brand: 'Athena', category: 'suplemento', color: '#f59e0b' },
  { name: 'Stack', brand: 'Athena', category: 'suplemento', color: '#ec4899' },
  { name: 'Cleanse', brand: 'Athena', category: 'suplemento', color: '#06b6d4' },
  { name: 'Balance', brand: 'Athena', category: 'ph', color: '#6b7280' },
];

// Generic nutrients for other brands
const GENERIC_NUTRIENTS = [
  { name: 'Base A', brand: 'General', category: 'base', color: '#22c55e' },
  { name: 'Base B', brand: 'General', category: 'base', color: '#3b82f6' },
  { name: 'CalMag', brand: 'General', category: 'suplemento', color: '#f59e0b' },
  { name: 'Raíces', brand: 'General', category: 'suplemento', color: '#84cc16' },
  { name: 'Bloom Boost', brand: 'General', category: 'suplemento', color: '#ec4899' },
  { name: 'PK 13/14', brand: 'General', category: 'suplemento', color: '#a855f7' },
  { name: 'Enzimas', brand: 'General', category: 'suplemento', color: '#06b6d4' },
];

const NutrientTracker: React.FC = () => {
  const [entries, setEntries] = useState<NutrientEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tabIndex, setTabIndex] = useState(0); // 0: Registro, 1: Historial, 2: Dosificación
  const [validationError, setValidationError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');

  // Form state
  const [nutrients, setNutrients] = useState<{ name: string; mlPerLiter: number }[]>([
    { name: '', mlPerLiter: 0 }
  ]);
  const [ecInput, setEcInput] = useState<number>(1.5);
  const [phInput, setPhInput] = useState<number>(6.0);
  const [ecRunoff, setEcRunoff] = useState<number | undefined>();
  const [phRunoff, setPhRunoff] = useState<number | undefined>();
  const [volumeL, setVolumeL] = useState<number>(2);
  const [tankVolume, setTankVolume] = useState<number>(50); // Reservoir volume in liters
  const [notes, setNotes] = useState('');

  // Load entries from localStorage and try to sync from backend
  useEffect(() => {
    const loadEntries = async () => {
      setLoading(true);
      try {
        // First load from localStorage for instant display
        const saved = localStorage.getItem('pkgrower_nutrient_entries');
        if (saved) {
          setEntries(JSON.parse(saved));
        }
        // Try to sync with backend
        setSyncStatus('syncing');
        const response = await apiClient.getSettings();
        if (response.nutrientEntries) {
          setEntries(response.nutrientEntries);
          localStorage.setItem('pkgrower_nutrient_entries', JSON.stringify(response.nutrientEntries));
        }
        setSyncStatus('synced');
      } catch (e) {
        console.log('Offline mode - using local data');
        setSyncStatus('idle');
      } finally {
        setLoading(false);
      }
    };
    loadEntries();
  }, []);

  // Save entries to localStorage and optionally sync to backend
  const saveEntries = async (newEntries: NutrientEntry[]) => {
    localStorage.setItem('pkgrower_nutrient_entries', JSON.stringify(newEntries));
    setEntries(newEntries);

    // Try to sync to backend
    try {
      setSyncStatus('syncing');
      await apiClient.saveSettings({ nutrientEntries: newEntries });
      setSyncStatus('synced');
    } catch (e) {
      console.log('Saved locally, will sync when online');
      setSyncStatus('error');
    }
  };

  const handleAddNutrient = () => {
    setNutrients([...nutrients, { name: '', mlPerLiter: 0 }]);
  };

  const handleRemoveNutrient = (index: number) => {
    setNutrients(nutrients.filter((_, i) => i !== index));
  };

  const handleNutrientChange = (index: number, field: 'name' | 'mlPerLiter', value: string | number) => {
    const updated = [...nutrients];
    if (field === 'name') {
      updated[index].name = value as string;
    } else {
      updated[index].mlPerLiter = Number(value);
    }
    setNutrients(updated);
    setValidationError(null);
  };

  const handleSubmit = () => {
    // Validation
    const validNutrients = nutrients.filter(n => n.name && n.mlPerLiter > 0);
    if (validNutrients.length === 0) {
      setValidationError('Debes agregar al menos un nutriente con dosis válida');
      return;
    }
    if (ecInput < 0.1 || ecInput > 10) {
      setValidationError('EC debe estar entre 0.1 y 10 mS');
      return;
    }

    const entry: NutrientEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      nutrients: validNutrients,
      ecInput,
      phInput,
      ecRunoff,
      phRunoff,
      volumeL,
      notes
    };

    const newEntries = [entry, ...entries];
    saveEntries(newEntries);

    // Reset form
    setNutrients([{ name: '', mlPerLiter: 0 }]);
    setEcInput(1.5);
    setPhInput(6.0);
    setEcRunoff(undefined);
    setPhRunoff(undefined);
    setVolumeL(2);
    setNotes('');
    setShowForm(false);
    setValidationError(null);
  };

  const handleDelete = (id: string) => {
    const newEntries = entries.filter(e => e.id !== id);
    saveEntries(newEntries);
  };

  const handleExportCSV = () => {
    if (entries.length === 0) return;

    const headers = ['Fecha', 'Nutrientes', 'EC Entrada', 'pH Entrada', 'EC Runoff', 'pH Runoff', 'Volumen', 'Notas'];
    const rows = entries.map(e => [
      new Date(e.date).toLocaleString(),
      e.nutrients.map(n => `${n.name}:${n.mlPerLiter}ml`).join('; '),
      e.ecInput,
      e.phInput,
      e.ecRunoff || '',
      e.phRunoff || '',
      e.volumeL,
      e.notes || ''
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `nutrientes_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Box>
      {/* Header with Tabs */}
      <Box className="glass-panel" sx={{
        p: 2,
        borderRadius: '16px',
        mb: 3
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{
              p: 1.5,
              borderRadius: '12px',
              background: 'linear-gradient(135deg, rgba(234, 88, 12, 0.3), rgba(249, 115, 22, 0.2))',
              color: '#fb923c'
            }}>
              <Beaker size={24} />
            </Box>
            <Box>
              <Typography variant="h6" fontWeight="bold">Trazabilidad de Nutrientes</Typography>
              <Typography variant="caption" color="text.secondary">
                Registro de nutrientes aplicados al riego
                {syncStatus === 'syncing' && ' • Sincronizando...'}
                {syncStatus === 'synced' && ' • ✓ Sincronizado'}
                {syncStatus === 'error' && ' • ⚠ Solo local'}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            {entries.length > 0 && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<Download size={16} />}
                onClick={handleExportCSV}
                sx={{ borderRadius: '12px' }}
              >
                CSV
              </Button>
            )}
            <Button
              variant="contained"
              size="small"
              startIcon={<Plus size={16} />}
              onClick={() => { setShowForm(!showForm); setTabIndex(0); }}
              sx={{
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #22c55e, #16a34a)'
              }}
            >
              Nuevo Registro
            </Button>
          </Box>
        </Box>

        {/* Tabs */}
        <Tabs
          value={tabIndex}
          onChange={(_, v) => setTabIndex(v)}
          sx={{
            minHeight: 36,
            '& .MuiTab-root': { minHeight: 36, py: 0.5, fontSize: '0.8rem' }
          }}
        >
          <Tab label="📝 Registro" />
          <Tab label={`📋 Historial (${entries.length})`} />
          <Tab label="💊 Dosificación Pro" />
        </Tabs>
      </Box>

      {/* Validation Alert */}
      {validationError && (
        <Alert
          severity="error"
          onClose={() => setValidationError(null)}
          sx={{ mb: 2, borderRadius: '12px' }}
        >
          {validationError}
        </Alert>
      )}

      {/* Loading Indicator */}
      {loading && (
        <Alert severity="info" sx={{ mb: 2, borderRadius: '12px' }}>
          Cargando registros de nutrientes...
        </Alert>
      )}

      {/* Form */}
      {showForm && (
        <Box className="glass-panel" sx={{ p: 3, borderRadius: '16px', mb: 3 }}>
          <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
            📝 Registrar Aplicación de Nutrientes
          </Typography>

          {/* Athena Pro Line Calculator */}
          <Box sx={{
            p: 2,
            mb: 3,
            borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(234, 88, 12, 0.15), rgba(249, 115, 22, 0.1))',
            border: '1px solid rgba(234, 88, 12, 0.3)'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Calculator size={18} color="#fb923c" />
              <Typography variant="subtitle2" fontWeight="bold" sx={{ color: '#fb923c' }}>
                Calculadora Athena Pro Line - Estanque
              </Typography>
            </Box>

            <Grid container spacing={2} sx={{ mb: 2 }}>
              <Grid item xs={6}>
                <Typography variant="caption" color="text.secondary">EC Objetivo</Typography>
                <Slider
                  value={ecInput}
                  min={0.5}
                  max={6.0}
                  step={0.5}
                  onChange={(_, val) => setEcInput(val as number)}
                  valueLabelDisplay="on"
                  valueLabelFormat={(v) => `${v} mS`}
                  sx={{ color: '#fb923c', '& .MuiSlider-valueLabel': { bgcolor: '#fb923c' } }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Volumen Estanque (L)"
                  type="number"
                  value={tankVolume}
                  onChange={(e) => setTankVolume(Number(e.target.value))}
                  size="small"
                  fullWidth
                  inputProps={{ min: 1, max: 1000 }}
                />
              </Grid>
            </Grid>

            {/* Calculated Dosages with Tank Totals */}
            <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'stretch' }}>
              {(() => {
                const dosing = calculateDosing(ecInput);
                if (!dosing) return null;
                const totalProGrow = (dosing.proGrowBloom * tankVolume).toFixed(0);
                const totalProCore = (dosing.proCore * tankVolume).toFixed(0);
                return (
                  <>
                    <Box sx={{ flex: 1, minWidth: 120, p: 2, bgcolor: 'rgba(34, 197, 94, 0.15)', borderRadius: '12px', textAlign: 'center', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                      <Typography variant="caption" color="text.secondary">Pro Grow/Bloom</Typography>
                      <Typography variant="h5" fontWeight="bold" sx={{ color: '#22c55e' }}>{totalProGrow} ml</Typography>
                      <Typography variant="caption" sx={{ color: '#22c55e', opacity: 0.8 }}>({dosing.proGrowBloom} ml/L)</Typography>
                    </Box>
                    <Box sx={{ flex: 1, minWidth: 120, p: 2, bgcolor: 'rgba(59, 130, 246, 0.15)', borderRadius: '12px', textAlign: 'center', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                      <Typography variant="caption" color="text.secondary">Pro Core</Typography>
                      <Typography variant="h5" fontWeight="bold" sx={{ color: '#3b82f6' }}>{totalProCore} ml</Typography>
                      <Typography variant="caption" sx={{ color: '#3b82f6', opacity: 0.8 }}>({dosing.proCore} ml/L)</Typography>
                    </Box>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<Zap size={14} />}
                      onClick={() => {
                        setNutrients([
                          { name: 'Pro Grow', mlPerLiter: dosing.proGrowBloom },
                          { name: 'Pro Core', mlPerLiter: dosing.proCore }
                        ]);
                      }}
                      sx={{
                        borderColor: '#fb923c',
                        color: '#fb923c',
                        '&:hover': { borderColor: '#ea580c', bgcolor: 'rgba(234, 88, 12, 0.1)' }
                      }}
                    >
                      Aplicar
                    </Button>
                  </>
                );
              })()}
            </Box>
          </Box>

          <Grid container spacing={2}>
            {/* Nutrients List */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
                Nutrientes Aplicados
              </Typography>
              {nutrients.map((nutrient, idx) => (
                <Box key={idx} sx={{ display: 'flex', gap: 2, mb: 1, alignItems: 'center' }}>
                  <TextField
                    select
                    label="Nutriente"
                    value={nutrient.name}
                    onChange={(e) => handleNutrientChange(idx, 'name', e.target.value)}
                    size="small"
                    sx={{ flex: 2 }}
                    SelectProps={{ native: true }}
                  >
                    <option value="">Seleccionar...</option>
                    <optgroup label="🔶 Athena Pro Line">
                      {ATHENA_NUTRIENTS.map(n => (
                        <option key={n.name} value={n.name}>{n.name}</option>
                      ))}
                    </optgroup>
                    <optgroup label="📦 General">
                      {GENERIC_NUTRIENTS.map(n => (
                        <option key={n.name} value={n.name}>{n.name}</option>
                      ))}
                    </optgroup>
                    <option value="Otro">Otro...</option>
                  </TextField>
                  <TextField
                    label="ml/L"
                    type="number"
                    value={nutrient.mlPerLiter || ''}
                    onChange={(e) => handleNutrientChange(idx, 'mlPerLiter', e.target.value)}
                    size="small"
                    sx={{ flex: 1 }}
                    inputProps={{ step: 0.1, min: 0 }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => handleRemoveNutrient(idx)}
                    sx={{ color: '#ef4444' }}
                  >
                    <Trash2 size={18} />
                  </IconButton>
                </Box>
              ))}
              <Button
                size="small"
                startIcon={<Plus size={14} />}
                onClick={handleAddNutrient}
                sx={{ mt: 1 }}
              >
                Agregar Nutriente
              </Button>
            </Grid>

            <Grid item xs={12}>
              <Divider sx={{ my: 1 }} />
            </Grid>

            {/* EC/pH Input */}
            <Grid item xs={6} md={3}>
              <TextField
                label="EC Entrada"
                type="number"
                value={ecInput}
                onChange={(e) => setEcInput(Number(e.target.value))}
                size="small"
                fullWidth
                inputProps={{ step: 0.1 }}
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField
                label="pH Entrada"
                type="number"
                value={phInput}
                onChange={(e) => setPhInput(Number(e.target.value))}
                size="small"
                fullWidth
                inputProps={{ step: 0.1 }}
              />
            </Grid>

            {/* EC/pH Runoff */}
            <Grid item xs={6} md={3}>
              <TextField
                label="EC Runoff"
                type="number"
                value={ecRunoff || ''}
                onChange={(e) => setEcRunoff(e.target.value ? Number(e.target.value) : undefined)}
                size="small"
                fullWidth
                inputProps={{ step: 0.1 }}
              />
            </Grid>
            <Grid item xs={6} md={3}>
              <TextField
                label="pH Runoff"
                type="number"
                value={phRunoff || ''}
                onChange={(e) => setPhRunoff(e.target.value ? Number(e.target.value) : undefined)}
                size="small"
                fullWidth
                inputProps={{ step: 0.1 }}
              />
            </Grid>

            {/* Volume and Notes */}
            <Grid item xs={12} md={4}>
              <TextField
                label="Volumen Total (L)"
                type="number"
                value={volumeL}
                onChange={(e) => setVolumeL(Number(e.target.value))}
                size="small"
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={8}>
              <TextField
                label="Notas (opcional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                size="small"
                fullWidth
              />
            </Grid>

            {/* Submit */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
                <Button
                  variant="outlined"
                  onClick={() => setShowForm(false)}
                  sx={{ borderRadius: '12px' }}
                >
                  Cancelar
                </Button>
                <Button
                  variant="contained"
                  onClick={handleSubmit}
                  sx={{
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #22c55e, #16a34a)'
                  }}
                >
                  Guardar Registro
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Box>
      )}

      {/* Entries Table */}
      {entries.length === 0 ? (
        <Box className="glass-panel" sx={{
          p: 4,
          borderRadius: '16px',
          textAlign: 'center'
        }}>
          <Droplets size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
          <Typography variant="body1" color="text.secondary">
            No hay registros de nutrientes aún
          </Typography>
          <Typography variant="caption" color="text.disabled">
            Haz clic en "Nuevo Registro" para comenzar a trackear
          </Typography>
        </Box>
      ) : (
        <TableContainer component={Paper} sx={{
          borderRadius: '16px',
          bgcolor: 'rgba(255,255,255,0.03)',
          backdropFilter: 'blur(10px)'
        }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell><Calendar size={14} /> Fecha</TableCell>
                <TableCell>Nutrientes</TableCell>
                <TableCell>EC In/Out</TableCell>
                <TableCell>pH In/Out</TableCell>
                <TableCell>Vol</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {entries.map((entry) => (
                <TableRow key={entry.id} hover>
                  <TableCell>
                    <Typography variant="caption" fontWeight="bold">
                      {formatDate(entry.date)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                      {entry.nutrients.map((n, i) => (
                        <Chip
                          key={i}
                          label={`${n.name}: ${n.mlPerLiter}ml`}
                          size="small"
                          sx={{
                            bgcolor: 'rgba(234, 88, 12, 0.2)',
                            color: '#fb923c',
                            height: 24
                          }}
                        />
                      ))}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {entry.ecInput} / {entry.ecRunoff || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">
                      {entry.phInput} / {entry.phRunoff || '-'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">{entry.volumeL}L</Typography>
                  </TableCell>
                  <TableCell>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(entry.id)}
                      sx={{ opacity: 0.5, '&:hover': { opacity: 1, color: '#ef4444' } }}
                    >
                      <Trash2 size={16} />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Summary Stats */}
      {entries.length > 0 && (
        <Box className="glass-panel" sx={{
          display: 'flex',
          justifyContent: 'space-around',
          p: 2,
          borderRadius: '16px',
          mt: 2
        }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h5" fontWeight="bold" color="primary">{entries.length}</Typography>
            <Typography variant="caption" color="text.secondary">Total Registros</Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h5" fontWeight="bold" sx={{ color: '#22c55e' }}>
              {(entries.reduce((a, e) => a + (e.ecInput || 0), 0) / entries.length).toFixed(1)}
            </Typography>
            <Typography variant="caption" color="text.secondary">EC Promedio</Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h5" fontWeight="bold" sx={{ color: '#3b82f6' }}>
              {(entries.reduce((a, e) => a + (e.phInput || 0), 0) / entries.length).toFixed(1)}
            </Typography>
            <Typography variant="caption" color="text.secondary">pH Promedio</Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h5" fontWeight="bold" sx={{ color: '#fb923c' }}>
              {entries.reduce((a, e) => a + (e.volumeL || 0), 0).toFixed(1)}L
            </Typography>
            <Typography variant="caption" color="text.secondary">Vol Total</Typography>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default NutrientTracker;

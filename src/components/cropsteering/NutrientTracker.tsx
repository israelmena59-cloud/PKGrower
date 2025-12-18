/**
 * NutrientTracker Component
 * Track nutrients applied during irrigation for complete traceability
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
  Divider
} from '@mui/material';
import { Beaker, Plus, Trash2, Download, Calendar, Droplets } from 'lucide-react';
import { apiClient } from '../../api/client';

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

const COMMON_NUTRIENTS = [
  { name: 'Base A', brand: 'General' },
  { name: 'Base B', brand: 'General' },
  { name: 'CalMag', brand: 'General' },
  { name: 'Raíces', brand: 'General' },
  { name: 'Bloom', brand: 'General' },
  { name: 'PK 13/14', brand: 'General' },
  { name: 'Enzimas', brand: 'General' },
];

const NutrientTracker: React.FC = () => {
  const [entries, setEntries] = useState<NutrientEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form state
  const [nutrients, setNutrients] = useState<{ name: string; mlPerLiter: number }[]>([
    { name: '', mlPerLiter: 0 }
  ]);
  const [ecInput, setEcInput] = useState<number>(1.5);
  const [phInput, setPhInput] = useState<number>(6.0);
  const [ecRunoff, setEcRunoff] = useState<number | undefined>();
  const [phRunoff, setPhRunoff] = useState<number | undefined>();
  const [volumeL, setVolumeL] = useState<number>(2);
  const [notes, setNotes] = useState('');

  // Load entries from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('pkgrower_nutrient_entries');
    if (saved) {
      setEntries(JSON.parse(saved));
    }
  }, []);

  // Save entries to localStorage
  const saveEntries = (newEntries: NutrientEntry[]) => {
    localStorage.setItem('pkgrower_nutrient_entries', JSON.stringify(newEntries));
    setEntries(newEntries);
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
  };

  const handleSubmit = () => {
    const entry: NutrientEntry = {
      id: Date.now().toString(),
      date: new Date().toISOString(),
      nutrients: nutrients.filter(n => n.name && n.mlPerLiter > 0),
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
  };

  const handleDelete = (id: string) => {
    const newEntries = entries.filter(e => e.id !== id);
    saveEntries(newEntries);
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
      {/* Header */}
      <Box className="glass-panel" sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        p: 2,
        borderRadius: '16px',
        mb: 3
      }}>
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
            </Typography>
          </Box>
        </Box>
        <Button
          variant="contained"
          size="small"
          startIcon={<Plus size={16} />}
          onClick={() => setShowForm(!showForm)}
          sx={{
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #22c55e, #16a34a)'
          }}
        >
          Nuevo Registro
        </Button>
      </Box>

      {/* Form */}
      {showForm && (
        <Box className="glass-panel" sx={{ p: 3, borderRadius: '16px', mb: 3 }}>
          <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
            📝 Registrar Aplicación de Nutrientes
          </Typography>

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
                    {COMMON_NUTRIENTS.map(n => (
                      <option key={n.name} value={n.name}>{n.name}</option>
                    ))}
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

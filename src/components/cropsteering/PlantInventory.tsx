/**
 * Plant Inventory Component
 * Manage plant counts, strains, and phenotypes per room.
 */

import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Grid, TextField, IconButton, Dialog,
  DialogTitle, DialogContent, DialogActions, Chip, Divider
} from '@mui/material';
import { Plus, Trash2, Sprout, Dna } from 'lucide-react';
import { useRooms } from '../../context/RoomContext';
import { GlassCard, GlassButton } from '../common/GlassUI';

interface PlantBatch {
  id: string;
  strain: string;
  breeder: string;
  phenotype: string;
  count: number;
  dateAdded: string;
  notes: string;
}

const PlantInventory: React.FC = () => {
  const { activeRoomId, updateRoom } = useRooms();
  const [batches, setBatches] = useState<PlantBatch[]>([]);
  const [showDialog, setShowDialog] = useState(false);

  // Form State
  const [strain, setStrain] = useState('');
  const [breeder, setBreeder] = useState('');
  const [phenotype, setPhenotype] = useState('');
  const [count, setCount] = useState<number>(1);
  const [notes, setNotes] = useState('');

  // Load Inventory
  useEffect(() => {
    const saved = localStorage.getItem(`pkgrower_inventory_${activeRoomId}`);
    if (saved) {
      setBatches(JSON.parse(saved));
    } else {
      setBatches([]);
    }
  }, [activeRoomId]);

  // Sync total count to RoomContext
  useEffect(() => {
    const totalPlants = batches.reduce((sum, batch) => sum + batch.count, 0);
    // Sync with room context only if changed
    updateRoom(activeRoomId, { plantCount: totalPlants });
    localStorage.setItem(`pkgrower_inventory_${activeRoomId}`, JSON.stringify(batches));
  }, [batches, activeRoomId, updateRoom]);

  const handleAddBatch = () => {
    const newBatch: PlantBatch = {
      id: Date.now().toString(),
      strain: strain || 'Desconocida',
      breeder,
      phenotype,
      count: Math.max(1, count),
      dateAdded: new Date().toISOString(),
      notes
    };

    setBatches(prev => [...prev, newBatch]);

    // Reset form
    setStrain('');
    setBreeder('');
    setPhenotype('');
    setCount(1);
    setNotes('');
    setShowDialog(false);
  };

  const handleDelete = (id: string) => {
    setBatches(prev => prev.filter(b => b.id !== id));
  };

  const totalPlants = batches.reduce((sum, b) => sum + b.count, 0);

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ p: 1, borderRadius: '12px', bgcolor: 'rgba(34, 197, 94, 0.1)', color: '#22c55e' }}>
            <Sprout size={24} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight="bold">Inventario de Plantas</Typography>
            <Typography variant="caption" color="text.secondary">
              Total: {totalPlants} plantas en esta sala
            </Typography>
          </Box>
        </Box>
        <GlassButton
          variant="contained"
          size="small"
          startIcon={<Plus size={16} />}
          onClick={() => setShowDialog(true)}
          sx={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
        >
          Agregar Cepas
        </GlassButton>
      </Box>

      {batches.length === 0 ? (
        <Box sx={{
          p: 6,
          textAlign: 'center',
          border: '1px dashed rgba(255,255,255,0.1)',
          borderRadius: '24px',
          bgcolor: 'rgba(255,255,255,0.02)'
        }}>
          <Sprout size={48} color="#64748b" style={{ marginBottom: 16, opacity: 0.5 }} />
          <Typography variant="body1" color="text.secondary">No hay plantas registradas en esta sala.</Typography>
          <GlassButton sx={{ mt: 2 }} onClick={() => setShowDialog(true)} variant="outlined">
            Registrar primer lote
          </GlassButton>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {batches.map((batch) => (
            <Grid item xs={12} md={6} lg={4} key={batch.id}>
              <GlassCard className="glass-card-hover">
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, alignItems: 'flex-start' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Dna size={18} color="#a855f7" />
                    <Typography variant="subtitle1" fontWeight="bold">{batch.strain}</Typography>
                  </Box>
                  <Chip
                    label={`${batch.count} u.`}
                    size="small"
                    sx={{ bgcolor: 'rgba(34, 197, 94, 0.2)', color: '#22c55e', fontWeight: 'bold' }}
                  />
                </Box>

                <Divider sx={{ my: 1.5, borderColor: 'rgba(255,255,255,0.05)' }} />

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 1 }}>
                    {batch.breeder && (
                        <Chip label={batch.breeder} size="small" variant="outlined" sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
                    )}
                    {batch.phenotype && (
                        <Chip label={`Pheno: ${batch.phenotype}`} size="small" variant="outlined" sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
                    )}
                </Box>

                {batch.notes && (
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ fontStyle: 'italic', mb: 1 }}>
                        "{batch.notes}"
                    </Typography>
                )}

                <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                        {new Date(batch.dateAdded).toLocaleDateString()}
                    </Typography>
                    <IconButton size="small" onClick={() => handleDelete(batch.id)} sx={{ color: '#ef4444', opacity: 0.7, '&:hover': { opacity: 1, bgcolor: 'rgba(239, 68, 68, 0.1)' } }}>
                        <Trash2 size={16} />
                    </IconButton>
                </Box>
              </GlassCard>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Add Dialog */}
      <Dialog
        open={showDialog}
        onClose={() => setShowDialog(false)}
        PaperProps={{
          sx: {
            borderRadius: '24px',
            bgcolor: '#0f172a',
            border: '1px solid rgba(255,255,255,0.1)',
            backgroundImage: 'none',
            boxShadow: '0 24px 48px rgba(0,0,0,0.5)'
          }
        }}
      >
        <DialogTitle>Nuevo Lote de Plantas</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1, minWidth: 300 }}>
            <TextField
              label="Cepa / Variedad"
              value={strain}
              onChange={(e) => setStrain(e.target.value)}
              placeholder="Ej: Gorilla Glue #4"
              fullWidth
              variant="outlined"
            />
            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                label="Breeder"
                value={breeder}
                onChange={(e) => setBreeder(e.target.value)}
                size="small"
                fullWidth
              />
              <TextField
                label="Fenotipo"
                value={phenotype}
                onChange={(e) => setPhenotype(e.target.value)}
                placeholder="#1"
                size="small"
                fullWidth
              />
            </Box>
            <TextField
              label="Cantidad de Plantas"
              type="number"
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
              inputProps={{ min: 1 }}
              fullWidth
            />
            <TextField
              label="Notas"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              multiline
              rows={2}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <GlassButton onClick={() => setShowDialog(false)} color="inherit">Cancelar</GlassButton>
          <GlassButton
            variant="contained"
            onClick={handleAddBatch}
            disabled={!strain}
            glowColor="#10b981"
            sx={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
          >
            Agregar
          </GlassButton>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PlantInventory;

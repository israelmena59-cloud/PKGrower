/**
 * Room Manager Component
 * Complete UI for creating, editing, and managing grow rooms
 */

import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Button, TextField,
  Dialog, DialogTitle, DialogContent, DialogActions,
  IconButton, Chip, Select, MenuItem, FormControl, InputLabel,
  List, ListItem, ListItemText, ListItemSecondaryAction, Divider,
  Checkbox, FormGroup, FormControlLabel, Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';
import { Plus, Trash2, Edit2, Sun, Moon, Leaf, Flower2, Box as BoxIcon, Check, ChevronDown, Cpu, Thermometer } from 'lucide-react';
import { useRooms, Room, RoomType } from '../../context/RoomContext';
import { apiClient } from '../../api/client';

const ROOM_TYPE_CONFIG: Record<RoomType, { label: string; color: string; icon: React.ReactNode }> = {
  veg: { label: 'Vegetativo', color: '#22c55e', icon: <Leaf size={16} /> },
  flower: { label: 'Floración', color: '#a855f7', icon: <Flower2 size={16} /> },
  drying: { label: 'Secado', color: '#f59e0b', icon: <Sun size={16} /> },
  custom: { label: 'Personalizado', color: '#64748b', icon: <BoxIcon size={16} /> }
};

interface DeviceInfo {
  id: string;
  name: string;
  type: 'light' | 'sensor' | 'pump' | 'fan' | 'other';
  online?: boolean;
}

interface RoomFormData {
  name: string;
  type: RoomType;
  color: string;
  plantCount: number;
  lightsOnTime: string;
  lightsOffTime: string;
  growStartDate: string;
  flipDate: string;
  assignedDevices: string[];
  assignedSensors: string[];
}

const defaultFormData: RoomFormData = {
  name: '',
  type: 'veg',
  color: '#22c55e',
  plantCount: 0,
  lightsOnTime: '06:00',
  lightsOffTime: '00:00',
  growStartDate: '',
  flipDate: '',
  assignedDevices: [],
  assignedSensors: []
};

const RoomManager: React.FC = () => {
  const { rooms, activeRoomId, addRoom, updateRoom, deleteRoom, setActiveRoomId } = useRooms();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [formData, setFormData] = useState<RoomFormData>(defaultFormData);
  const [availableDevices, setAvailableDevices] = useState<DeviceInfo[]>([]);

  // Fetch available devices
  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const devices = await apiClient.getDeviceStates();
        const deviceList: DeviceInfo[] = Object.keys(devices).map(id => ({
          id,
          name: id.replace(/_/g, ' ').replace(/^auto /, ''),
          type: id.includes('sensor') ? 'sensor' : id.includes('luz') || id.includes('light') ? 'light' : 'other',
          online: true
        }));
        setAvailableDevices(deviceList);
      } catch (e) {
        console.warn('Could not fetch devices:', e);
      }
    };
    fetchDevices();
  }, []);

  const toggleDevice = (deviceId: string, isSensor: boolean) => {
    const field = isSensor ? 'assignedSensors' : 'assignedDevices';
    const current = formData[field];
    const updated = current.includes(deviceId)
      ? current.filter(id => id !== deviceId)
      : [...current, deviceId];
    setFormData({ ...formData, [field]: updated });
  };

  const handleOpenCreate = () => {
    setEditingRoom(null);
    setFormData(defaultFormData);
    setDialogOpen(true);
  };

  const handleOpenEdit = (room: Room) => {
    setEditingRoom(room);
    setFormData({
      name: room.name,
      type: room.type,
      color: room.color,
      plantCount: room.plantCount,
      lightsOnTime: room.lightsOnTime,
      lightsOffTime: room.lightsOffTime,
      growStartDate: room.growStartDate || '',
      flipDate: room.flipDate || '',
      assignedDevices: room.assignedDevices || [],
      assignedSensors: room.assignedSensors || []
    });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (editingRoom) {
      updateRoom(editingRoom.id, {
        ...formData,
        growStartDate: formData.growStartDate || null,
        flipDate: formData.flipDate || null,
        assignedDevices: formData.assignedDevices,
        assignedSensors: formData.assignedSensors
      });
    } else {
      addRoom({
        ...formData,
        growStartDate: formData.growStartDate || null,
        flipDate: formData.flipDate || null,
        harvestDate: null,
        assignedDevices: formData.assignedDevices,
        assignedSensors: formData.assignedSensors
      });
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('¿Estás seguro de eliminar esta sala?')) {
      deleteRoom(id);
    }
  };

  const calculateLightHours = (on: string, off: string) => {
    const [onH] = on.split(':').map(Number);
    const [offH] = off.split(':').map(Number);
    if (offH > onH) return offH - onH;
    return 24 - onH + offH;
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" fontWeight="bold">
          🏠 Gestión de Salas
        </Typography>
        <Button
          variant="contained"
          startIcon={<Plus size={16} />}
          onClick={handleOpenCreate}
          sx={{ borderRadius: 2 }}
        >
          Nueva Sala
        </Button>
      </Box>

      {/* Room Cards */}
      <Grid container spacing={2}>
        {rooms.map(room => {
          const config = ROOM_TYPE_CONFIG[room.type];
          const lightHours = calculateLightHours(room.lightsOnTime, room.lightsOffTime);
          const isActive = room.id === activeRoomId;

          return (
            <Grid item xs={12} md={6} key={room.id}>
              <Card
                sx={{
                  position: 'relative',
                  border: isActive ? `2px solid ${room.color}` : '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 3,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': { transform: 'translateY(-2px)', boxShadow: 3 }
                }}
                onClick={() => setActiveRoomId(room.id)}
              >
                {isActive && (
                  <Box sx={{
                    position: 'absolute', top: 8, right: 8,
                    bgcolor: room.color, borderRadius: '50%', p: 0.5
                  }}>
                    <Check size={14} color="white" />
                  </Box>
                )}

                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Box sx={{
                      width: 40, height: 40, borderRadius: 2,
                      bgcolor: `${room.color}20`, color: room.color,
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      {config.icon}
                    </Box>
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="subtitle1" fontWeight="bold">{room.name}</Typography>
                      <Chip
                        label={config.label}
                        size="small"
                        sx={{ bgcolor: `${room.color}20`, color: room.color, fontSize: '0.7rem' }}
                      />
                    </Box>
                    <Box>
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleOpenEdit(room); }}>
                        <Edit2 size={16} />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        onClick={(e) => { e.stopPropagation(); handleDelete(room.id); }}
                        disabled={rooms.length <= 1}
                      >
                        <Trash2 size={16} />
                      </IconButton>
                    </Box>
                  </Box>

                  <Divider sx={{ my: 1.5 }} />

                  <Grid container spacing={1}>
                    <Grid item xs={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
                        <Sun size={14} />
                        <Typography variant="caption">
                          {lightHours}h luz ({room.lightsOnTime} - {room.lightsOffTime})
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
                        <Leaf size={14} />
                        <Typography variant="caption">
                          {room.plantCount} plantas
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
                        <Cpu size={14} />
                        <Typography variant="caption">
                          {(room.assignedDevices?.length || 0)} dispositivos
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'text.secondary' }}>
                        <Thermometer size={14} />
                        <Typography variant="caption">
                          {(room.assignedSensors?.length || 0)} sensores
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>

                  {room.growStartDate && (
                    <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.secondary' }}>
                      📅 Inicio: {new Date(room.growStartDate).toLocaleDateString()}
                      {room.flipDate && ` → Flip: ${new Date(room.flipDate).toLocaleDateString()}`}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingRoom ? 'Editar Sala' : 'Nueva Sala'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Nombre de la sala"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              fullWidth
              required
            />

            <FormControl fullWidth>
              <InputLabel>Tipo</InputLabel>
              <Select
                value={formData.type}
                label="Tipo"
                onChange={(e) => {
                  const type = e.target.value as RoomType;
                  const config = ROOM_TYPE_CONFIG[type];
                  setFormData({
                    ...formData,
                    type,
                    color: config.color,
                    lightsOffTime: type === 'flower' ? '18:00' : '00:00'
                  });
                }}
              >
                {Object.entries(ROOM_TYPE_CONFIG).map(([key, val]) => (
                  <MenuItem key={key} value={key}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {val.icon} {val.label}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Luces encendidas"
                  type="time"
                  value={formData.lightsOnTime}
                  onChange={(e) => setFormData({ ...formData, lightsOnTime: e.target.value })}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Luces apagadas"
                  type="time"
                  value={formData.lightsOffTime}
                  onChange={(e) => setFormData({ ...formData, lightsOffTime: e.target.value })}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>

            <TextField
              label="Número de plantas"
              type="number"
              value={formData.plantCount}
              onChange={(e) => setFormData({ ...formData, plantCount: parseInt(e.target.value) || 0 })}
              fullWidth
            />

            <Divider />

            <Typography variant="subtitle2" color="text.secondary">Fechas del cultivo</Typography>

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <TextField
                  label="Fecha inicio vegetativo"
                  type="date"
                  value={formData.growStartDate}
                  onChange={(e) => setFormData({ ...formData, growStartDate: e.target.value })}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={6}>
                <TextField
                  label="Fecha flip (12/12)"
                  type="date"
                  value={formData.flipDate}
                  onChange={(e) => setFormData({ ...formData, flipDate: e.target.value })}
                  fullWidth
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
            </Grid>

            {/* Device Assignment Section */}
            {availableDevices.length > 0 && (
              <>
                <Divider sx={{ mt: 2 }} />
                <Accordion sx={{ bgcolor: 'transparent', boxShadow: 'none', '&:before': { display: 'none' } }}>
                  <AccordionSummary expandIcon={<ChevronDown size={16} />}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Cpu size={16} />
                      <Typography variant="subtitle2">
                        Dispositivos Asignados ({formData.assignedDevices.length + formData.assignedSensors.length})
                      </Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Grid container spacing={1}>
                      {availableDevices.map(device => {
                        const isSensor = device.type === 'sensor';
                        const isAssigned = isSensor
                          ? formData.assignedSensors.includes(device.id)
                          : formData.assignedDevices.includes(device.id);

                        return (
                          <Grid item xs={6} key={device.id}>
                            <FormControlLabel
                              control={
                                <Checkbox
                                  checked={isAssigned}
                                  onChange={() => toggleDevice(device.id, isSensor)}
                                  size="small"
                                />
                              }
                              label={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  {isSensor ? <Thermometer size={12} /> : <Cpu size={12} />}
                                  <Typography variant="caption">{device.name}</Typography>
                                </Box>
                              }
                            />
                          </Grid>
                        );
                      })}
                    </Grid>
                  </AccordionDetails>
                </Accordion>
              </>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!formData.name}
          >
            {editingRoom ? 'Guardar Cambios' : 'Crear Sala'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RoomManager;

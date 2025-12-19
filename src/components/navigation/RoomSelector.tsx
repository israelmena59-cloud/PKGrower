/**
 * Room Selector Component
 * Allows switching between different grow rooms
 */

import React, { useState } from 'react';
import {
  Box,
  Button,
  Menu,
  MenuItem,
  Typography,
  ListItemIcon,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Chip
} from '@mui/material';
import {
  ChevronsUpDown,
  Plus,
  Flower2,
  Leaf,
  Sprout,
  Warehouse,
  Settings
} from 'lucide-react';
import { useRooms, RoomType } from '../../context/RoomContext';

const ROOM_TYPES: { id: RoomType; label: string; icon: any }[] = [
  { id: 'veg', label: 'Vegetativo', icon: Leaf },
  { id: 'flower', label: 'Floración', icon: Flower2 },
  { id: 'drying', label: 'Secado', icon: Warehouse },
  { id: 'custom', label: 'Personalizado', icon: Sprout },
];

const COLORS = ['#22c55e', '#a855f7', '#3b82f6', '#f59e0b', '#ec4899', '#ef4444'];

const RoomSelector: React.FC = () => {
  const { rooms, activeRoom, setActiveRoomId, addRoom } = useRooms();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);

  // New Room Form State
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomType, setNewRoomType] = useState<RoomType>('veg');
  const [newRoomColor, setNewRoomColor] = useState(COLORS[0]);

  const handleOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleSelect = (id: string) => {
    setActiveRoomId(id);
    handleClose();
  };

  const handleCreateRoom = () => {
    if (newRoomName) {
      addRoom({
        name: newRoomName,
        type: newRoomType,
        color: newRoomColor,
        plantCount: 0
      });
      setShowAddDialog(false);
      setNewRoomName('');
    }
  };

  const getIcon = (type: RoomType) => {
    const found = ROOM_TYPES.find(t => t.id === type);
    const Icon = found ? found.icon : Sprout;
    return <Icon size={16} />;
  };

  return (
    <>
      <Button
        onClick={handleOpen}
        sx={{
          textTransform: 'none',
          color: 'white',
          bgcolor: 'rgba(255,255,255,0.05)',
          borderRadius: '12px',
          px: 2,
          py: 1,
          border: `1px solid ${activeRoom.color}40`,
          minWidth: 200,
          justifyContent: 'space-between',
          '&:hover': {
            bgcolor: 'rgba(255,255,255,0.1)',
            border: `1px solid ${activeRoom.color}80`,
          }
        }}
        endIcon={<ChevronsUpDown size={16} style={{ opacity: 0.5 }} />}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            bgcolor: activeRoom.color,
            boxShadow: `0 0 8px ${activeRoom.color}`
          }} />
          <Box sx={{ textAlign: 'left' }}>
            <Typography variant="body2" fontWeight="bold" sx={{ lineHeight: 1.2 }}>
              {activeRoom.name}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
              {rooms.length > 1 ? `${rooms.length} Salas` : 'Sala Principal'}
            </Typography>
          </Box>
        </Box>
      </Button>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: {
            mt: 1,
            width: 240,
            borderRadius: '16px',
            bgcolor: '#1e293b',
            backgroundImage: 'linear-gradient(rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.05))',
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(20px)'
          }
        }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="caption" color="text.secondary" fontWeight="bold">
            MIS SALAS
          </Typography>
        </Box>

        {rooms.map((room) => (
          <MenuItem
            key={room.id}
            onClick={() => handleSelect(room.id)}
            selected={room.id === activeRoom.id}
            sx={{
              mx: 1,
              borderRadius: '8px',
              mb: 0.5,
              '&.Mui-selected': {
                bgcolor: `${room.color}20`,
                '&:hover': { bgcolor: `${room.color}30` }
              }
            }}
          >
            <ListItemIcon sx={{ minWidth: 32, color: room.color }}>
              {getIcon(room.type)}
            </ListItemIcon>
            <ListItemText
              primary={room.name}
              secondary={`${room.plantCount} Plantas`}
              primaryTypographyProps={{ fontWeight: room.id === activeRoom.id ? 'bold' : 'normal', fontSize: '0.9rem' }}
              secondaryTypographyProps={{ fontSize: '0.75rem' }}
            />
          </MenuItem>
        ))}

        <Box sx={{ px: 1, mt: 1, pt: 1, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <Button
            fullWidth
            startIcon={<Plus size={16} />}
            onClick={() => {
              handleClose();
              setShowAddDialog(true);
            }}
            sx={{
              justifyContent: 'flex-start',
              color: 'text.secondary',
              fontSize: '0.85rem',
              '&:hover': { color: 'white', bgcolor: 'rgba(255,255,255,0.05)' }
            }}
          >
            Crear Nueva Sala
          </Button>
        </Box>
      </Menu>

      {/* Add Room Dialog */}
      <Dialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        PaperProps={{
          sx: {
            borderRadius: '20px',
            bgcolor: '#0f172a',
            border: '1px solid rgba(255,255,255,0.1)',
            backgroundImage: 'none'
          }
        }}
      >
        <DialogTitle>Nueva Sala de Cultivo</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1, minWidth: 300 }}>
            <TextField
              label="Nombre de la Sala"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder="Ej: Carpa 120x120"
              fullWidth
            />

            <TextField
              select
              label="Tipo de Sala"
              value={newRoomType}
              onChange={(e) => setNewRoomType(e.target.value as RoomType)}
              SelectProps={{ native: true }}
              fullWidth
            >
              {ROOM_TYPES.map(type => (
                <option key={type.id} value={type.id}>{type.label}</option>
              ))}
            </TextField>

            <Box>
              <Typography variant="caption" sx={{ mb: 1, display: 'block' }}>Color Identificador</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                {COLORS.map(color => (
                  <Box
                    key={color}
                    onClick={() => setNewRoomColor(color)}
                    sx={{
                      width: 32,
                      height: 32,
                      borderRadius: '50%',
                      bgcolor: color,
                      cursor: 'pointer',
                      border: newRoomColor === color ? '2px solid white' : '2px solid transparent',
                      boxShadow: newRoomColor === color ? `0 0 10px ${color}` : 'none',
                      transition: 'all 0.2s'
                    }}
                  />
                ))}
              </Box>
            </Box>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setShowAddDialog(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleCreateRoom}
            disabled={!newRoomName}
            sx={{ bgcolor: newRoomColor, '&:hover': { bgcolor: newRoomColor, filter: 'brightness(0.9)' } }}
          >
            Crear Sala
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default RoomSelector;

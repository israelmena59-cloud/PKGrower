/**
 * CultivationCalendar Component
 * Track photoperiod changes, growth stages, and important cultivation events
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useRooms } from '../../context/RoomContext';
import {
  Box,
  Typography,
  Button,
  Grid,
  TextField,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert
} from '@mui/material';
import {
  Calendar,
  Plus,
  Trash2,
  Sun,
  Moon,
  Leaf,
  Flower2,
  Droplets,
  Scissors,
  ArrowRight,
  Clock
} from 'lucide-react';

interface CultivationEvent {
  id: string;
  date: string;
  type: 'photoperiod' | 'stage' | 'feeding' | 'training' | 'note';
  title: string;
  description?: string;
  fromValue?: string;
  toValue?: string;
}

const EVENT_TYPES = [
  { id: 'photoperiod', name: 'Cambio Fotoperiodo', icon: Sun, color: '#f59e0b' },
  { id: 'stage', name: 'Cambio de Etapa', icon: Leaf, color: '#22c55e' },
  { id: 'feeding', name: 'Cambio Nutrición', icon: Droplets, color: '#3b82f6' },
  { id: 'training', name: 'Entrenamiento', icon: Scissors, color: '#a855f7' },
  { id: 'note', name: 'Nota General', icon: Calendar, color: '#6b7280' },
];

const PHOTOPERIOD_OPTIONS = [
  '24/0', '20/4', '18/6', '16/8', '14/10', '12/12', '11/13', '10/14'
];

const STAGE_OPTIONS = [
  'Clones', 'Vegetativo Temprano', 'Vegetativo Tardío',
  'Transición', 'Floración Temprana', 'Floración Media',
  'Floración Tardía', 'Maduración'
];

const CultivationCalendar: React.FC = () => {
  const { activeRoomId } = useRooms();
  const [events, setEvents] = useState<CultivationEvent[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [startDate, setStartDate] = useState<string>(() => {
    const saved = localStorage.getItem(`pkgrower_cultivation_start_${activeRoomId}`);
    return saved || new Date().toISOString().split('T')[0];
  });

  // Form state
  const [eventType, setEventType] = useState<string>('photoperiod');
  const [eventDate, setEventDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [eventTitle, setEventTitle] = useState('');
  const [fromValue, setFromValue] = useState('');
  const [toValue, setToValue] = useState('');
  const [description, setDescription] = useState('');

  // Load events from localStorage when activeRoomId changes
  useEffect(() => {
    const saved = localStorage.getItem(`pkgrower_cultivation_events_${activeRoomId}`);
    const savedStart = localStorage.getItem(`pkgrower_cultivation_start_${activeRoomId}`);

    if (saved) {
      setEvents(JSON.parse(saved));
    } else {
      setEvents([]);
    }

    if (savedStart) {
      setStartDate(savedStart);
    }
  }, [activeRoomId]);

  // Save events with room namespace
  const saveEvents = (newEvents: CultivationEvent[]) => {
    localStorage.setItem(`pkgrower_cultivation_events_${activeRoomId}`, JSON.stringify(newEvents));
    setEvents(newEvents);
  };

  // Save start date with room namespace
  const handleStartDateChange = (date: string) => {
    setStartDate(date);
    localStorage.setItem(`pkgrower_cultivation_start_${activeRoomId}`, date);
  };

  // Calculate days since start
  const daysSinceStart = useMemo(() => {
    const start = new Date(startDate);
    const now = new Date();
    return Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  }, [startDate]);

  // Get current photoperiod (latest photoperiod event)
  const currentPhotoperiod = useMemo(() => {
    const photoEvents = events
      .filter(e => e.type === 'photoperiod')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return photoEvents[0]?.toValue || '18/6';
  }, [events]);

  // Get current stage
  const currentStage = useMemo(() => {
    const stageEvents = events
      .filter(e => e.type === 'stage')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return stageEvents[0]?.toValue || 'Vegetativo';
  }, [events]);

  // Calculate days since flip (12/12 or 11/13)
  const daysSinceFlip = useMemo(() => {
    const flipEvent = events
      .filter(e => e.type === 'photoperiod' && (e.toValue === '12/12' || e.toValue === '11/13'))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

    if (!flipEvent) return null;

    const flipDate = new Date(flipEvent.date);
    const now = new Date();
    // Normalize to start of day to avoid partial day mismatches
    flipDate.setHours(0,0,0,0);
    now.setHours(0,0,0,0);

    const diffTime = Math.abs(now.getTime() - flipDate.getTime());
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }, [events]);

  const handleSubmit = () => {
    const typeConfig = EVENT_TYPES.find(t => t.id === eventType);

    const newEvent: CultivationEvent = {
      id: Date.now().toString(),
      date: eventDate,
      type: eventType as CultivationEvent['type'],
      title: eventTitle || typeConfig?.name || 'Evento',
      description,
      fromValue,
      toValue
    };

    const newEvents = [newEvent, ...events].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
    saveEvents(newEvents);

    // Reset form
    setEventTitle('');
    setFromValue('');
    setToValue('');
    setDescription('');
    setShowDialog(false);
  };

  const handleDelete = (id: string) => {
    const newEvents = events.filter(e => e.id !== id);
    saveEvents(newEvents);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-CL', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getEventIcon = (type: string) => {
    const config = EVENT_TYPES.find(t => t.id === type);
    if (!config) return Calendar;
    return config.icon;
  };

  const getEventColor = (type: string) => {
    const config = EVENT_TYPES.find(t => t.id === type);
    return config?.color || '#6b7280';
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
            background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.3), rgba(22, 163, 74, 0.2))',
            color: '#22c55e'
          }}>
            <Calendar size={24} />
          </Box>
          <Box>
            <Typography variant="h6" fontWeight="bold">Calendario de Cultivo</Typography>
            <Typography variant="caption" color="text.secondary">
              Seguimiento de fotoperiodo y eventos
            </Typography>
          </Box>
        </Box>
        <Button
          variant="contained"
          size="small"
          startIcon={<Plus size={16} />}
          onClick={() => setShowDialog(true)}
          sx={{
            borderRadius: '12px',
            background: 'linear-gradient(135deg, #22c55e, #16a34a)'
          }}
        >
          Nuevo Evento
        </Button>
      </Box>

      {/* Current Status Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        {/* Days Counter */}
        <Grid item xs={6} md={3}>
          <Box className="glass-panel" sx={{ p: 2, borderRadius: '16px', textAlign: 'center' }}>
            <Typography variant="h3" fontWeight="bold" sx={{ color: '#22c55e' }}>
              {daysSinceStart}
            </Typography>
            <Typography variant="caption" color="text.secondary">Días de Cultivo</Typography>
            <TextField
              type="date"
              size="small"
              value={startDate}
              onChange={(e) => handleStartDateChange(e.target.value)}
              sx={{ mt: 1, '& input': { fontSize: '0.75rem', textAlign: 'center' } }}
              fullWidth
            />
          </Box>
        </Grid>

        {/* Current Photoperiod */}
        <Grid item xs={6} md={3}>
          <Box className="glass-panel" sx={{ p: 2, borderRadius: '16px', textAlign: 'center' }}>
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1, mb: 1 }}>
              <Sun size={24} color="#f59e0b" />
              <Moon size={20} color="#6366f1" />
            </Box>
            <Typography variant="h4" fontWeight="bold" sx={{ color: '#f59e0b' }}>
              {currentPhotoperiod}
            </Typography>
            <Typography variant="caption" color="text.secondary">Fotoperiodo Actual</Typography>
          </Box>
        </Grid>

        {/* Current Stage */}
        <Grid item xs={6} md={3}>
          <Box className="glass-panel" sx={{ p: 2, borderRadius: '16px', textAlign: 'center' }}>
            <Leaf size={28} color="#22c55e" style={{ marginBottom: 8 }} />
            <Typography variant="body1" fontWeight="bold" noWrap>
              {currentStage}
            </Typography>
            <Typography variant="caption" color="text.secondary">Etapa Actual</Typography>
          </Box>
        </Grid>

        {/* Days Since Flip Counter */}
        <Grid item xs={6} md={3}>
          <Box className="glass-panel" sx={{
            p: 2,
            borderRadius: '16px',
            textAlign: 'center',
            background: daysSinceFlip !== null ? 'rgba(168, 85, 247, 0.1)' : 'rgba(255,255,255,0.02)',
            border: daysSinceFlip !== null ? '1px solid rgba(168, 85, 247, 0.3)' : '1px solid rgba(255,255,255,0.1)'
          }}>
            <Typography variant="h3" fontWeight="bold" sx={{ color: daysSinceFlip !== null ? '#a855f7' : 'text.disabled' }}>
              {daysSinceFlip !== null ? daysSinceFlip : '-'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {daysSinceFlip !== null ? 'Días desde 12/12' : 'Sin Flip registrado'}
            </Typography>
          </Box>
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Box className="glass-panel" sx={{ p: 2, borderRadius: '16px', mb: 3 }}>
        <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2 }}>
          ⚡ Acciones Rápidas
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {/* Quick Photoperiod Changes */}
          <Button
            size="small"
            variant="outlined"
            startIcon={<Sun size={14} />}
            onClick={() => {
              const newEvent: CultivationEvent = {
                id: Date.now().toString(),
                date: new Date().toISOString().split('T')[0],
                type: 'photoperiod',
                title: 'Cambio a Floración',
                fromValue: currentPhotoperiod,
                toValue: '12/12'
              };
              saveEvents([newEvent, ...events]);
            }}
            sx={{ borderColor: '#f59e0b', color: '#f59e0b' }}
          >
            Cambiar a 12/12
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<Sun size={14} />}
            onClick={() => {
              const newEvent: CultivationEvent = {
                id: Date.now().toString(),
                date: new Date().toISOString().split('T')[0],
                type: 'photoperiod',
                title: 'Ajuste Fotoperiodo',
                fromValue: currentPhotoperiod,
                toValue: '11/13'
              };
              saveEvents([newEvent, ...events]);
            }}
            sx={{ borderColor: '#a855f7', color: '#a855f7' }}
          >
            Cambiar a 11/13
          </Button>
          {/* Quick Stage Changes */}
          <Button
            size="small"
            variant="outlined"
            startIcon={<Leaf size={14} />}
            onClick={() => {
              const newEvent: CultivationEvent = {
                id: Date.now().toString(),
                date: new Date().toISOString().split('T')[0],
                type: 'stage',
                title: 'Inicio Floración',
                fromValue: currentStage,
                toValue: 'Floración Temprana'
              };
              saveEvents([newEvent, ...events]);
            }}
            sx={{ borderColor: '#22c55e', color: '#22c55e' }}
          >
            Iniciar Floración
          </Button>
          <Button
            size="small"
            variant="outlined"
            startIcon={<Flower2 size={14} />}
            onClick={() => {
              const newEvent: CultivationEvent = {
                id: Date.now().toString(),
                date: new Date().toISOString().split('T')[0],
                type: 'stage',
                title: 'Etapa Bulk',
                fromValue: currentStage,
                toValue: 'Floración Media'
              };
              saveEvents([newEvent, ...events]);
            }}
            sx={{ borderColor: '#ec4899', color: '#ec4899' }}
          >
            Floración Media
          </Button>
        </Box>
      </Box>

      {/* Events Timeline */}
      {events.length === 0 ? (
        <Box className="glass-panel" sx={{ p: 4, borderRadius: '16px', textAlign: 'center' }}>
          <Calendar size={48} style={{ opacity: 0.3, marginBottom: 16 }} />
          <Typography variant="body1" color="text.secondary">
            No hay eventos registrados
          </Typography>
          <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mb: 2 }}>
            Usa las acciones rápidas arriba o crea un nuevo evento
          </Typography>
          <Alert severity="info" sx={{ textAlign: 'left', mt: 2 }}>
            💡 <strong>Tip:</strong> Registra tu fotoperiodo inicial (18/6 para vegetativo) y la etapa actual para empezar el seguimiento.
          </Alert>
        </Box>
      ) : (
        <Box className="glass-panel" sx={{ p: 2, borderRadius: '16px' }}>
          <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 2 }}>
            📅 Línea de Tiempo
          </Typography>

          {events.map((event, idx) => {
            const IconComponent = getEventIcon(event.type);
            const color = getEventColor(event.type);

            return (
              <Box key={event.id} sx={{
                display: 'flex',
                gap: 2,
                py: 1.5,
                borderBottom: idx < events.length - 1 ? '1px solid rgba(255,255,255,0.1)' : 'none'
              }}>
                {/* Icon */}
                <Box sx={{
                  p: 1,
                  borderRadius: '8px',
                  bgcolor: `${color}20`,
                  color: color,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: 40,
                  height: 40
                }}>
                  <IconComponent size={20} />
                </Box>

                {/* Content */}
                <Box sx={{ flex: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                    <Typography variant="body2" fontWeight="bold">{event.title}</Typography>
                    {event.fromValue && event.toValue && (
                      <Chip
                        size="small"
                        label={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            {event.fromValue} <ArrowRight size={12} /> {event.toValue}
                          </Box>
                        }
                        sx={{ bgcolor: `${color}30`, color: color, height: 22 }}
                      />
                    )}
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {formatDate(event.date)}
                    {event.description && ` — ${event.description}`}
                  </Typography>
                </Box>

                {/* Delete */}
                <IconButton
                  size="small"
                  onClick={() => handleDelete(event.id)}
                  sx={{ opacity: 0.5, '&:hover': { opacity: 1, color: '#ef4444' } }}
                >
                  <Trash2 size={16} />
                </IconButton>
              </Box>
            );
          })}
        </Box>
      )}

      {/* Add Event Dialog */}
      <Dialog open={showDialog} onClose={() => setShowDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: 'rgba(0,0,0,0.3)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Calendar size={20} />
            Registrar Evento de Cultivo
          </Box>
        </DialogTitle>
        <DialogContent sx={{ bgcolor: 'rgba(0,0,0,0.2)', pt: 3 }}>
          <Grid container spacing={2}>
            {/* Event Type */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Tipo de Evento</Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {EVENT_TYPES.map((type) => {
                  const IconComp = type.icon;
                  return (
                    <Chip
                      key={type.id}
                      label={type.name}
                      icon={<IconComp size={16} />}
                      onClick={() => setEventType(type.id)}
                      sx={{
                        bgcolor: eventType === type.id ? `${type.color}30` : 'transparent',
                        borderColor: eventType === type.id ? type.color : 'rgba(255,255,255,0.2)',
                        color: eventType === type.id ? type.color : 'inherit',
                        border: '1px solid',
                        '& .MuiChip-icon': { color: type.color }
                      }}
                    />
                  );
                })}
              </Box>
            </Grid>

            {/* Date */}
            <Grid item xs={12} md={6}>
              <TextField
                label="Fecha"
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                fullWidth
                size="small"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            {/* Title */}
            <Grid item xs={12} md={6}>
              <TextField
                label="Título (opcional)"
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                fullWidth
                size="small"
                placeholder={EVENT_TYPES.find(t => t.id === eventType)?.name}
              />
            </Grid>

            {/* From/To Values for Photoperiod */}
            {eventType === 'photoperiod' && (
              <>
                <Grid item xs={6}>
                  <TextField
                    select
                    label="Desde"
                    value={fromValue}
                    onChange={(e) => setFromValue(e.target.value)}
                    fullWidth
                    size="small"
                    SelectProps={{ native: true }}
                  >
                    <option value="">Seleccionar...</option>
                    {PHOTOPERIOD_OPTIONS.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    select
                    label="Hasta"
                    value={toValue}
                    onChange={(e) => setToValue(e.target.value)}
                    fullWidth
                    size="small"
                    SelectProps={{ native: true }}
                  >
                    <option value="">Seleccionar...</option>
                    {PHOTOPERIOD_OPTIONS.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </TextField>
                </Grid>
              </>
            )}

            {/* From/To Values for Stage */}
            {eventType === 'stage' && (
              <>
                <Grid item xs={6}>
                  <TextField
                    select
                    label="Desde"
                    value={fromValue}
                    onChange={(e) => setFromValue(e.target.value)}
                    fullWidth
                    size="small"
                    SelectProps={{ native: true }}
                  >
                    <option value="">Seleccionar...</option>
                    {STAGE_OPTIONS.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </TextField>
                </Grid>
                <Grid item xs={6}>
                  <TextField
                    select
                    label="Hasta"
                    value={toValue}
                    onChange={(e) => setToValue(e.target.value)}
                    fullWidth
                    size="small"
                    SelectProps={{ native: true }}
                  >
                    <option value="">Seleccionar...</option>
                    {STAGE_OPTIONS.map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </TextField>
                </Grid>
              </>
            )}

            {/* Description */}
            <Grid item xs={12}>
              <TextField
                label="Descripción (opcional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                fullWidth
                size="small"
                multiline
                rows={2}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ bgcolor: 'rgba(0,0,0,0.2)', p: 2 }}>
          <Button onClick={() => setShowDialog(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            sx={{ background: 'linear-gradient(135deg, #22c55e, #16a34a)' }}
          >
            Guardar Evento
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default CultivationCalendar;

import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, CardHeader, Grid, Button, TextField, Divider, List, ListItem, ListItemText, ListItemIcon, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Select, MenuItem, InputLabel, FormControl } from '@mui/material';
import { Calendar as CalIcon, Plus, Droplet, Sun, Scissors, AlertCircle } from 'lucide-react';

interface CalendarEvent {
    id: number;
    title: string;
    type: 'water' | 'light' | 'prune' | 'issue' | 'other';
    date: string;
    description?: string;
}

const Calendar: React.FC = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [open, setOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({ title: '', type: 'water', description: '' });

  useEffect(() => {
      fetch('http://localhost:3000/api/calendar')
        .then(res => res.json())
        .then(data => setEvents(data.reverse())) // Show newest first
        .catch(console.error);
  }, []);

  const handleAdd = async () => {
      const payload = {
          ...newEvent,
          date: new Date().toISOString()
      };

      const res = await fetch('http://localhost:3000/api/calendar', {
          method: 'POST', headers: {'Content-Type': 'application/json'},
          body: JSON.stringify(payload)
      });
      const saved = await res.json();
      if (saved.success) {
          setEvents(prev => [saved.event, ...prev]);
          setOpen(false);
          setNewEvent({ title: '', type: 'water', description: '' });
      }
  };

  const getIcon = (type: string) => {
      switch(type) {
          case 'water': return <Droplet color="#2196f3" />;
          case 'light': return <Sun color="#ff9800" />;
          case 'prune': return <Scissors color="#4caf50" />;
          case 'issue': return <AlertCircle color="#f44336" />;
          default: return <CalIcon />;
      }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">Calendario y Bitácora</Typography>
        <Button variant="contained" startIcon={<Plus />} onClick={() => setOpen(true)}>Nuevo Evento</Button>
      </Box>

      <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
              <Card sx={{ mb: 3, bgcolor: 'primary.dark', color: 'white' }}>
                  <CardContent sx={{ textAlign: 'center' }}>
                      <Typography variant="h6">Día de Cultivo</Typography>
                      <Typography variant="h1" fontWeight="bold">42</Typography>
                      <Typography variant="subtitle1">Semana 6 - Vegetativo</Typography>
                  </CardContent>
              </Card>
          </Grid>

          <Grid item xs={12} md={8}>
              <Card>
                  <CardHeader title="Historial de Eventos" icon={<CalIcon />} />
                  <Divider />
                  <CardContent>
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

      {/* ADD DIALOG */}
      <Dialog open={open} onClose={() => setOpen(false)}>
          <DialogTitle>Nuevo Evento</DialogTitle>
          <DialogContent sx={{ minWidth: 300 }}>
              <TextField
                autoFocus margin="dense" label="Título" fullWidth
                value={newEvent.title} onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
              />
              <FormControl fullWidth margin="dense">
                  <InputLabel>Tipo</InputLabel>
                  <Select value={newEvent.type} label="Tipo" onChange={(e) => setNewEvent({...newEvent, type: e.target.value as any})}>
                      <MenuItem value="water">Riego</MenuItem>
                      <MenuItem value="light">Iluminación</MenuItem>
                      <MenuItem value="prune">Poda/Entreno</MenuItem>
                      <MenuItem value="issue">Problema</MenuItem>
                      <MenuItem value="other">Otro</MenuItem>
                  </Select>
              </FormControl>
              <TextField
                margin="dense" label="Descripción" fullWidth multiline rows={2}
                value={newEvent.description} onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
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

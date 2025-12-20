
import React, { useState, useEffect } from 'react';
import { Box, Typography, CardContent, CardHeader, Grid, TextField, Button, Avatar, List, ListItem, ListItemAvatar, ListItemText, Paper, Divider, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { Bot, Send, Sparkles, CheckCircle, Key, AlertTriangle } from 'lucide-react';
import { apiClient, API_BASE_URL, SensorData } from '../api/client';


interface Message {
    id: number;
    sender: 'user' | 'ai';
    text: string;
}

const AIAssistant: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
      { id: 1, sender: 'ai', text: 'Hola, soy tu Asistente de Cultivo (Gemini Powered). Analizando sensores... ¿En qué te ayudo?' }
  ]);
  const [input, setInput] = useState('');
  const [analysis, setAnalysis] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [thinking, setThinking] = useState(false);

  // Settings/Key State
  const [openSettings, setOpenSettings] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [appSettings, setAppSettings] = useState<any>(null);

  // Auto-Analyze and Load Settings on mount
  useEffect(() => {
      const init = async () => {
          setLoading(true);
          try {
              const settings = await (await fetch(`${API_BASE_URL}/api/settings`)).json();
              setAppSettings(settings);
              if (settings.ai?.apiKey) setApiKey(settings.ai.apiKey);

              // Basic Local Analysis (kept for speed)
              const insights = [];
              if (settings.lighting?.mode === 'manual') insights.push({ type: 'warning', text: 'Luces en modo Manual.' });
              else insights.push({ type: 'success', text: 'Automatización de luces activa.' });

              setAnalysis(insights);
          } catch (e) { console.error(e); } finally { setLoading(false); }
      };
      init();
  }, []);

  const saveKey = async () => {
      try {
          // Update AI settings
          const newAiSettings = { ...appSettings.ai, apiKey };
          await fetch(`${API_BASE_URL}/api/settings`, {
              method: 'POST', headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ ai: newAiSettings }) // Fix: Correct structure
          });
          setOpenSettings(false);
          setMessages(prev => [...prev, { id: Date.now(), sender: 'ai', text: 'API Key guardada. Ahora estoy conectado a Gemini.' }]);
      } catch (e) { console.error(e); }
  };

  const handleSend = async () => {
      if (!input.trim()) return;

      const userMsg: Message = { id: Date.now(), sender: 'user', text: input };
      setMessages(prev => [...prev, userMsg]);
      setInput('');
      setThinking(true);

      try {
          // Gather Context
          const devices = await apiClient.getDeviceStates();
          const soilResponse = await (await fetch(`${API_BASE_URL}/api/sensors/soil`)).json();
          const soil: SensorData = soilResponse.data || soilResponse;

          const context = {
              phase: 'Vegetativo', // Start dynamic phase later
              lightStatus: devices.luzPanel1,
              irrigationMode: appSettings?.irrigation?.mode,
              vpd: soil?.vpd || 1.0,
              temp: soil?.temperature || 24,
              hum: soil?.humidity || 60,
              vwc: soil?.vwc || 45,
              soilData: soil // Include full soil data
          };

          const res = await fetch(`${API_BASE_URL}/api/chat`, {
              method: 'POST', headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ message: userMsg.text, context })
          });

          const data = await res.json();
          const replyText = data.reply || data.error || 'No se recibió respuesta del servidor.';
          setMessages(prev => [...prev, { id: Date.now()+1, sender: 'ai', text: replyText }]);

      } catch (e) {
          setMessages(prev => [...prev, { id: Date.now()+1, sender: 'ai', text: 'Error de conexión con el servidor.' }]);
      } finally {
          setThinking(false);
      }
  };

  return (
    <Box sx={{ p: 2, height: '85vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header with Glass Styling */}
      <Box className="glass-panel" sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 3,
        p: 2,
        borderRadius: '16px'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{
            p: 1.5,
            borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.3), rgba(168, 85, 247, 0.2))',
            color: '#a78bfa',
            animation: 'pulse 2s infinite'
          }}>
            <Bot size={28} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight="bold" sx={{
              background: 'linear-gradient(90deg, #a78bfa, #c084fc)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Asistente Gemini AI
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Copiloto inteligente de cultivo
            </Typography>
          </Box>
        </Box>
        <Button
          variant="outlined"
          size="small"
          startIcon={<Key size={16} />}
          onClick={() => setOpenSettings(true)}
          sx={{
            borderRadius: '12px',
            borderColor: 'rgba(139, 92, 246, 0.5)',
            color: '#a78bfa',
            '&:hover': { borderColor: '#a78bfa', bgcolor: 'rgba(139, 92, 246, 0.1)' }
          }}
        >
          API Key
        </Button>
      </Box>

      <Grid container spacing={3} sx={{ flex: 1 }}>
          {/* LEFT: Live Analysis */}
          <Grid item xs={12} md={4}>
              <Box className="glass-panel" sx={{
                  height: '100%',
                  borderRadius: 'var(--squircle-radius)',
                  bgcolor: 'var(--glass-bg)',
                  backdropFilter: 'var(--backdrop-blur)',
                  border: 'var(--glass-border)',
                  boxShadow: 'var(--glass-shadow)',
                  overflow: 'hidden'
              }}>
                  <CardHeader title="Estado del Cultivo" avatar={<Sparkles className="animate-pulse" color="#a5f3fc" />} titleTypographyProps={{ fontWeight: 'bold', color: 'white' }} />
                  <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
                  <CardContent>
                      {loading ? <CircularProgress sx={{ color: 'white' }} /> : (
                          <List>
                              {analysis.map((item, idx) => (
                                  <ListItem key={idx}>
                                      <ListItemAvatar>
                                          <Avatar sx={{ bgcolor: item.type === 'warning' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(74, 222, 128, 0.2)', color: item.type === 'warning' ? '#f59e0b' : '#4ade80' }}>
                                              {item.type === 'warning' ? <AlertTriangle size={20} /> : <CheckCircle size={20} />}
                                          </Avatar>
                                      </ListItemAvatar>
                                      <ListItemText primary={item.text} primaryTypographyProps={{ color: 'rgba(255,255,255,0.9)' }} />
                                  </ListItem>
                              ))}
                          </List>
                      )}
                  </CardContent>
              </Box>
          </Grid>

          {/* RIGHT: Chat Interface */}
          <Grid item xs={12} md={8}>
              <Box className="glass-panel" sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: 'var(--squircle-radius)',
                  bgcolor: 'var(--glass-bg)',
                  backdropFilter: 'var(--backdrop-blur)',
                  border: 'var(--glass-border)',
                  boxShadow: 'var(--glass-shadow)',
                  overflow: 'hidden'
              }}>
                  <CardContent sx={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2, p: 3 }}>
                      {messages.map((msg) => (
                          <Box key={msg.id} sx={{ alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start', maxWidth: '80%' }}>
                              <Paper sx={{
                                  p: 2,
                                  bgcolor: msg.sender === 'user' ? '#2563eb' : 'rgba(255,255,255,0.1)',
                                  color: 'white',
                                  borderRadius: msg.sender === 'user' ? '20px 20px 0 20px' : '20px 20px 20px 0',
                                  backdropFilter: 'blur(10)',
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                              }}>
                                  <Typography variant="body1" sx={{ lineHeight: 1.6 }}>{msg.text}</Typography>
                              </Paper>
                          </Box>
                      ))}
                      {thinking && <Typography variant="caption" sx={{ fontStyle: 'italic', color: 'rgba(255,255,255,0.5)', ml: 2 }}>Gemini está pensando...</Typography>}
                  </CardContent>
                  <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
                  <Box sx={{ p: 2, display: 'flex', gap: 1 }}>
                      <TextField
                        fullWidth
                        placeholder="Pregúntale a Gemini..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                        disabled={thinking}
                        variant="outlined"
                        sx={{ input: { color: 'white' }, '& .MuiOutlinedInput-root': { bgcolor: 'rgba(0,0,0,0.2)', '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' }, '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' } } }}
                      />
                      <Button variant="contained" onClick={handleSend} disabled={thinking} endIcon={<Send />} sx={{ borderRadius: 2, bgcolor: '#2563eb' }}>Enviar</Button>
                  </Box>
              </Box>
          </Grid>
      </Grid>

      {/* API Key Modal */}
      <Dialog open={openSettings} onClose={() => setOpenSettings(false)}>
          <DialogTitle>Configurar Gemini AI</DialogTitle>
          <DialogContent>
              <Typography variant="body2" sx={{ mb: 2 }}>
                  Ingresa tu API Key de Google Gemini para habilitar la inteligencia artificial avanzada.
                  <br />
                  <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer">Obtener API Key</a>
              </Typography>
              <TextField
                label="Gemini API Key"
                fullWidth
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
          </DialogContent>
          <DialogActions>
              <Button onClick={() => setOpenSettings(false)}>Cancelar</Button>
              <Button onClick={saveKey} variant="contained">Guardar</Button>
          </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AIAssistant;

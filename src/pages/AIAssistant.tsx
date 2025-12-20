
import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, CardContent, CardHeader, Grid, TextField, Button, Avatar, List, ListItem, ListItemAvatar, ListItemText, Paper, Divider, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Chip, IconButton } from '@mui/material';
import { Bot, Send, Sparkles, CheckCircle, Key, AlertTriangle, Thermometer, Droplet, Wind, Droplets, Zap, RefreshCw, Lightbulb, Clock } from 'lucide-react';
import { apiClient, API_BASE_URL, SensorData } from '../api/client';
import { useCropSteering } from '../context/CropSteeringContext';

interface Message {
    id: number;
    sender: 'user' | 'ai';
    text: string;
    suggestions?: string[];
    actions?: { label: string; action: string }[];
}

// Quick suggestion chips
const QUICK_SUGGESTIONS = [
    { label: '¿Debo regar ahora?', icon: <Droplets size={14} /> },
    { label: '¿Cómo está el VPD?', icon: <Wind size={14} /> },
    { label: 'Analiza mis sensores', icon: <Sparkles size={14} /> },
    { label: '¿Qué fase de riego?', icon: <Clock size={14} /> },
];

const AIAssistant: React.FC = () => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { currentStage, settings, daysVeg, daysFlower } = useCropSteering();

  const [messages, setMessages] = useState<Message[]>([
      {
        id: 1,
        sender: 'ai',
        text: '¡Hola! Soy tu Copiloto de Cultivo con Gemini AI. Puedo analizar tus sensores, darte recomendaciones de riego, y ayudarte a optimizar tu cultivo. ¿En qué te ayudo hoy?',
        suggestions: ['Analiza mis sensores', '¿Debo regar ahora?', '¿Cómo optimizo el VPD?']
      }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [thinking, setThinking] = useState(false);

  // Live sensor data
  const [sensorData, setSensorData] = useState<any>(null);

  // Settings/Key State
  const [openSettings, setOpenSettings] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [appSettings, setAppSettings] = useState<any>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load data on mount and poll
  useEffect(() => {
      const fetchData = async () => {
          try {
              const [settingsRes, sensorsRes] = await Promise.all([
                  fetch(`${API_BASE_URL}/api/settings`),
                  apiClient.getLatestSensors()
              ]);

              const settingsData = await settingsRes.json();
              setAppSettings(settingsData);
              if (settingsData.ai?.apiKey) setApiKey(settingsData.ai.apiKey);
              setSensorData(sensorsRes);

          } catch (e) { console.error(e); }
          finally { setLoading(false); }
      };

      fetchData();
      const interval = setInterval(fetchData, 10000);
      return () => clearInterval(interval);
  }, []);

  const saveKey = async () => {
      try {
          const newAiSettings = { ...appSettings.ai, apiKey };
          await fetch(`${API_BASE_URL}/api/settings`, {
              method: 'POST', headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ ai: newAiSettings })
          });
          setOpenSettings(false);
          setMessages(prev => [...prev, { id: Date.now(), sender: 'ai', text: '✓ API Key guardada. Gemini AI activado y listo para ayudarte.', suggestions: ['Analiza mis sensores', '¿Qué debo hacer ahora?'] }]);
      } catch (e) { console.error(e); }
  };

  const handleSend = async (customMessage?: string) => {
      const messageText = customMessage || input;
      if (!messageText.trim()) return;

      const userMsg: Message = { id: Date.now(), sender: 'user', text: messageText };
      setMessages(prev => [...prev, userMsg]);
      setInput('');
      setThinking(true);

      try {
          const isFlower = !!settings.flipDate;
          const context = {
              phase: isFlower ? 'Floración' : 'Vegetativo',
              dayCount: isFlower ? daysFlower : daysVeg,
              lightStatus: 'active',
              irrigationMode: appSettings?.irrigation?.mode,
              vpd: sensorData?.vpd || 1.0,
              temp: sensorData?.temperature || 24,
              hum: sensorData?.humidity || 60,
              vwc: sensorData?.substrateHumidity || 45,
              stage: currentStage
          };

          const res = await fetch(`${API_BASE_URL}/api/chat`, {
              method: 'POST', headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ message: messageText, context })
          });

          const data = await res.json();
          const replyText = data.reply || data.error || 'No se recibió respuesta del servidor.';

          // Parse response for action suggestions
          const aiResponse: Message = {
              id: Date.now()+1,
              sender: 'ai',
              text: replyText,
              suggestions: extractSuggestions(replyText)
          };

          setMessages(prev => [...prev, aiResponse]);

      } catch (e) {
          setMessages(prev => [...prev, { id: Date.now()+1, sender: 'ai', text: '❌ Error de conexión con el servidor. Verifica que el backend esté corriendo.' }]);
      } finally {
          setThinking(false);
      }
  };

  // Extract follow-up suggestions from AI response
  const extractSuggestions = (text: string): string[] => {
      const suggestions: string[] = [];
      if (text.toLowerCase().includes('riego') || text.toLowerCase().includes('vwc')) {
          suggestions.push('¿Cuánto debo regar?');
      }
      if (text.toLowerCase().includes('vpd') || text.toLowerCase().includes('humedad')) {
          suggestions.push('¿Cómo ajusto el VPD?');
      }
      if (text.toLowerCase().includes('temperatura')) {
          suggestions.push('¿Qué temperatura es óptima?');
      }
      if (suggestions.length === 0) {
          suggestions.push('Dime más detalles', '¿Qué más puedo hacer?');
      }
      return suggestions.slice(0, 3);
  };

  // Sensor status indicator
  const getSensorStatus = (value: number, type: 'vpd' | 'vwc' | 'temp' | 'hum') => {
      const isFlower = !!settings.flipDate;
      const ranges = {
          vpd: isFlower ? [0.8, 1.4] : [0.4, 1.0],
          vwc: isFlower ? [35, 55] : [40, 60],
          temp: [20, 28],
          hum: isFlower ? [40, 60] : [55, 75]
      };
      const [min, max] = ranges[type];
      if (value >= min && value <= max) return 'green';
      if (value >= min - (max - min) * 0.15 && value <= max + (max - min) * 0.15) return 'yellow';
      return 'red';
  };

  return (
    <Box sx={{ p: 2, height: '85vh', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
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
            animation: thinking ? 'pulse 1s infinite' : 'none'
          }}>
            <Bot size={28} />
          </Box>
          <Box>
            <Typography variant="h5" fontWeight="bold" sx={{
              background: 'linear-gradient(90deg, #a78bfa, #c084fc)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Copiloto Gemini AI
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {thinking ? 'Analizando...' : 'Listo para ayudarte'}
            </Typography>
          </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
            <IconButton onClick={() => window.location.reload()} sx={{ color: 'text.secondary' }}>
                <RefreshCw size={18} />
            </IconButton>
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
      </Box>

      <Grid container spacing={3} sx={{ flex: 1, minHeight: 0 }}>
          {/* LEFT: Live Sensors Panel */}
          <Grid item xs={12} md={4}>
              <Box className="glass-panel" sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: 'var(--squircle-radius)',
                  overflow: 'hidden'
              }}>
                  <CardHeader
                    title="Sensores en Vivo"
                    avatar={<Sparkles className="animate-pulse" color="#a5f3fc" />}
                    titleTypographyProps={{ fontWeight: 'bold', color: 'white' }}
                    action={
                        <Chip
                            label={settings.flipDate ? `Día ${daysFlower} Flor` : `Día ${daysVeg} Veg`}
                            size="small"
                            sx={{ bgcolor: settings.flipDate ? 'rgba(168, 85, 247, 0.2)' : 'rgba(34, 197, 94, 0.2)', color: settings.flipDate ? '#a855f7' : '#22c55e' }}
                        />
                    }
                  />
                  <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />

                  <CardContent sx={{ flex: 1 }}>
                      {loading ? <CircularProgress sx={{ color: 'white' }} /> : sensorData ? (
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                              {/* VPD */}
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.5, borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.03)' }}>
                                  <Wind size={20} color="#8b5cf6" />
                                  <Box sx={{ flex: 1 }}>
                                      <Typography variant="caption" color="text.secondary">VPD</Typography>
                                      <Typography variant="h6" fontWeight="bold">{sensorData.vpd?.toFixed(2) || '--'} kPa</Typography>
                                  </Box>
                                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: getSensorStatus(sensorData.vpd || 0, 'vpd') }} />
                              </Box>

                              {/* VWC */}
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.5, borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.03)' }}>
                                  <Droplets size={20} color="#f59e0b" />
                                  <Box sx={{ flex: 1 }}>
                                      <Typography variant="caption" color="text.secondary">VWC Sustrato</Typography>
                                      <Typography variant="h6" fontWeight="bold">{sensorData.substrateHumidity?.toFixed(0) || '--'}%</Typography>
                                  </Box>
                                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: getSensorStatus(sensorData.substrateHumidity || 0, 'vwc') }} />
                              </Box>

                              {/* Temperature */}
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.5, borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.03)' }}>
                                  <Thermometer size={20} color="#ef4444" />
                                  <Box sx={{ flex: 1 }}>
                                      <Typography variant="caption" color="text.secondary">Temperatura</Typography>
                                      <Typography variant="h6" fontWeight="bold">{sensorData.temperature?.toFixed(1) || '--'}°C</Typography>
                                  </Box>
                                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: getSensorStatus(sensorData.temperature || 0, 'temp') }} />
                              </Box>

                              {/* Humidity */}
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 1.5, borderRadius: '12px', bgcolor: 'rgba(255,255,255,0.03)' }}>
                                  <Droplet size={20} color="#3b82f6" />
                                  <Box sx={{ flex: 1 }}>
                                      <Typography variant="caption" color="text.secondary">Humedad Aire</Typography>
                                      <Typography variant="h6" fontWeight="bold">{sensorData.humidity?.toFixed(0) || '--'}%</Typography>
                                  </Box>
                                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: getSensorStatus(sensorData.humidity || 0, 'hum') }} />
                              </Box>
                          </Box>
                      ) : (
                          <Typography color="text.secondary">Sin datos de sensores</Typography>
                      )}
                  </CardContent>

                  {/* Quick Suggestions */}
                  <Box sx={{ p: 2, borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                          Preguntas rápidas:
                      </Typography>
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                          {QUICK_SUGGESTIONS.map((q, i) => (
                              <Chip
                                  key={i}
                                  label={q.label}
                                  icon={q.icon}
                                  size="small"
                                  onClick={() => handleSend(q.label)}
                                  sx={{
                                      bgcolor: 'rgba(139, 92, 246, 0.1)',
                                      color: '#a78bfa',
                                      border: '1px solid rgba(139, 92, 246, 0.3)',
                                      cursor: 'pointer',
                                      '&:hover': { bgcolor: 'rgba(139, 92, 246, 0.2)' }
                                  }}
                              />
                          ))}
                      </Box>
                  </Box>
              </Box>
          </Grid>

          {/* RIGHT: Chat Interface */}
          <Grid item xs={12} md={8}>
              <Box className="glass-panel" sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  borderRadius: 'var(--squircle-radius)',
                  overflow: 'hidden'
              }}>
                  {/* Messages */}
                  <CardContent sx={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2, p: 3 }}>
                      {messages.map((msg) => (
                          <Box key={msg.id} sx={{ alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                              <Paper sx={{
                                  p: 2,
                                  bgcolor: msg.sender === 'user' ? '#2563eb' : 'rgba(255,255,255,0.08)',
                                  color: 'white',
                                  borderRadius: msg.sender === 'user' ? '20px 20px 0 20px' : '20px 20px 20px 0',
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                              }}>
                                  <Typography variant="body1" sx={{ lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{msg.text}</Typography>
                              </Paper>

                              {/* Follow-up suggestions for AI messages */}
                              {msg.sender === 'ai' && msg.suggestions && (
                                  <Box sx={{ display: 'flex', gap: 1, mt: 1.5, flexWrap: 'wrap' }}>
                                      {msg.suggestions.map((s, i) => (
                                          <Chip
                                              key={i}
                                              label={s}
                                              size="small"
                                              onClick={() => handleSend(s)}
                                              sx={{
                                                  bgcolor: 'rgba(59, 130, 246, 0.1)',
                                                  color: '#60a5fa',
                                                  border: '1px solid rgba(59, 130, 246, 0.3)',
                                                  cursor: 'pointer',
                                                  '&:hover': { bgcolor: 'rgba(59, 130, 246, 0.2)' }
                                              }}
                                          />
                                      ))}
                                  </Box>
                              )}
                          </Box>
                      ))}

                      {thinking && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                              <CircularProgress size={16} sx={{ color: '#a78bfa' }} />
                              <Typography variant="caption" sx={{ fontStyle: 'italic', color: 'rgba(255,255,255,0.5)' }}>
                                  Gemini está analizando...
                              </Typography>
                          </Box>
                      )}
                      <div ref={messagesEndRef} />
                  </CardContent>

                  <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />

                  {/* Input */}
                  <Box sx={{ p: 2, display: 'flex', gap: 1 }}>
                      <TextField
                        fullWidth
                        placeholder="Pregúntale a Gemini sobre tu cultivo..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                        disabled={thinking}
                        variant="outlined"
                        sx={{
                            input: { color: 'white' },
                            '& .MuiOutlinedInput-root': {
                                bgcolor: 'rgba(0,0,0,0.2)',
                                borderRadius: '12px',
                                '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' },
                                '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' },
                                '&.Mui-focused fieldset': { borderColor: '#8b5cf6' }
                            }
                        }}
                      />
                      <Button
                        variant="contained"
                        onClick={() => handleSend()}
                        disabled={thinking || !input.trim()}
                        endIcon={<Send size={18} />}
                        sx={{
                            borderRadius: '12px',
                            bgcolor: '#8b5cf6',
                            '&:hover': { bgcolor: '#7c3aed' },
                            minWidth: 120
                        }}
                      >
                        Enviar
                      </Button>
                  </Box>
              </Box>
          </Grid>
      </Grid>

      {/* API Key Modal */}
      <Dialog open={openSettings} onClose={() => setOpenSettings(false)} PaperProps={{ sx: { borderRadius: '16px', bgcolor: '#1e293b' } }}>
          <DialogTitle sx={{ color: 'white' }}>Configurar Gemini AI</DialogTitle>
          <DialogContent>
              <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                  Ingresa tu API Key de Google Gemini para habilitar la inteligencia artificial.
                  <br />
                  <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" style={{ color: '#8b5cf6' }}>
                      → Obtener API Key gratis
                  </a>
              </Typography>
              <TextField
                label="Gemini API Key"
                fullWidth
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                sx={{
                    input: { color: 'white' },
                    '& .MuiOutlinedInput-root': { '& fieldset': { borderColor: 'rgba(255,255,255,0.2)' } },
                    '& .MuiInputLabel-root': { color: 'text.secondary' }
                }}
              />
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setOpenSettings(false)} sx={{ color: 'text.secondary' }}>Cancelar</Button>
              <Button onClick={saveKey} variant="contained" sx={{ bgcolor: '#8b5cf6' }}>Guardar</Button>
          </DialogActions>
      </Dialog>
    </Box>
  );
};

export default AIAssistant;

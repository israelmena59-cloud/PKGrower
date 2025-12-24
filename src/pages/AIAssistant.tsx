
import React, { useState, useEffect, useRef } from 'react';
import { Box, Typography, Card, CardContent, CardHeader, Grid, TextField, Button, Avatar, List, ListItem, ListItemAvatar, ListItemText, Paper, Divider, CircularProgress, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, Chip, Tooltip, Switch, FormControlLabel } from '@mui/material';
import { Bot, Send, Sparkles, CheckCircle, Key, AlertTriangle, Zap, Cpu, Upload, Image as ImageIcon } from 'lucide-react';
import { apiClient, API_BASE_URL } from '../api/client';

interface Message {
    id: number;
    sender: 'user' | 'ai';
    text: string;
    functionsExecuted?: Array<{ name: string; args: any; result: any }>;
    isStreaming?: boolean;
}

interface AIInsight {
    type: 'success' | 'warning' | 'critical';
    message: string;
    action: string | null;
}

const AIAssistant: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
      { id: 1, sender: 'ai', text: '🌱 Hola, soy tu Asistente de Cultivo con Gemini AI. Puedo controlar dispositivos, analizar sensores y darte recomendaciones. ¿En qué te ayudo?' }
  ]);
  const [input, setInput] = useState('');
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [useStreaming, setUseStreaming] = useState(true);
  const [useFunctionCalling, setUseFunctionCalling] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Settings/Key State
  const [openSettings, setOpenSettings] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [appSettings, setAppSettings] = useState<any>(null);

  // Image upload
  const [imageFile, setImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load settings and insights on mount
  useEffect(() => {
      const init = async () => {
          setLoading(true);
          try {
              const settings = await apiClient.getSettings();
              setAppSettings(settings);
              if (settings.ai?.apiKey) setApiKey(settings.ai.apiKey);

              // Load AI Insights
              const insightsData = await apiClient.getAIInsights();
              setInsights(insightsData.insights || []);
          } catch (e) { console.error(e); } finally { setLoading(false); }
      };
      init();
  }, []);

  const saveKey = async () => {
      try {
          const newAiSettings = { ...appSettings.ai, apiKey };
          await fetch(`${API_BASE_URL}/api/settings`, {
              method: 'POST', headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ ai: newAiSettings })
          });
          setOpenSettings(false);
          setMessages(prev => [...prev, { id: Date.now(), sender: 'ai', text: '✅ API Key guardada. Ahora tengo acceso completo a Gemini con Function Calling.' }]);
      } catch (e) { console.error(e); }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const analyzeImage = async () => {
    if (!imageFile) return;

    setThinking(true);
    setMessages(prev => [...prev, { id: Date.now(), sender: 'user', text: `📷 Analizando imagen: ${imageFile.name}` }]);

    try {
      const result = await apiClient.analyzeImage(imageFile);
      setMessages(prev => [...prev, { id: Date.now()+1, sender: 'ai', text: result.analysis }]);
      setImageFile(null);
    } catch (e: any) {
      setMessages(prev => [...prev, { id: Date.now()+1, sender: 'ai', text: '❌ Error analizando imagen: ' + e.message }]);
    } finally {
      setThinking(false);
    }
  };

  const handleSend = async () => {
      if (!input.trim()) return;

      const userMsg: Message = { id: Date.now(), sender: 'user', text: input };
      setMessages(prev => [...prev, userMsg]);
      setInput('');
      setThinking(true);

      try {
        if (useStreaming && !useFunctionCalling) {
          // Streaming mode (no function calling)
          const aiMsgId = Date.now() + 1;
          setMessages(prev => [...prev, { id: aiMsgId, sender: 'ai', text: '', isStreaming: true }]);

          let fullText = '';
          for await (const chunk of apiClient.streamChatMessage(userMsg.text)) {
            if (chunk.text) {
              fullText += chunk.text;
              setMessages(prev =>
                prev.map(m => m.id === aiMsgId ? { ...m, text: fullText } : m)
              );
            }
            if (chunk.done) {
              setMessages(prev =>
                prev.map(m => m.id === aiMsgId ? { ...m, isStreaming: false } : m)
              );
            }
          }
        } else if (useFunctionCalling) {
          // Function Calling mode (V2 API)
          const result = await apiClient.sendChatMessageV2(userMsg.text);

          const aiMsg: Message = {
            id: Date.now() + 1,
            sender: 'ai',
            text: result.reply,
            functionsExecuted: result.functionsExecuted
          };
          setMessages(prev => [...prev, aiMsg]);

          // Refresh insights after function execution
          if (result.functionsExecuted && result.functionsExecuted.length > 0) {
            const insightsData = await apiClient.getAIInsights();
            setInsights(insightsData.insights || []);
          }
        } else {
          // Legacy mode
          const result = await apiClient.sendChatMessage(userMsg.text);
          setMessages(prev => [...prev, { id: Date.now()+1, sender: 'ai', text: result.reply }]);
        }
      } catch (e: any) {
          setMessages(prev => [...prev, { id: Date.now()+1, sender: 'ai', text: '❌ Error de conexión: ' + e.message }]);
      } finally {
          setThinking(false);
      }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'critical': return '#ef4444';
      case 'warning': return '#f59e0b';
      case 'success': return '#22c55e';
      default: return '#6b7280';
    }
  };

  return (
    <Box sx={{ p: 2, height: '85vh', display: 'flex', flexDirection: 'column' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3, flexWrap: 'wrap', gap: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="h4" fontWeight="bold">Asistente Gemini AI</Typography>
          <Chip
            icon={<Cpu size={14} />}
            label="Function Calling"
            size="small"
            color={useFunctionCalling ? "primary" : "default"}
            onClick={() => setUseFunctionCalling(!useFunctionCalling)}
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <FormControlLabel
            control={<Switch checked={useStreaming && !useFunctionCalling} onChange={(e) => { setUseStreaming(e.target.checked); if(e.target.checked) setUseFunctionCalling(false); }} size="small" />}
            label="Streaming"
          />
          <Button variant="outlined" startIcon={<Key size={16} />} onClick={() => setOpenSettings(true)} size="small">API Key</Button>
        </Box>
      </Box>

      <Grid container spacing={3} sx={{ flex: 1, overflow: 'hidden' }}>
          {/* LEFT: Live Insights */}
          <Grid item xs={12} md={4}>
              <Box className="glass-panel" sx={{
                  height: '100%',
                  borderRadius: 'var(--squircle-radius)',
                  bgcolor: 'var(--glass-bg)',
                  backdropFilter: 'var(--backdrop-blur)',
                  border: 'var(--glass-border)',
                  boxShadow: 'var(--glass-shadow)',
                  overflow: 'auto'
              }}>
                  <CardHeader
                    title="AI Insights en Tiempo Real"
                    avatar={<Sparkles className="animate-pulse" color="#a5f3fc" />}
                    titleTypographyProps={{ fontWeight: 'bold', color: 'white', fontSize: '1rem' }}
                  />
                  <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />
                  <CardContent>
                      {loading ? <CircularProgress sx={{ color: 'white' }} size={24} /> : (
                          <List dense>
                              {insights.length === 0 && (
                                <ListItem>
                                  <ListItemText primary="Sin insights disponibles" primaryTypographyProps={{ color: 'rgba(255,255,255,0.5)' }} />
                                </ListItem>
                              )}
                              {insights.map((item, idx) => (
                                  <ListItem key={idx} sx={{ mb: 1 }}>
                                      <ListItemAvatar>
                                          <Avatar sx={{
                                            bgcolor: `${getInsightColor(item.type)}20`,
                                            color: getInsightColor(item.type),
                                            width: 32, height: 32
                                          }}>
                                              {item.type === 'warning' || item.type === 'critical' ? <AlertTriangle size={16} /> : <CheckCircle size={16} />}
                                          </Avatar>
                                      </ListItemAvatar>
                                      <Box>
                                        <ListItemText
                                          primary={item.message}
                                          primaryTypographyProps={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.85rem' }}
                                        />
                                        {item.action && (
                                          <Chip
                                            label={item.action}
                                            size="small"
                                            sx={{ mt: 0.5, fontSize: '0.7rem', bgcolor: 'rgba(255,255,255,0.1)', color: 'white' }}
                                          />
                                        )}
                                      </Box>
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
                          <Box key={msg.id} sx={{ alignSelf: msg.sender === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                              <Paper sx={{
                                  p: 2,
                                  bgcolor: msg.sender === 'user' ? '#2563eb' : 'rgba(255,255,255,0.1)',
                                  color: 'white',
                                  borderRadius: msg.sender === 'user' ? '20px 20px 0 20px' : '20px 20px 20px 0',
                                  backdropFilter: 'blur(10)',
                                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                              }}>
                                  <Typography variant="body1" sx={{ lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                                    {msg.text}
                                    {msg.isStreaming && <span className="animate-pulse">▊</span>}
                                  </Typography>
                                  {msg.functionsExecuted && msg.functionsExecuted.length > 0 && (
                                    <Box sx={{ mt: 2, pt: 1, borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                                        <Zap size={12} style={{ marginRight: 4 }} />
                                        Acciones ejecutadas:
                                      </Typography>
                                      {msg.functionsExecuted.map((func, i) => (
                                        <Chip
                                          key={i}
                                          label={`${func.name}(${Object.values(func.args).join(', ')})`}
                                          size="small"
                                          sx={{ ml: 1, mt: 0.5, bgcolor: 'rgba(34, 197, 94, 0.3)', color: '#4ade80', fontSize: '0.7rem' }}
                                        />
                                      ))}
                                    </Box>
                                  )}
                              </Paper>
                          </Box>
                      ))}
                      {thinking && <Typography variant="caption" sx={{ fontStyle: 'italic', color: 'rgba(255,255,255,0.5)', ml: 2 }}>Gemini está pensando...</Typography>}
                      <div ref={messagesEndRef} />
                  </CardContent>
                  <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />

                  {/* Image Preview */}
                  {imageFile && (
                    <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, bgcolor: 'rgba(0,0,0,0.2)' }}>
                      <ImageIcon size={20} color="#a5f3fc" />
                      <Typography variant="body2" sx={{ color: 'white', flex: 1 }}>{imageFile.name}</Typography>
                      <Button size="small" variant="contained" onClick={analyzeImage} disabled={thinking}>Analizar</Button>
                      <Button size="small" onClick={() => setImageFile(null)}>✕</Button>
                    </Box>
                  )}

                  <Box sx={{ p: 2, display: 'flex', gap: 1 }}>
                      <input
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        onChange={handleImageUpload}
                      />
                      <Tooltip title="Subir imagen para análisis">
                        <IconButton onClick={() => fileInputRef.current?.click()} sx={{ color: 'white' }}>
                          <Upload size={20} />
                        </IconButton>
                      </Tooltip>
                      <TextField
                        fullWidth
                        placeholder={useFunctionCalling ? "Ej: Enciende la luz del panel 1..." : "Pregúntale a Gemini..."}
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                        disabled={thinking}
                        variant="outlined"
                        sx={{ input: { color: 'white' }, '& .MuiOutlinedInput-root': { bgcolor: 'rgba(0,0,0,0.2)', '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' }, '&:hover fieldset': { borderColor: 'rgba(255,255,255,0.3)' } } }}
                      />
                      <Button variant="contained" onClick={handleSend} disabled={thinking} endIcon={<Send size={16} />} sx={{ borderRadius: 2, bgcolor: '#2563eb' }}>Enviar</Button>
                  </Box>
              </Box>
          </Grid>
      </Grid>

      {/* API Key Modal */}
      <Dialog open={openSettings} onClose={() => setOpenSettings(false)}>
          <DialogTitle>Configurar Gemini AI</DialogTitle>
          <DialogContent>
              <Typography variant="body2" sx={{ mb: 2 }}>
                  Ingresa tu API Key de Google Gemini para habilitar Function Calling y análisis de imágenes.
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

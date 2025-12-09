import React, { useEffect, useState } from 'react';
import { Paper, Box, Typography, Skeleton, Button, Collapse } from '@mui/material';
import { Bot, Sparkles, AlertTriangle, check } from 'lucide-react';
import { apiClient, type SensorData } from '../../api/client';

interface AICopilotWidgetProps {
  sensors: SensorData | null;
  phase: 'vegetative' | 'generative';
}

const AICopilotWidget: React.FC<AICopilotWidgetProps> = ({ sensors, phase }) => {
  const [insight, setInsight] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const isGeneratingRef = React.useRef(false);

  // Auto-analyze when sensors change (Throttled 60s to avoid 429)
  useEffect(() => {
    if (!sensors || isGeneratingRef.current) return;

    // Check last run time from localStorage to prevent spamming on refresh
    const lastRun = localStorage.getItem('last_ai_analysis');
    const now = Date.now();

    // If analyzed less than 60 seconds ago, skip auto-run (load from storage if possible?)
    if (lastRun && (now - parseInt(lastRun) < 60000)) {
       // Optional: could restore previous insight from localstorage here if we wanted
       if (!insight) setInsight("🧠 Análisis reciente (En espera)... presiona Re-scan para forzar.");
       return;
    }

    if (insight) return; // Don't re-run if we already have one

    const timer = setTimeout(() => {
        if (!insight && !isGeneratingRef.current) {
            generateInsight();
        }
    }, 2000);

    return () => clearTimeout(timer);
  }, [sensors, insight]);

  const generateInsight = async () => {
    if (!sensors || isGeneratingRef.current) return;

    // Double check throttle for manual clicks too? No, manual clicks should override.

    isGeneratingRef.current = true;
    setLoading(true);
    try {
      // Build a context-aware prompt
      const context = `
      Eres el sistema operativo PKGrower (Symbiosis). Analiza estos datos:
      Fase: ${phase}
      Temperatura: ${sensors.temperature}°C
      Humedad: ${sensors.humidity}%
      VPD: ${sensors.vpd} kPa
      Sustrato: ${sensors.substrateHumidity}%

      Dame un reporte MUY BREVE (máximo 2 frases) y directo. Usa emojis.
      Si todo está bien, sé poético sobre el crecimiento. Si algo está mal, da una alerta roja.
      `;

      const response = await apiClient.sendChatMessage(context);
      setInsight(response.reply);

      // Save timestamp
      localStorage.setItem('last_ai_analysis', Date.now().toString());

    } catch (e) {
      console.error("AI failed", e);
      setInsight("⚠️ Error de conexión con el núcleo neural.");
    } finally {
      setLoading(false);
      isGeneratingRef.current = false;
    }
  };

  return (
    <Paper
        elevation={0}
        sx={{
            p: 3,
            borderRadius: 'var(--squircle-radius)',
            background: 'var(--glass-bg)',
            backdropFilter: 'var(--backdrop-blur)',
            border: 'var(--glass-border)',
            boxShadow: 'var(--glass-shadow)',
            position: 'relative',
            overflow: 'hidden',
            transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            '&:hover': {
                transform: 'translateY(-2px) scale(1.01)',
                boxShadow: '0 20px 40px rgba(0,0,0,0.4), inset 0 0 0 1px rgba(255,255,255,0.1)'
            }
        }}
    >
        {/* Liquid Aurora Background Pulse */}
        <Box sx={{
            position: 'absolute',
            top: '-50%', left: '-50%', right: '-50%', bottom: '-50%',
            background: 'conic-gradient(from 0deg at 50% 50%, transparent 0deg, rgba(168, 85, 247, 0.1) 60deg, transparent 120deg)',
            animation: 'spin 10s linear infinite',
            zIndex: 0,
            opacity: 0.5,
            filter: 'blur(60px)'
        }} />

        <Box sx={{ position: 'relative', zIndex: 1, display: 'flex', gap: 3, alignItems: 'flex-start' }}>
            <Box sx={{
                p: 2,
                borderRadius: '24px',
                background: 'linear-gradient(135deg, #a855f7 0%, #6366f1 100%)',
                color: 'white',
                display: 'flex',
                boxShadow: '0 10px 20px rgba(168, 85, 247, 0.4)'
            }}>
                <Bot size={32} strokeWidth={1.5} />
            </Box>

            <Box sx={{ flex: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Typography variant="overline" sx={{
                        fontWeight: 800,
                        letterSpacing: 2,
                        color: 'rgba(255,255,255,0.5)',
                        fontSize: '0.7rem'
                    }}>
                        NEURAL CORE
                    </Typography>
                    <Button
                        size="small"
                        startIcon={<Sparkles size={14} />}
                        onClick={generateInsight}
                        disabled={loading}
                        sx={{
                            color: '#e9d5ff',
                            borderColor: 'rgba(255,255,255,0.2)',
                            borderRadius: '20px',
                            textTransform: 'none',
                            backdropFilter: 'blur(10px)',
                            '&:hover': {
                                background: 'rgba(255,255,255,0.1)',
                                borderColor: 'white'
                            }
                        }}
                        variant="outlined"
                    >
                        {loading ? 'Thinking...' : 'Analyze'}
                    </Button>
                </Box>

                {loading ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Skeleton variant="text" sx={{ bgcolor: 'rgba(255,255,255,0.1)', borderRadius: '8px' }} height={24} width="90%" />
                        <Skeleton variant="text" sx={{ bgcolor: 'rgba(255,255,255,0.05)', borderRadius: '8px' }} height={24} width="70%" />
                    </Box>
                ) : (
                    <Collapse in={expanded}>
                        <Typography variant="body1" sx={{
                            color: 'white',
                            fontWeight: 500,
                            lineHeight: 1.6,
                            fontSize: '1.05rem',
                            textShadow: '0 2px 4px rgba(0,0,0,0.3)'
                        }}>
                            {insight || "Sistemas en espera. Inicia análisis."}
                        </Typography>
                    </Collapse>
                )}
            </Box>
        </Box>
    </Paper>
  );
};

export default AICopilotWidget;

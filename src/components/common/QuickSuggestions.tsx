/**
 * QuickSuggestions - Floating AI-powered action suggestions
 * Premium Floating Glass Bubble Design
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Chip,
  Fade,
  IconButton,
  Typography,
  Collapse,
  Badge,
  Tooltip
} from '@mui/material';
import {
  Sparkles,
  Zap,
  Droplets,
  Wind,
  Thermometer,
  X,
  ChevronDown,
  ChevronUp,
  MessageSquare
} from 'lucide-react';
import { apiClient } from '../../api/client';

interface Suggestion {
  id: string;
  priority: 'high' | 'medium' | 'low';
  icon: React.ReactNode;
  title: string;
  description: string;
  action: {
    label: string;
    command: string;
  };
}

interface QuickSuggestionsProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
  position?: 'bottom-right' | 'bottom-left' | 'top-right';
}

const QuickSuggestions: React.FC<QuickSuggestionsProps> = ({
  autoRefresh = true,
  refreshInterval = 60000,
  position = 'bottom-right',
}) => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(false); // Start collapsed for cleaner UI
  const [executing, setExecuting] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [hasNew, setHasNew] = useState(false);

  // Generate suggestions based on sensor data
  const generateSuggestions = async () => {
    setLoading(true);
    try {
      const sensors = await apiClient.getLatestSensors();
      const newSuggestions: Suggestion[] = [];

      if (sensors) {
        // VPD-based suggestions
        if (sensors.vpd !== null && sensors.vpd !== undefined) {
          if (sensors.vpd < 0.4) {
            newSuggestions.push({
              id: 'vpd-low',
              priority: 'high',
              icon: <Wind size={18} className="text-red-400" />,
              title: 'VPD Crítico',
              description: `Aumentar T° o bajar Humedad.`,
              action: { label: 'Activar Extractor', command: 'toggle_device(extractorControlador, on)' },
            });
          } else if (sensors.vpd > 1.6) {
            newSuggestions.push({
              id: 'vpd-high',
              priority: 'medium',
              icon: <Droplets size={18} className="text-amber-400" />,
              title: 'VPD Alto',
              description: `Humedad muy baja.`,
              action: { label: 'Humidificar', command: 'toggle_device(humidifier, on)' },
            });
          }
        }

        // Temperature-based suggestions
        if (sensors.temperature !== null && sensors.temperature > 30) {
          newSuggestions.push({
            id: 'temp-high',
            priority: 'high',
            icon: <Thermometer size={18} className="text-red-400" />,
            title: 'Calor Excesivo',
            description: `Enfriar cultivo ya.`,
            action: { label: 'Enfriar', command: 'toggle_device(extractorControlador, on)' },
          });
        }

        // Substrate humidity
        if (sensors.substrateHumidity !== null && sensors.substrateHumidity < 30) {
          newSuggestions.push({
            id: 'substrate-dry',
            priority: 'medium',
            icon: <Droplets size={18} className="text-amber-400" />,
            title: 'Sustrato Seco',
            description: `Riego requerido.`,
            action: { label: 'Regar', command: 'set_irrigation(30)' },
          });
        }
      }

      // Filter dismissed suggestions
      const filtered = newSuggestions.filter(s => !dismissed.includes(s.id));
      if (filtered.length > suggestions.length) {
          setHasNew(true);
          setExpanded(true); // Auto-expand if new important stuff comes in
      }
      setSuggestions(filtered);
    } catch (error) {
      console.error('Error generating suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    generateSuggestions();
    if (autoRefresh) {
      const interval = setInterval(generateSuggestions, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, dismissed]);

  const executeAction = async (suggestion: Suggestion) => {
    setExecuting(suggestion.id);
    try {
      await apiClient.sendChatMessageV2(suggestion.action.command);
      setDismissed(prev => [...prev, suggestion.id]);
      setTimeout(generateSuggestions, 2000);
    } catch (error) {
      console.error('Error executing action:', error);
    } finally {
      setExecuting(null);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#ef4444';
      case 'medium': return '#f59e0b';
      default: return '#3b82f6';
    }
  };

  const positionStyles = {
    'bottom-right': { bottom: 24, right: 24 },
    'bottom-left': { bottom: 24, left: 24 },
    'top-right': { top: 90, right: 24 },
  };

  if (suggestions.length === 0) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        ...positionStyles[position],
        zIndex: 1200,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: 1
      }}
    >
      {/* Expanded List */}
      <Fade in={expanded} unmountOnExit>
        <Box
          sx={{
            width: 300,
            mb: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 1.5,
            perspective: '1000px'
          }}
        >
          {suggestions.map((suggestion, index) => (
            <Box
              key={suggestion.id}
              sx={{
                p: 2,
                borderRadius: '20px',
                bgcolor: 'rgba(10, 15, 30, 0.85)',
                backdropFilter: 'blur(20px)',
                border: `1px solid ${getPriorityColor(suggestion.priority)}40`,
                boxShadow: `0 8px 32px rgba(0, 0, 0, 0.3)`,
                transformOrigin: 'bottom right',
                animation: `fadeIn 0.3s ease-out ${index * 0.1}s`,
                position: 'relative',
                overflow: 'hidden'
              }}
            >
               {/* Glow effect */}
               <Box sx={{
                   position: 'absolute', top: '-50%', right: '-50%', width: '200%', height: '200%',
                   background: `radial-gradient(circle, ${getPriorityColor(suggestion.priority)}15 0%, transparent 60%)`,
                   pointerEvents: 'none'
               }} />

               <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                   <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                       <Box sx={{ p: 0.8, borderRadius: '10px', bgcolor: 'rgba(255,255,255,0.05)', display: 'flex' }}>
                           {suggestion.icon}
                       </Box>
                       <Box>
                           <Typography variant="subtitle2" fontWeight={700} color="white" sx={{ fontSize: '0.9rem' }}>
                               {suggestion.title}
                           </Typography>
                       </Box>
                   </Box>
                   <IconButton size="small" onClick={() => setDismissed(prev => [...prev, suggestion.id])}>
                       <X size={14} className="text-gray-500 hover:text-white transition-colors" />
                   </IconButton>
               </Box>

               <Typography variant="body2" color="rgba(255,255,255,0.7)" sx={{ mb: 2, fontSize: '0.8rem', pl: 0.5 }}>
                   {suggestion.description}
               </Typography>

               <Button
                    fullWidth
                    variant="contained"
                    size="small"
                    startIcon={executing === suggestion.id ? <Box width={16} /> : <Zap size={14} />}
                    onClick={() => executeAction(suggestion)}
                    disabled={executing === suggestion.id}
                    sx={{
                        bgcolor: getPriorityColor(suggestion.priority),
                        borderRadius: '10px',
                        textTransform: 'none',
                        fontWeight: 600,
                        boxShadow: `0 4px 12px ${getPriorityColor(suggestion.priority)}40`,
                        '&:hover': {
                            bgcolor: getPriorityColor(suggestion.priority),
                            filter: 'brightness(1.1)',
                            transform: 'translateY(-1px)'
                        }
                    }}
                >
                    {executing === suggestion.id ? 'Ejecutando...' : suggestion.action.label}
                </Button>
            </Box>
          ))}
        </Box>
      </Fade>

      {/* Floating Trigger Button */}
      <Tooltip title={expanded ? "Ocultar" : "Ver Sugerencias"} placement="left">
        <Box
            onClick={() => setExpanded(!expanded)}
            sx={{
                width: 56, height: 56, borderRadius: '24px',
                bgcolor: expanded ? 'rgba(255,255,255,0.1)' : 'rgba(6,182,212,0.9)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255,255,255,0.2)',
                boxShadow: expanded ? 'none' : '0 10px 30px rgba(6,182,212,0.4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                transform: expanded ? 'rotate(45deg)' : 'rotate(0deg)',
                '&:hover': { transform: expanded ? 'rotate(45deg) scale(1.05)' : 'scale(1.1)' }
            }}
        >
            {expanded ? (
                <X size={24} color="white" />
            ) : (
                <Badge
                    badgeContent={suggestions.length}
                    color="error"
                    sx={{ '& .MuiBadge-badge': { fontSize: '0.7rem', fontWeight: 'bold' } }}
                >
                    <Sparkles size={24} color="white" className="animate-pulse" />
                </Badge>
            )}
        </Box>
      </Tooltip>
    </Box>
  );
};

export default QuickSuggestions;

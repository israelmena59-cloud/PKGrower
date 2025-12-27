/**
 * QuickSuggestions - Floating AI-powered action suggestions
 * Shows contextual quick actions based on current sensor state
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
  const [expanded, setExpanded] = useState(true);
  const [executing, setExecuting] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<string[]>([]);

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
              icon: <Wind size={16} color="#ef4444" />,
              title: 'VPD Crítico',
              description: `VPD de ${sensors.vpd.toFixed(2)} kPa. Riesgo de hongos.`,
              action: { label: 'Activar Extractor', command: 'toggle_device(extractorControlador, on)' },
            });
          } else if (sensors.vpd > 1.6) {
            newSuggestions.push({
              id: 'vpd-high',
              priority: 'medium',
              icon: <Droplets size={16} color="#f59e0b" />,
              title: 'VPD Alto',
              description: `VPD de ${sensors.vpd.toFixed(2)} kPa. Aumentar humedad.`,
              action: { label: 'Humidificar', command: 'toggle_device(humidifier, on)' },
            });
          }
        }

        // Temperature-based suggestions
        if (sensors.temperature !== null && sensors.temperature > 30) {
          newSuggestions.push({
            id: 'temp-high',
            priority: 'high',
            icon: <Thermometer size={16} color="#ef4444" />,
            title: 'Temperatura Alta',
            description: `${sensors.temperature.toFixed(1)}°C es muy alto.`,
            action: { label: 'Enfriar', command: 'toggle_device(extractorControlador, on)' },
          });
        }

        // Substrate humidity
        if (sensors.substrateHumidity !== null && sensors.substrateHumidity < 30) {
          newSuggestions.push({
            id: 'substrate-dry',
            priority: 'medium',
            icon: <Droplets size={16} color="#f59e0b" />,
            title: 'Sustrato Seco',
            description: `Solo ${sensors.substrateHumidity}% de humedad.`,
            action: { label: 'Regar', command: 'set_irrigation(30)' },
          });
        }
      }

      // Filter dismissed suggestions
      setSuggestions(newSuggestions.filter(s => !dismissed.includes(s.id)));
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
      // Remove executed suggestion
      setDismissed(prev => [...prev, suggestion.id]);
      setTimeout(generateSuggestions, 2000);
    } catch (error) {
      console.error('Error executing action:', error);
    } finally {
      setExecuting(null);
    }
  };

  const dismissSuggestion = (id: string) => {
    setDismissed(prev => [...prev, id]);
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
    'top-right': { top: 80, right: 24 },
  };

  if (suggestions.length === 0) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        ...positionStyles[position],
        zIndex: 1000,
        maxWidth: 320,
      }}
    >
      <Fade in={suggestions.length > 0}>
        <Box
          sx={{
            bgcolor: 'rgba(15, 23, 42, 0.95)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: 3,
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.4)',
            overflow: 'hidden',
          }}
        >
          {/* Header */}
          <Box
            sx={{
              p: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              borderBottom: expanded ? '1px solid rgba(255,255,255,0.1)' : 'none',
              cursor: 'pointer',
            }}
            onClick={() => setExpanded(!expanded)}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Sparkles size={18} className="text-cyan-400 animate-pulse" />
              <Typography variant="subtitle2" fontWeight="bold" sx={{ color: 'white' }}>
                Sugerencias IA
              </Typography>
              <Chip
                label={suggestions.length}
                size="small"
                sx={{
                  height: 18,
                  fontSize: '0.65rem',
                  bgcolor: 'rgba(239, 68, 68, 0.2)',
                  color: '#ef4444',
                }}
              />
            </Box>
            <IconButton size="small" sx={{ color: 'white' }}>
              {expanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
            </IconButton>
          </Box>

          {/* Suggestions List */}
          <Collapse in={expanded}>
            <Box sx={{ p: 1.5, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {suggestions.map((suggestion) => (
                <Box
                  key={suggestion.id}
                  sx={{
                    p: 1.5,
                    borderRadius: 2,
                    bgcolor: 'rgba(255, 255, 255, 0.05)',
                    border: `1px solid ${getPriorityColor(suggestion.priority)}30`,
                    position: 'relative',
                  }}
                >
                  {/* Dismiss button */}
                  <IconButton
                    size="small"
                    onClick={() => dismissSuggestion(suggestion.id)}
                    sx={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      width: 20,
                      height: 20,
                      color: 'rgba(255,255,255,0.4)',
                      '&:hover': { color: 'white' },
                    }}
                  >
                    <X size={12} />
                  </IconButton>

                  <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                    <Box
                      sx={{
                        p: 0.75,
                        borderRadius: 1,
                        bgcolor: `${getPriorityColor(suggestion.priority)}20`,
                      }}
                    >
                      {suggestion.icon}
                    </Box>
                    <Box sx={{ flex: 1, pr: 2 }}>
                      <Typography
                        variant="caption"
                        fontWeight="bold"
                        sx={{ color: getPriorityColor(suggestion.priority), display: 'block' }}
                      >
                        {suggestion.title}
                      </Typography>
                      <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                        {suggestion.description}
                      </Typography>
                    </Box>
                  </Box>

                  <Button
                    size="small"
                    variant="contained"
                    startIcon={<Zap size={12} />}
                    onClick={() => executeAction(suggestion)}
                    disabled={executing === suggestion.id}
                    fullWidth
                    sx={{
                      mt: 1.5,
                      py: 0.5,
                      fontSize: '0.7rem',
                      bgcolor: getPriorityColor(suggestion.priority),
                      '&:hover': {
                        bgcolor: getPriorityColor(suggestion.priority),
                        filter: 'brightness(1.1)',
                      },
                    }}
                  >
                    {executing === suggestion.id ? 'Ejecutando...' : suggestion.action.label}
                  </Button>
                </Box>
              ))}
            </Box>
          </Collapse>
        </Box>
      </Fade>
    </Box>
  );
};

export default QuickSuggestions;

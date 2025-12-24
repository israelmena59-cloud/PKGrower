import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  Sparkles,
  RefreshCw,
  Lightbulb,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Zap,
} from 'lucide-react';
import { apiClient } from '../../api/client';

interface Insight {
  type: 'success' | 'warning' | 'critical';
  message: string;
  action: string | null;
}

interface AIInsightsWidgetProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
  compact?: boolean;
}

const AIInsightsWidget: React.FC<AIInsightsWidgetProps> = ({
  autoRefresh = true,
  refreshInterval = 120000, // 2 minutes
  compact = false
}) => {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const data = await apiClient.getAIInsights();
      setInsights(data.insights || []);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error fetching insights:', error);
      setInsights([{ type: 'warning', message: 'Error cargando insights', action: null }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();

    if (autoRefresh) {
      const interval = setInterval(fetchInsights, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'critical': return '#ef4444';
      case 'warning': return '#f59e0b';
      case 'success': return '#22c55e';
      default: return '#6b7280';
    }
  };

  const getTypeIcon = (type: string) => {
    const size = compact ? 14 : 16;
    switch (type) {
      case 'critical': return <AlertTriangle size={size} />;
      case 'warning': return <Lightbulb size={size} />;
      case 'success': return <CheckCircle size={size} />;
      default: return <Sparkles size={size} />;
    }
  };

  if (compact) {
    return (
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {loading ? (
          <CircularProgress size={16} sx={{ color: 'white' }} />
        ) : (
          insights.slice(0, 3).map((insight, i) => (
            <Tooltip key={i} title={insight.message}>
              <Chip
                icon={getTypeIcon(insight.type)}
                label={insight.message.substring(0, 30) + (insight.message.length > 30 ? '...' : '')}
                size="small"
                sx={{
                  bgcolor: `${getTypeColor(insight.type)}20`,
                  color: getTypeColor(insight.type),
                  fontSize: '0.7rem',
                  '& .MuiChip-icon': { color: getTypeColor(insight.type) }
                }}
              />
            </Tooltip>
          ))
        )}
      </Box>
    );
  }

  return (
    <Card sx={{
      bgcolor: 'rgba(0,0,0,0.3)',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: 3
    }}>
      <CardContent>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Sparkles size={20} className="animate-pulse" color="#a5f3fc" />
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', color: 'white' }}>
              AI Insights
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {lastUpdate && (
              <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.5)' }}>
                {lastUpdate.toLocaleTimeString()}
              </Typography>
            )}
            <IconButton size="small" onClick={fetchInsights} disabled={loading} sx={{ color: 'white' }}>
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </IconButton>
          </Box>
        </Box>

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', mb: 2 }} />

        {/* Insights List */}
        {loading && insights.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <CircularProgress size={24} sx={{ color: 'white' }} />
          </Box>
        ) : (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
            {insights.map((insight, i) => (
              <Box
                key={i}
                sx={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 1.5,
                  p: 1.5,
                  borderRadius: 2,
                  bgcolor: `${getTypeColor(insight.type)}10`,
                  borderLeft: `3px solid ${getTypeColor(insight.type)}`
                }}
              >
                <Box sx={{ color: getTypeColor(insight.type), pt: 0.3 }}>
                  {getTypeIcon(insight.type)}
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.9)', lineHeight: 1.4 }}>
                    {insight.message}
                  </Typography>
                  {insight.action && (
                    <Chip
                      icon={<Zap size={10} />}
                      label={insight.action}
                      size="small"
                      sx={{
                        mt: 1,
                        height: 20,
                        fontSize: '0.65rem',
                        bgcolor: 'rgba(255,255,255,0.1)',
                        color: 'rgba(255,255,255,0.8)',
                        cursor: 'pointer',
                        '& .MuiChip-icon': { color: 'rgba(255,255,255,0.8)' },
                        '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' }
                      }}
                    />
                  )}
                </Box>
              </Box>
            ))}
          </Box>
        )}

        {insights.length === 0 && !loading && (
          <Box sx={{ textAlign: 'center', color: 'rgba(255,255,255,0.5)', py: 2 }}>
            <TrendingUp size={24} />
            <Typography variant="body2" sx={{ mt: 1 }}>Sin insights disponibles</Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default AIInsightsWidget;

import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  RefreshCw,
  Lightbulb,
  AlertTriangle,
  CheckCircle,
  Zap,
  TrendingUp,
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
      case 'critical': return 'text-red-500 border-red-500/30 bg-red-500/10';
      case 'warning': return 'text-amber-500 border-amber-500/30 bg-amber-500/10';
      case 'success': return 'text-green-500 border-green-500/30 bg-green-500/10';
      default: return 'text-gray-400 border-gray-500/30 bg-gray-500/10';
    }
  };

  const getTypeIcon = (type: string, size = 16) => {
    switch (type) {
      case 'critical': return <AlertTriangle size={size} className="text-red-500" />;
      case 'warning': return <Lightbulb size={size} className="text-amber-500" />;
      case 'success': return <CheckCircle size={size} className="text-green-500" />;
      default: return <Sparkles size={size} className="text-gray-400" />;
    }
  };

  if (compact) {
    return (
      <div className="flex flex-wrap gap-2">
        {loading ? (
          <RefreshCw size={16} className="animate-spin text-white/50" />
        ) : (
          insights.slice(0, 3).map((insight, i) => (
            <div
              key={i}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium border ${getTypeColor(insight.type)}`}
              title={insight.message}
            >
              {getTypeIcon(insight.type, 12)}
              <span className="truncate max-w-[150px]">{insight.message}</span>
            </div>
          ))
        )}
      </div>
    );
  }

  return (
    <div className="glass-panel p-0 h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={20} className="text-cyan-300 animate-pulse" />
          <h3 className="font-semibold text-white">AI Insights</h3>
        </div>
        <div className="flex items-center gap-2">
          {lastUpdate && (
            <span className="text-xs text-white/50">
              {lastUpdate.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
            </span>
          )}
          <button
            onClick={fetchInsights}
            disabled={loading}
            className="text-white/70 hover:text-cyan-300 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Insights List */}
      <div className="p-4 space-y-3 flex-1 overflow-y-auto custom-scrollbar">
        {loading && insights.length === 0 ? (
          <div className="flex justify-center py-4">
            <RefreshCw size={24} className="animate-spin text-cyan-500/50" />
          </div>
        ) : (
          insights.length > 0 ? (
            insights.map((insight, i) => (
              <div
                key={i}
                className={`p-3 rounded-lg border flex items-start gap-3 transition-all hover:bg-white/5 ${getTypeColor(insight.type)}`}
              >
                <div className="mt-0.5 shrink-0">
                  {getTypeIcon(insight.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-200 leading-snug">
                    {insight.message}
                  </p>
                  {insight.action && (
                    <button className="mt-2 flex items-center gap-1.5 px-2 py-1 rounded bg-white/10 hover:bg-white/20 text-xs text-white/90 transition-colors">
                      <Zap size={10} className="text-yellow-400" />
                      <span>{insight.action}</span>
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-white/30 flex flex-col items-center">
              <TrendingUp size={32} strokeWidth={1.5} />
              <p className="mt-2 text-sm">Sin insights disponibles</p>
            </div>
          )
        )}
      </div>
    </div>
  );
};

export default AIInsightsWidget;

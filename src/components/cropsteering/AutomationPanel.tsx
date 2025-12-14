/**
 * Automation Rules Panel Component
 * UI for managing automation rules
 */

import React, { useState } from 'react';
import {
  Box,
  Typography,
  Switch,
  Card,
  Chip,
  IconButton,
  Collapse,
  Tooltip,
  Button,
  Alert
} from '@mui/material';
import {
  Zap,
  Settings,
  ChevronDown,
  ChevronUp,
  Play,
  Pause,
  Clock,
  AlertTriangle,
  Droplets,
  Thermometer,
  Wind,
  Gauge
} from 'lucide-react';
import {
  AutomationRule,
  DEFAULT_AUTOMATION_RULES,
  RulePriority
} from '../../utils/automationEngine';

interface AutomationPanelProps {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  rules?: AutomationRule[];
  onRuleToggle?: (ruleId: string, enabled: boolean) => void;
  executingRules?: string[];
}

const AutomationPanel: React.FC<AutomationPanelProps> = ({
  enabled,
  onEnabledChange,
  rules = DEFAULT_AUTOMATION_RULES,
  onRuleToggle,
  executingRules = []
}) => {
  const [expandedRules, setExpandedRules] = useState<Set<string>>(new Set());

  const toggleExpanded = (ruleId: string) => {
    setExpandedRules(prev => {
      const next = new Set(prev);
      if (next.has(ruleId)) {
        next.delete(ruleId);
      } else {
        next.add(ruleId);
      }
      return next;
    });
  };

  // Priority colors
  const priorityColors: Record<RulePriority, string> = {
    critical: '#FF3B30',
    high: '#FF9500',
    medium: '#FFCC00',
    low: '#34C759'
  };

  // Get icon for trigger metric
  const getMetricIcon = (metric: string) => {
    switch (metric) {
      case 'vpd': return <Gauge size={14} />;
      case 'temperature': return <Thermometer size={14} />;
      case 'humidity': return <Droplets size={14} />;
      case 'vwc':
      case 'dryback': return <Wind size={14} />;
      case 'phase':
      case 'time': return <Clock size={14} />;
      default: return <Zap size={14} />;
    }
  };

  // Group rules by category
  const ruleCategories = {
    vpd: rules.filter(r => r.id.includes('vpd') || r.id.includes('mold')),
    temperature: rules.filter(r => r.id.includes('temp')),
    irrigation: rules.filter(r => r.id.includes('vwc') || r.id.includes('dryback') || r.id.includes('irrigation') || r.id.includes('p1') || r.id.includes('p4'))
  };

  const RuleCard: React.FC<{ rule: AutomationRule }> = ({ rule }) => {
    const isExpanded = expandedRules.has(rule.id);
    const isExecuting = executingRules.includes(rule.id);

    return (
      <Card
        sx={{
          mb: 1.5,
          bgcolor: isExecuting ? 'rgba(52, 199, 89, 0.1)' : 'rgba(255,255,255,0.03)',
          border: isExecuting
            ? '1px solid rgba(52, 199, 89, 0.5)'
            : '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px',
          overflow: 'hidden',
          transition: 'all 0.3s'
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: 1.5,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            cursor: 'pointer'
          }}
          onClick={() => toggleExpanded(rule.id)}
        >
          {/* Priority indicator */}
          <Tooltip title={`Prioridad: ${rule.priority}`}>
            <Box
              sx={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                bgcolor: priorityColors[rule.priority],
                flexShrink: 0
              }}
            />
          </Tooltip>

          {/* Rule name */}
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" fontWeight="bold">
              {rule.nameEs}
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Cooldown: {rule.cooldownMinutes} min
            </Typography>
          </Box>

          {/* Executing indicator */}
          {isExecuting && (
            <Chip
              label="Activo"
              size="small"
              sx={{
                bgcolor: 'rgba(52, 199, 89, 0.2)',
                color: '#34C759',
                animation: 'pulse 2s infinite'
              }}
            />
          )}

          {/* Enable toggle */}
          <Switch
            checked={rule.enabled}
            onChange={(e) => {
              e.stopPropagation();
              onRuleToggle?.(rule.id, e.target.checked);
            }}
            size="small"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Expand icon */}
          <IconButton size="small">
            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </IconButton>
        </Box>

        {/* Expanded content */}
        <Collapse in={isExpanded}>
          <Box sx={{ px: 2, pb: 2, pt: 0 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mb: 1.5 }}>
              {rule.description}
            </Typography>

            {/* Triggers */}
            <Typography variant="caption" fontWeight="bold" sx={{ display: 'block', mb: 0.5 }}>
              Condiciones ({rule.triggerLogic}):
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mb: 1.5 }}>
              {rule.triggers.map((trigger, i) => (
                <Chip
                  key={i}
                  icon={getMetricIcon(trigger.metric)}
                  label={`${trigger.metric} ${trigger.operator} ${trigger.value}${trigger.duration ? ` (${trigger.duration}s)` : ''}`}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.7rem' }}
                />
              ))}
            </Box>

            {/* Actions */}
            <Typography variant="caption" fontWeight="bold" sx={{ display: 'block', mb: 0.5 }}>
              Acciones:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              {rule.actions.map((action, i) => (
                <Chip
                  key={i}
                  label={
                    action.type === 'device_on' ? `Encender ${action.deviceType}` :
                    action.type === 'device_off' ? `Apagar ${action.deviceType}` :
                    action.type === 'irrigation_shot' ? 'Riego' :
                    action.type === 'notification' ? `📢 ${action.message?.substring(0, 30)}...` :
                    action.type
                  }
                  size="small"
                  sx={{
                    bgcolor: 'rgba(52, 199, 89, 0.1)',
                    color: '#34C759',
                    fontSize: '0.7rem'
                  }}
                />
              ))}
            </Box>
          </Box>
        </Collapse>
      </Card>
    );
  };

  const CategorySection: React.FC<{ title: string; icon: React.ReactNode; rules: AutomationRule[] }> = ({
    title,
    icon,
    rules: categoryRules
  }) => {
    if (categoryRules.length === 0) return null;

    return (
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
          {icon}
          <Typography variant="subtitle2" fontWeight="bold">
            {title}
          </Typography>
          <Chip
            label={`${categoryRules.filter(r => r.enabled).length}/${categoryRules.length}`}
            size="small"
            sx={{ ml: 'auto' }}
          />
        </Box>
        {categoryRules.map(rule => (
          <RuleCard key={rule.id} rule={rule} />
        ))}
      </Box>
    );
  };

  return (
    <Box
      sx={{
        p: 2,
        borderRadius: '16px',
        bgcolor: 'rgba(255,255,255,0.03)',
        backdropFilter: 'blur(10px)',
        border: '1px solid rgba(255,255,255,0.08)'
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: '12px',
              bgcolor: enabled ? 'rgba(52, 199, 89, 0.2)' : 'rgba(255,255,255,0.08)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: enabled ? '#34C759' : 'text.secondary'
            }}
          >
            <Zap size={20} />
          </Box>
          <Box>
            <Typography variant="subtitle1" fontWeight="bold">
              Motor de Automatización
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {rules.filter(r => r.enabled).length} reglas activas
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {enabled ? (
            <Chip
              icon={<Play size={14} />}
              label="Activo"
              size="small"
              sx={{ bgcolor: 'rgba(52, 199, 89, 0.2)', color: '#34C759' }}
            />
          ) : (
            <Chip
              icon={<Pause size={14} />}
              label="Pausado"
              size="small"
              sx={{ bgcolor: 'rgba(255, 149, 0, 0.2)', color: '#FF9500' }}
            />
          )}
          <Switch checked={enabled} onChange={(e) => onEnabledChange(e.target.checked)} />
        </Box>
      </Box>

      {/* Warning if disabled */}
      {!enabled && (
        <Alert severity="warning" sx={{ mb: 2, borderRadius: '12px' }}>
          La automatización está pausada. Las reglas no se ejecutarán.
        </Alert>
      )}

      {/* Rule categories */}
      <CategorySection
        title="Control VPD"
        icon={<Gauge size={16} />}
        rules={ruleCategories.vpd}
      />
      <CategorySection
        title="Control Temperatura"
        icon={<Thermometer size={16} />}
        rules={ruleCategories.temperature}
      />
      <CategorySection
        title="Riego y Sustrato"
        icon={<Droplets size={16} />}
        rules={ruleCategories.irrigation}
      />
    </Box>
  );
};

export default AutomationPanel;

import React, { useState, useRef, useLayoutEffect } from 'react';
import { Box, Typography, Tooltip, IconButton, TextField } from '@mui/material';
import { Info, Edit2, Check } from 'lucide-react';

// Ideal ranges per growth stage (for growers)
const IDEAL_RANGES: Record<string, Record<string, [number, number]>> = {
  veg: {
    temp: [24, 28],
    hum: [65, 80],
    vpd: [0.4, 0.8],
    sub: [45, 65]
  },
  flower: {
    temp: [20, 26],
    hum: [40, 60],
    vpd: [0.8, 1.4],
    sub: [30, 50]
  }
};

// Helper to check if value is in ideal range
const getValueStatus = (value: number | string, range: [number, number] | null): 'optimal' | 'warning' | 'danger' | 'unknown' => {
  if (!range || value === '--' || typeof value === 'string') return 'unknown';
  const num = typeof value === 'number' ? value : parseFloat(value);
  if (isNaN(num)) return 'unknown';

  const [min, max] = range;
  const margin = (max - min) * 0.15; // 15% margin for warning zone

  if (num >= min && num <= max) return 'optimal';
  if (num >= min - margin && num <= max + margin) return 'warning';
  return 'danger';
};

// Status colors (iOS palette)
const STATUS_COLORS = {
  optimal: '#34C759', // iOS Green
  warning: '#FF9500', // iOS Orange
  danger: '#FF3B30',  // iOS Red
  unknown: '#8E8E93'  // iOS Gray
};

interface SensorWidgetProps {
    icon: React.ReactNode;
    name: string;
    value: string | number;
    unit: string;
    description?: string;
    color?: string;
    onRename?: (newName: string) => void;
    metricKey?: 'temp' | 'hum' | 'vpd' | 'sub';
    growthStage?: 'veg' | 'flower' | 'none';
}

type WidgetSize = 'small' | 'medium' | 'large';

export const SensorWidget: React.FC<SensorWidgetProps> = ({
    icon,
    name,
    value,
    unit,
    description,
    color = '#34C759',
    onRename,
    metricKey,
    growthStage = 'none'
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(name);
    const [widgetSize, setWidgetSize] = useState<WidgetSize>('medium');
    const containerRef = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const updateSize = () => {
            const rect = container.getBoundingClientRect();
            const height = rect.height;

            if (height <= 140) {
                setWidgetSize('small');
            } else if (height <= 250) {
                setWidgetSize('medium');
            } else {
                setWidgetSize('large');
            }
        };

        updateSize();
        const observer = new ResizeObserver(updateSize);
        observer.observe(container);
        return () => observer.disconnect();
    }, []);

    const handleSave = () => {
        if (onRename && editName.trim()) onRename(editName);
        setIsEditing(false);
    };

    // Get ideal range for current stage and metric
    const getIdealRange = (): [number, number] | null => {
        if (!metricKey || !growthStage || growthStage === 'none') return null;
        return IDEAL_RANGES[growthStage]?.[metricKey] || null;
    };

    const idealRange = getIdealRange();
    const status = getValueStatus(value, idealRange);
    const statusColor = STATUS_COLORS[status];
    const stageLabel = growthStage === 'veg' ? 'Veg' : growthStage === 'flower' ? 'Flor' : '';

    // Fluid Glass styles
    const glassStyle = {
        background: 'rgba(255, 255, 255, 0.08)',
        backdropFilter: 'blur(20px) saturate(180%)',
        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.12)',
    };

    const iconBoxStyle = {
        borderRadius: '12px',
        background: `linear-gradient(135deg, ${color}30 0%, ${color}15 100%)`,
        color: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
    };

    // Format ideal range text
    const idealText = idealRange ? `${idealRange[0]}-${idealRange[1]}${unit}` : null;

    // ===== SMALL LAYOUT: Horizontal with ideal range =====
    if (widgetSize === 'small') {
        return (
            <Box
                ref={containerRef}
                sx={{
                    ...glassStyle,
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 1.5,
                    height: '100%',
                    width: '100%',
                    p: 1.5
                }}
            >
                <Box sx={{ ...iconBoxStyle, p: 0.8, '& svg': { width: 18, height: 18 } }}>
                    {icon}
                </Box>

                {/* Value with status indicator */}
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.3, flex: 1 }}>
                    <Typography fontWeight="700" sx={{
                        fontSize: '1.4rem',
                        color: statusColor,
                        lineHeight: 1,
                        textShadow: status !== 'unknown' ? `0 0 20px ${statusColor}40` : 'none'
                    }}>
                        {value}
                    </Typography>
                    <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary', fontWeight: 600 }}>
                        {unit}
                    </Typography>
                </Box>

                {/* Ideal range badge */}
                {idealText && (
                    <Box sx={{
                        background: 'rgba(52, 199, 89, 0.15)',
                        border: '1px solid rgba(52, 199, 89, 0.3)',
                        borderRadius: '8px',
                        px: 0.8,
                        py: 0.3,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.3
                    }}>
                        <Typography sx={{ fontSize: '0.55rem', color: '#34C759', fontWeight: 600 }}>
                            {idealText}
                        </Typography>
                    </Box>
                )}
            </Box>
        );
    }

    // ===== MEDIUM LAYOUT: Vertical with ideal range =====
    if (widgetSize === 'medium') {
        return (
            <Box
                ref={containerRef}
                sx={{
                    ...glassStyle,
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    width: '100%',
                    justifyContent: 'space-between',
                    p: 1.5
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ ...iconBoxStyle, p: 1, '& svg': { width: 22, height: 22 } }}>
                        {icon}
                    </Box>
                    {description && (
                        <Tooltip title={description} arrow>
                            <IconButton size="small" sx={{ opacity: 0.5 }}>
                                <Info size={14} />
                            </IconButton>
                        </Tooltip>
                    )}
                </Box>

                <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography sx={{
                            color: 'text.secondary',
                            fontWeight: 600,
                            fontSize: '0.65rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                        }}>
                            {name}
                        </Typography>
                        {/* Status dot */}
                        {status !== 'unknown' && (
                            <Box sx={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                background: statusColor,
                                boxShadow: `0 0 8px ${statusColor}`
                            }} />
                        )}
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                        <Typography fontWeight="800" sx={{
                            color: statusColor,
                            fontSize: '2rem',
                            lineHeight: 1,
                            textShadow: status !== 'unknown' ? `0 0 30px ${statusColor}30` : 'none'
                        }}>
                            {value}
                        </Typography>
                        <Typography sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.8rem' }}>
                            {unit}
                        </Typography>
                    </Box>

                    {/* Ideal range */}
                    {idealText && (
                        <Typography sx={{
                            fontSize: '0.6rem',
                            color: '#34C759',
                            mt: 0.5,
                            fontWeight: 500
                        }}>
                            Ideal ({stageLabel}): {idealText}
                        </Typography>
                    )}
                </Box>
            </Box>
        );
    }

    // ===== LARGE LAYOUT: Full with all info =====
    return (
        <Box
            ref={containerRef}
            sx={{
                ...glassStyle,
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                width: '100%',
                justifyContent: 'space-between',
                p: 2,
                '&:hover .edit-btn': { opacity: 1 }
            }}
        >
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ ...iconBoxStyle, p: 1.2, '& svg': { width: 28, height: 28 } }}>
                    {icon}
                </Box>
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                    {!isEditing && onRename && (
                        <IconButton
                            size="small"
                            className="edit-btn"
                            onClick={() => setIsEditing(true)}
                            sx={{ opacity: 0, transition: 'opacity 0.2s', color: 'text.secondary' }}
                        >
                            <Edit2 size={14} />
                        </IconButton>
                    )}
                    {description && (
                        <Tooltip title={description} arrow>
                            <IconButton size="small" sx={{ opacity: 0.6 }}>
                                <Info size={16} />
                            </IconButton>
                        </Tooltip>
                    )}
                </Box>
            </Box>

            {/* Main Value */}
            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', my: 1 }}>
                {isEditing ? (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <TextField
                            variant="standard"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            size="small"
                            autoFocus
                            sx={{ input: { fontSize: '0.8rem', fontWeight: 600 } }}
                        />
                        <IconButton size="small" onClick={handleSave} sx={{ color: '#34C759' }}>
                            <Check size={16} />
                        </IconButton>
                    </Box>
                ) : (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                        <Typography sx={{
                            color: 'text.secondary',
                            fontWeight: 700,
                            fontSize: '0.75rem',
                            textTransform: 'uppercase',
                            letterSpacing: '1px'
                        }}>
                            {name}
                        </Typography>
                        {/* Status indicator */}
                        {status !== 'unknown' && (
                            <Box sx={{
                                px: 1,
                                py: 0.2,
                                borderRadius: '6px',
                                background: `${statusColor}20`,
                                border: `1px solid ${statusColor}40`
                            }}>
                                <Typography sx={{ fontSize: '0.55rem', color: statusColor, fontWeight: 600 }}>
                                    {status === 'optimal' ? '✓ Óptimo' : status === 'warning' ? '⚠ Alerta' : '✗ Fuera'}
                                </Typography>
                            </Box>
                        )}
                    </Box>
                )}

                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                    <Typography fontWeight="800" sx={{
                        color: statusColor,
                        fontSize: '3rem',
                        letterSpacing: '-2px',
                        lineHeight: 1,
                        textShadow: status !== 'unknown' ? `0 0 40px ${statusColor}25` : 'none'
                    }}>
                        {value}
                    </Typography>
                    <Typography sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '1.1rem' }}>
                        {unit}
                    </Typography>
                </Box>
            </Box>

            {/* Ideal Range Footer */}
            {idealRange && (
                <Box sx={{
                    pt: 1.5,
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <Box>
                        <Typography sx={{ color: 'text.disabled', fontSize: '0.6rem', mb: 0.3 }}>
                            Rango Ideal ({stageLabel})
                        </Typography>
                        <Typography sx={{ color: '#34C759', fontWeight: 700, fontSize: '0.9rem' }}>
                            {idealRange[0]} - {idealRange[1]} {unit}
                        </Typography>
                    </Box>
                    {/* Visual range indicator */}
                    <Box sx={{ width: 60, height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
                        <Box sx={{
                            height: '100%',
                            width: status === 'optimal' ? '100%' : status === 'warning' ? '60%' : '30%',
                            background: `linear-gradient(90deg, ${statusColor}, ${statusColor}80)`,
                            borderRadius: 3,
                            transition: 'width 0.3s ease'
                        }} />
                    </Box>
                </Box>
            )}
        </Box>
    );
};

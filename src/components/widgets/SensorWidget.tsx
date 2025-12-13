import React, { useState, useRef, useEffect } from 'react';
import { Box, Typography, Tooltip, IconButton, TextField } from '@mui/material';
import { Info, Edit2, Check } from 'lucide-react';

// Ideal ranges per growth stage
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
  },
  flower_early: {
    temp: [22, 26],
    hum: [55, 70],
    vpd: [0.8, 1.2],
    sub: [35, 55]
  },
  flower_late: {
    temp: [18, 24],
    hum: [35, 50],
    vpd: [1.2, 1.6],
    sub: [25, 45]
  }
};

interface SensorWidgetProps {
    icon: React.ReactNode;
    name: string;
    value: string | number;
    unit: string;
    description?: string;
    color?: string;
    onRename?: (newName: string) => void;
    // New props for responsive features
    metricKey?: 'temp' | 'hum' | 'vpd' | 'sub';
    growthStage?: 'veg' | 'flower' | 'flower_early' | 'flower_late' | 'none';
}

type WidgetSize = 'small' | 'medium' | 'large';

export const SensorWidget: React.FC<SensorWidgetProps> = ({
    icon,
    name,
    value,
    unit,
    description,
    color = '#10b981',
    onRename,
    metricKey,
    growthStage = 'none'
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(name);
    const [widgetSize, setWidgetSize] = useState<WidgetSize>('medium');
    const containerRef = useRef<HTMLDivElement>(null);

    // Detect widget size via ResizeObserver
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                const height = entry.contentRect.height;
                const width = entry.contentRect.width;

                if (height < 80 || width < 150) {
                    setWidgetSize('small');
                } else if (height < 150 || width < 220) {
                    setWidgetSize('medium');
                } else {
                    setWidgetSize('large');
                }
            }
        });

        observer.observe(container);
        return () => observer.disconnect();
    }, []);

    const handleSave = () => {
        if (onRename && editName.trim()) {
            onRename(editName);
        }
        setIsEditing(false);
    };

    // Get ideal range for current stage and metric
    const getIdealRange = (): [number, number] | null => {
        if (!metricKey || !growthStage || growthStage === 'none') return null;
        return IDEAL_RANGES[growthStage]?.[metricKey] || null;
    };

    const idealRange = getIdealRange();
    const stageLabel = growthStage === 'veg' ? 'Vegetación' :
                       growthStage === 'flower' ? 'Floración' :
                       growthStage === 'flower_early' ? 'Flor Temprana' :
                       growthStage === 'flower_late' ? 'Flor Tardía' : '';

    // ===== SMALL LAYOUT: Horizontal, compact =====
    if (widgetSize === 'small') {
        return (
            <Box
                ref={containerRef}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    height: '100%',
                    width: '100%',
                    p: 0.5,
                    overflow: 'hidden'
                }}
            >
                <Box sx={{
                    p: 0.5,
                    borderRadius: '8px',
                    background: `linear-gradient(135deg, ${color}20 0%, ${color}10 100%)`,
                    color: color,
                    display: 'flex',
                    flexShrink: 0,
                    '& svg': { width: 16, height: 16 }
                }}>
                    {icon}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.3, overflow: 'hidden' }}>
                    <Typography fontWeight="800" sx={{
                        fontSize: 'clamp(0.9rem, 4vw, 1.4rem)',
                        color: 'text.primary',
                        lineHeight: 1
                    }}>
                        {value}
                    </Typography>
                    <Typography sx={{
                        fontSize: '0.6rem',
                        color: 'text.secondary',
                        fontWeight: 600
                    }}>
                        {unit}
                    </Typography>
                </Box>
            </Box>
        );
    }

    // ===== MEDIUM LAYOUT: Vertical, standard =====
    if (widgetSize === 'medium') {
        return (
            <Box
                ref={containerRef}
                sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%',
                    width: '100%',
                    justifyContent: 'space-between',
                    p: 1,
                    overflow: 'hidden'
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{
                        p: 0.8,
                        borderRadius: '12px',
                        background: `linear-gradient(135deg, ${color}20 0%, ${color}10 100%)`,
                        color: color,
                        display: 'flex',
                        '& svg': { width: 20, height: 20 }
                    }}>
                        {icon}
                    </Box>
                    {description && (
                        <Tooltip title={description} arrow placement="top">
                            <IconButton size="small" sx={{ opacity: 0.5, p: 0.3 }}>
                                <Info size={12} />
                            </IconButton>
                        </Tooltip>
                    )}
                </Box>

                <Box>
                    <Typography variant="caption" sx={{
                        color: 'text.secondary',
                        fontWeight: 700,
                        fontSize: '0.6rem',
                        textTransform: 'uppercase',
                        opacity: 0.7
                    }}>
                        {name}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                        <Typography fontWeight="800" sx={{
                            background: 'linear-gradient(to right, #fff, #cbd5e1)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            fontSize: 'clamp(1.2rem, 5vw, 2rem)',
                            lineHeight: 1.1
                        }}>
                            {value}
                        </Typography>
                        <Typography sx={{
                            color: 'text.secondary',
                            fontWeight: 600,
                            fontSize: '0.7rem'
                        }}>
                            {unit}
                        </Typography>
                    </Box>
                </Box>
            </Box>
        );
    }

    // ===== LARGE LAYOUT: Vertical + Ideal Range =====
    return (
        <Box
            ref={containerRef}
            sx={{
                display: 'flex',
                flexDirection: 'column',
                height: '100%',
                width: '100%',
                justifyContent: 'space-between',
                p: 1.5,
                overflow: 'hidden',
                '&:hover .edit-btn': { opacity: 1 }
            }}
        >
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{
                    p: 1,
                    borderRadius: '14px',
                    background: `linear-gradient(135deg, ${color}20 0%, ${color}10 100%)`,
                    color: color,
                    display: 'flex',
                    boxShadow: `0 4px 12px ${color}15`,
                    '& svg': { width: 24, height: 24 }
                }}>
                    {icon}
                </Box>

                <Box sx={{ display: 'flex', gap: 0.5 }}>
                    {!isEditing && (
                        <IconButton
                            size="small"
                            className="edit-btn"
                            onClick={() => setIsEditing(true)}
                            sx={{ opacity: 0, transition: 'opacity 0.2s', color: 'rgba(255,255,255,0.5)' }}
                        >
                            <Edit2 size={14} />
                        </IconButton>
                    )}
                    {description && (
                        <Tooltip title={description} arrow placement="top">
                            <IconButton size="small" sx={{ opacity: 0.6, color: 'text.secondary' }}>
                                <Info size={16} />
                            </IconButton>
                        </Tooltip>
                    )}
                </Box>
            </Box>

            {/* Main Content */}
            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                {isEditing ? (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <TextField
                            variant="standard"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            size="small"
                            autoFocus
                            sx={{
                                input: { color: 'text.secondary', fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase' }
                            }}
                        />
                        <IconButton size="small" onClick={handleSave} sx={{ color: 'green' }}>
                            <Check size={16} />
                        </IconButton>
                    </Box>
                ) : (
                    <Typography variant="caption" sx={{
                        color: 'text.secondary',
                        fontWeight: 700,
                        letterSpacing: '1px',
                        textTransform: 'uppercase',
                        opacity: 0.8,
                        mb: 0.5
                    }}>
                        {name}
                    </Typography>
                )}

                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                    <Typography fontWeight="800" sx={{
                        background: 'linear-gradient(to right, #fff, #cbd5e1)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        fontSize: 'clamp(1.8rem, 6vw, 3rem)',
                        letterSpacing: '-1px',
                        lineHeight: 1
                    }}>
                        {value}
                    </Typography>
                    <Typography sx={{
                        color: 'text.secondary',
                        fontWeight: 600,
                        fontSize: '0.875rem'
                    }}>
                        {unit}
                    </Typography>
                </Box>
            </Box>

            {/* Ideal Range Footer (only if stage is set and we have a range) */}
            {idealRange && (
                <Box sx={{
                    mt: 1,
                    pt: 1,
                    borderTop: '1px solid rgba(255,255,255,0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                }}>
                    <Typography variant="caption" sx={{ color: 'text.disabled', fontSize: '0.65rem' }}>
                        Ideal ({stageLabel})
                    </Typography>
                    <Typography variant="caption" sx={{
                        color: color,
                        fontWeight: 700,
                        fontSize: '0.7rem'
                    }}>
                        {idealRange[0]} - {idealRange[1]} {unit}
                    </Typography>
                </Box>
            )}
        </Box>
    );
};

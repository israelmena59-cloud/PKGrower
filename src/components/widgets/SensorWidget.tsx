import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
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
    color = '#10b981',
    onRename,
    metricKey,
    growthStage = 'none'
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(name);
    const [widgetSize, setWidgetSize] = useState<WidgetSize>('medium');
    const containerRef = useRef<HTMLDivElement>(null);

    // Detect widget size using ResizeObserver
    useLayoutEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const updateSize = () => {
            const rect = container.getBoundingClientRect();
            const height = rect.height;
            const width = rect.width;

            // Adjust thresholds - widgets typically start at ~130-150px height
            // Small: 1 grid row (~130px), Medium: 2 rows (~260px), Large: 3+ rows
            if (height <= 140) {
                setWidgetSize('small');
            } else if (height <= 250) {
                setWidgetSize('medium');
            } else {
                setWidgetSize('large');
            }
        };

        // Initial check
        updateSize();

        const observer = new ResizeObserver(updateSize);
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
    const stageLabel = growthStage === 'veg' ? 'Vegetación' : growthStage === 'flower' ? 'Floración' : '';

    // Common styles
    const iconBoxStyle = {
        borderRadius: '12px',
        background: `linear-gradient(135deg, ${color}30 0%, ${color}15 100%)`,
        color: color,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
    };

    // ===== SMALL LAYOUT: Horizontal compact =====
    if (widgetSize === 'small') {
        return (
            <Box
                ref={containerRef}
                sx={{
                    display: 'flex',
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 1.5,
                    height: '100%',
                    width: '100%',
                    p: 1
                }}
            >
                <Box sx={{ ...iconBoxStyle, p: 0.8, '& svg': { width: 18, height: 18 } }}>
                    {icon}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                    <Typography fontWeight="800" sx={{ fontSize: '1.3rem', color: '#fff', lineHeight: 1 }}>
                        {value}
                    </Typography>
                    <Typography sx={{ fontSize: '0.65rem', color: 'text.secondary', fontWeight: 600 }}>
                        {unit}
                    </Typography>
                </Box>
            </Box>
        );
    }

    // ===== MEDIUM LAYOUT: Vertical standard =====
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
                    <Typography sx={{
                        color: 'text.secondary',
                        fontWeight: 700,
                        fontSize: '0.65rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        mb: 0.5
                    }}>
                        {name}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                        <Typography fontWeight="800" sx={{
                            background: 'linear-gradient(to right, #fff, #a1a1aa)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            fontSize: '1.8rem',
                            lineHeight: 1
                        }}>
                            {value}
                        </Typography>
                        <Typography sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '0.75rem' }}>
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
                        <IconButton size="small" onClick={handleSave} sx={{ color: 'success.main' }}>
                            <Check size={16} />
                        </IconButton>
                    </Box>
                ) : (
                    <Typography sx={{
                        color: 'text.secondary',
                        fontWeight: 700,
                        fontSize: '0.7rem',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        mb: 1
                    }}>
                        {name}
                    </Typography>
                )}

                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 0.5 }}>
                    <Typography fontWeight="800" sx={{
                        background: 'linear-gradient(to right, #fff, #a1a1aa)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        fontSize: '2.5rem',
                        letterSpacing: '-2px',
                        lineHeight: 1
                    }}>
                        {value}
                    </Typography>
                    <Typography sx={{ color: 'text.secondary', fontWeight: 600, fontSize: '1rem' }}>
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
                    <Typography sx={{ color: 'text.disabled', fontSize: '0.65rem' }}>
                        Ideal ({stageLabel})
                    </Typography>
                    <Typography sx={{
                        color: color,
                        fontWeight: 700,
                        fontSize: '0.75rem'
                    }}>
                        {idealRange[0]} - {idealRange[1]} {unit}
                    </Typography>
                </Box>
            )}
        </Box>
    );
};

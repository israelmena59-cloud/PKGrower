import React from 'react';
import { Paper, Box, Typography, Button, ButtonProps, Chip } from '@mui/material';

// --- GLASS CARD ---
interface GlassCardProps {
    children: React.ReactNode;
    sx?: any;
    className?: string; // Allow passing class names
}

export const GlassCard = ({ children, sx = {}, className = '' }: GlassCardProps) => (
    <Paper
        elevation={0}
        className={`glass-panel ${className}`}
        sx={{
            p: 3,
            borderRadius: '24px',
            background: 'var(--glass-bg, rgba(17, 25, 40, 0.75))',
            backdropFilter: 'var(--backdrop-blur, blur(16px))',
            border: 'var(--glass-border, 1px solid rgba(255, 255, 255, 0.125))',
            boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
            ...sx
        }}
    >
        {children}
    </Paper>
);

// --- METRIC CARD ---
interface MetricCardProps {
    label: string;
    value: string | number;
    unit?: string;
    icon?: React.ElementType;
    color?: string;
    subValue?: string;
    trend?: 'up' | 'down' | 'neutral';
}

export const MetricCard = ({ label, value, unit, icon: Icon, color = '#3b82f6', subValue, trend }: MetricCardProps) => (
    <Paper
        elevation={0}
        sx={{
            p: 2,
            borderRadius: '20px',
            bgcolor: 'rgba(255,255,255,0.03)',
            border: '1px solid rgba(255,255,255,0.05)',
            height: '100%',
            transition: 'transform 0.2s',
            '&:hover': { transform: 'translateY(-2px)', bgcolor: 'rgba(255,255,255,0.05)' }
        }}
    >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{
                p: 1,
                borderRadius: '12px',
                bgcolor: `${color}20`,
                color: color,
                boxShadow: `0 0 10px ${color}40`
            }}>
                {Icon && <Icon size={20} />}
            </Box>
            {subValue && (
                <Chip
                    label={subValue}
                    size="small"
                    sx={{
                        bgcolor: 'rgba(255,255,255,0.05)',
                        color: 'text.secondary',
                        fontSize: '0.7rem',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }}
                />
            )}
        </Box>
        <Typography variant="h4" fontWeight="800" sx={{ color: '#fff', mb: 0.5, letterSpacing: '-0.5px' }}>
            {value}<Typography component="span" variant="caption" sx={{ color: 'text.secondary', ml: 0.5, fontWeight: 500 }}>{unit}</Typography>
        </Typography>
        <Typography variant="body2" color="text.secondary" fontWeight={500}>{label}</Typography>
    </Paper>
);

// --- GLASS BUTTON ---
interface GlassButtonProps extends ButtonProps {
    glowColor?: string;
}

export const GlassButton = ({ children, sx = {}, glowColor = '#3b82f6', ...props }: GlassButtonProps) => (
    <Button
        {...props}
        sx={{
            borderRadius: '12px',
            textTransform: 'none',
            fontWeight: 600,
            transition: 'all 0.3s ease',
            ...sx
        }}
    >
        {children}
    </Button>
);

// src/components/dashboard/SensorCard.tsx
import React from 'react';
import { Box, Typography, Paper, Tooltip, IconButton } from '@mui/material';
import { Info } from 'lucide-react';

interface SensorCardProps {
  icon: React.ReactNode;
  name: string;
  value: string | number;
  unit: string;
  description?: string; // Didactic element
  color?: string; // Accent color
}

const SensorCard: React.FC<SensorCardProps> = ({ icon, name, value, unit, description, color = '#10b981' }) => {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        borderRadius: 'var(--squircle-radius)',
        bgcolor: 'var(--glass-bg)',
        backdropFilter: 'var(--backdrop-blur)',
        border: 'var(--glass-border)',
        boxShadow: 'var(--glass-shadow)',
        '&:hover': {
           transform: 'translateY(-4px) scale(1.02)',
           boxShadow: `0 15px 30px -5px ${color}30, inset 0 0 0 1px ${color}50`
        },
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '100%'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{
            p: 1.2,
            borderRadius: '16px',
            bgcolor: `${color}15`, // Ultra subtle backing
            color: color,
            display: 'flex',
            boxShadow: `0 4px 12px ${color}20`
        }}>
            {icon}
        </Box>
        {description && (
            <Tooltip title={description} arrow placement="top">
                <IconButton size="small" sx={{ color: 'text.secondary', opacity: 0.6, '&:hover': { opacity: 1, color: color } }}>
                    <Info size={16} />
                </IconButton>
            </Tooltip>
        )}
      </Box>

      <Box>
        <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600, letterSpacing: 0.5, mb: 0.5, textTransform: 'uppercase', fontSize: '0.7rem' }}>
            {name}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'baseline' }}>
            <Typography variant="h4" fontWeight="800" sx={{ color: 'text.primary', fontSize: '1.8rem', letterSpacing: -1 }}>
            {value}
            </Typography>
            <Typography variant="body1" sx={{ ml: 0.5, fontWeight: 600, color: 'text.secondary' }}>
            {unit}
            </Typography>
        </Box>
      </Box>
    </Paper>
  )
}

export default SensorCard;

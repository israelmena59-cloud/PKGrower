import React from 'react';
import { Box, Typography, Tooltip, IconButton } from '@mui/material';
import { Info } from 'lucide-react';

interface SensorWidgetProps {
    icon: React.ReactNode;
    name: string;
    value: string | number;
    unit: string;
    description?: string;
    color?: string;
}

export const SensorWidget: React.FC<SensorWidgetProps> = ({
    icon,
    name,
    value,
    unit,
    description,
    color = '#10b981'
}) => {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between' }}>
             <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{
                    p: 1,
                    borderRadius: '12px',
                    bgcolor: `${color}15`,
                    color: color,
                    display: 'flex',
                }}>
                    {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement, { size: 20 }) : icon}
                </Box>
                {description && (
                    <Tooltip title={description} arrow placement="top">
                        <IconButton size="small" sx={{ opacity: 0.6 }}>
                            <Info size={14} />
                        </IconButton>
                    </Tooltip>
                )}
            </Box>

            <Box>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600, textTransform: 'uppercase' }}>
                    {name}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'baseline' }}>
                    <Typography variant="h4" fontWeight="700" sx={{ color: 'text.primary', fontSize: '1.8rem' }}>
                        {value}
                    </Typography>
                    <Typography variant="body2" sx={{ ml: 0.5, color: 'text.secondary', fontWeight: 600 }}>
                        {unit}
                    </Typography>
                </Box>
            </Box>
        </Box>
    );
};

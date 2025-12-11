import React, { useState } from 'react';
import { Box, Typography, Tooltip, IconButton, TextField } from '@mui/material';
import { Info, Edit2, Check } from 'lucide-react';

interface SensorWidgetProps {
    icon: React.ReactNode;
    name: string;
    value: string | number;
    unit: string;
    description?: string;
    color?: string;
    onRename?: (newName: string) => void;
}

export const SensorWidget: React.FC<SensorWidgetProps> = ({
    icon,
    name,
    value,
    unit,
    description,
    color = '#10b981',
    onRename
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState(name);

    const handleSave = () => {
        if (onRename && editName.trim()) {
            onRename(editName);
        }
        setIsEditing(false);
    };

    return (
        <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            justifyContent: 'space-between',
            position: 'relative',
            '&:hover .edit-btn': { opacity: 1 }
        }}>
             <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{
                    p: 1.2,
                    borderRadius: '16px',
                    background: `linear-gradient(135deg, ${color}20 0%, ${color}10 100%)`,
                    color: color,
                    display: 'flex',
                    boxShadow: `0 4px 12px ${color}15`,
                    backdropFilter: 'blur(8px)'
                }}>
                    {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement, { size: 22 }) : icon}
                </Box>

                <Box sx={{ display: 'flex', gap: 0.5 }}>
                     {!isEditing && (
                        <IconButton
                            size="small"
                            className="edit-btn"
                            onClick={() => setIsEditing(true)}
                            sx={{ opacity: 0, transition: 'opacity 0.2s', color: 'rgba(255,255,255,0.5)' }}
                        >
                            <Edit2 size={12} />
                        </IconButton>
                     )}
                    {description && (
                        <Tooltip title={description} arrow placement="top">
                            <IconButton size="small" sx={{ opacity: 0.6, color: 'text.secondary' }}>
                                <Info size={14} />
                            </IconButton>
                        </Tooltip>
                    )}
                </Box>
            </Box>

            <Box>
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
                            <Check size={14} />
                        </IconButton>
                    </Box>
                ) : (
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', opacity: 0.8 }}>
                        {name}
                    </Typography>
                )}

                <Box sx={{ display: 'flex', alignItems: 'baseline', mt: 0.5 }}>
                    <Typography variant="h4" fontWeight="800" sx={{
                        background: 'linear-gradient(to right, #fff, #cbd5e1)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        fontSize: '2rem',
                        letterSpacing: '-1px'
                    }}>
                        {value}
                    </Typography>
                    <Typography variant="body2" sx={{ ml: 0.5, color: 'text.secondary', fontWeight: 600, mb: 0.5 }}>
                        {unit}
                    </Typography>
                </Box>
            </Box>
        </Box>
    );
};

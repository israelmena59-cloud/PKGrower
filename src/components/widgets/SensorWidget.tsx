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
            width: '100%',
            justifyContent: 'space-between',
            position: 'relative',
            overflow: 'hidden',
            '&:hover .edit-btn': { opacity: 1 }
        }}>
             <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
                <Box sx={{
                    p: 'clamp(0.5rem, 2%, 1.2rem)',
                    borderRadius: '16px',
                    background: `linear-gradient(135deg, ${color}20 0%, ${color}10 100%)`,
                    color: color,
                    display: 'flex',
                    boxShadow: `0 4px 12px ${color}15`,
                    backdropFilter: 'blur(8px)',
                    '& svg': { width: 'clamp(16px, 4vw, 28px)', height: 'clamp(16px, 4vw, 28px)' }
                }}>
                    {icon}
                </Box>

                <Box sx={{ display: 'flex', gap: 0.5, flexShrink: 0 }}>
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

            <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', minHeight: 0 }}>
                {isEditing ? (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <TextField
                            variant="standard"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            size="small"
                            autoFocus
                            sx={{
                                input: { color: 'text.secondary', fontSize: 'clamp(0.6rem, 2vw, 0.75rem)', fontWeight: 600, textTransform: 'uppercase' }
                            }}
                        />
                         <IconButton size="small" onClick={handleSave} sx={{ color: 'green' }}>
                            <Check size={14} />
                        </IconButton>
                    </Box>
                ) : (
                    <Typography variant="caption" sx={{
                        color: 'text.secondary',
                        fontWeight: 700,
                        letterSpacing: '1px',
                        textTransform: 'uppercase',
                        opacity: 0.8,
                        fontSize: 'clamp(0.55rem, 1.5vw, 0.75rem)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                    }}>
                        {name}
                    </Typography>
                )}

                <Box sx={{ display: 'flex', alignItems: 'baseline', mt: 0.5, overflow: 'hidden' }}>
                    <Typography fontWeight="800" sx={{
                        background: 'linear-gradient(to right, #fff, #cbd5e1)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                        fontSize: 'clamp(1.2rem, 6vw, 3rem)',
                        letterSpacing: '-1px',
                        lineHeight: 1.1
                    }}>
                        {value}
                    </Typography>
                    <Typography sx={{
                        ml: 0.5,
                        color: 'text.secondary',
                        fontWeight: 600,
                        mb: 0.5,
                        fontSize: 'clamp(0.6rem, 2vw, 0.875rem)'
                    }}>
                        {unit}
                    </Typography>
                </Box>
            </Box>
        </Box>
    );
};

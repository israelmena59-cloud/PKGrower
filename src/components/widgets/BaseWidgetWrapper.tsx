import React from 'react';
import { Card, CardContent, Typography, IconButton, Box, CircularProgress, alpha } from '@mui/material';
import { X, Maximize2, Minimize2, GripHorizontal } from 'lucide-react';

export interface BaseWidgetProps {
    title: string;
    loading?: boolean;
    error?: string;
    isEditMode?: boolean;
    onRemove?: () => void;
    children: React.ReactNode;
    className?: string;
    style?: React.CSSProperties;
    // Props passed by React-Grid-Layout
    onMouseDown?: React.MouseEventHandler;
    onMouseUp?: React.MouseEventHandler;
    onTouchEnd?: React.TouchEventHandler;
}

export const BaseWidgetWrapper = React.forwardRef<HTMLDivElement, BaseWidgetProps>(({
    title,
    loading = false,
    error,
    isEditMode = false,
    onRemove,
    children,
    className,
    style,
    onMouseDown,
    onMouseUp,
    onTouchEnd,
    ...props
}, ref) => {
    return (
        <Card
            ref={ref}
            className={className}
            style={{ ...style, display: 'flex', flexDirection: 'column', height: '100%' }}
            sx={{
                position: 'relative',
                overflow: 'hidden',
                borderRadius: 2,
                boxShadow: 3,
                transition: 'transform 0.2s, box-shadow 0.2s',
                ...(isEditMode && {
                    animation: 'wiggle 0.3s infinite alternate',
                    border: '2px dashed #1976d2',
                    cursor: 'grab'
                }),
                '&:hover': {
                    boxShadow: 6
                }
            }}
            onMouseDown={onMouseDown}
            onMouseUp={onMouseUp}
            onTouchEnd={onTouchEnd}
            {...props}
        >
             {/* EDIT MODE OVERLAY HEADER */}
            {isEditMode && (
                <Box
                    className="drag-handle"
                    sx={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: 32,
                        bgcolor: alpha('#000', 0.1),
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 20
                    }}
                >
                    <GripHorizontal size={16} color="#666" />
                    {onRemove && (
                        <IconButton
                            size="small"
                            onClick={(e) => {
                                e.stopPropagation();
                                onRemove();
                            }}
                            sx={{
                                position: 'absolute',
                                right: 4,
                                top: 4,
                                bgcolor: 'error.main',
                                color: 'white',
                                width: 20,
                                height: 20,
                                '&:hover': { bgcolor: 'error.dark' }
                            }}
                        >
                            <X size={12} />
                        </IconButton>
                    )}
                </Box>
            )}

            <CardContent sx={{ flexGrow: 1, p: 2, display: 'flex', flexDirection: 'column', height: '100%' }}>
                {title && (
                    <Typography variant="subtitle2" color="text.secondary" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {title}
                    </Typography>
                )}

                <Box sx={{ flexGrow: 1, position: 'relative', minHeight: 0 }}>
                    {loading ? (
                         <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                            <CircularProgress size={24} />
                        </Box>
                    ) : error ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'error.main', fontSize: '0.8rem' }}>
                            {error}
                        </Box>
                    ) : (
                        children
                    )}
                </Box>
            </CardContent>

             <style>{`
                @keyframes wiggle {
                    0% { transform: rotate(-1deg); }
                    100% { transform: rotate(1deg); }
                }
            `}</style>
        </Card>
    );
});

BaseWidgetWrapper.displayName = 'BaseWidgetWrapper';

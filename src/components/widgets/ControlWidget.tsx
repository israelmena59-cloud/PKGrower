import React, { useState } from 'react';
import { Box, Typography, Switch as MuiSwitch, CircularProgress, Snackbar, Alert } from '@mui/material';
import { apiClient } from '../../api/client';

interface ControlWidgetProps {
    id: string; // Device ID used for API calls
    icon: React.ReactNode;
    name: string;
    isOn: boolean;
    // Optional: if provided, overrides the default toggle logic
    onToggleOverride?: () => Promise<void>;
}

export const ControlWidget: React.FC<ControlWidgetProps> = ({
    id,
    icon,
    name,
    isOn,
    onToggleOverride
}) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleToggle = async () => {
        if (loading) return;
        setLoading(true);
        setError(null);

        try {
            if (onToggleOverride) {
                await onToggleOverride();
            } else {
                // Default toggle logic using ID
                // Note: apiClient.toggleDevice expects keyof DeviceStates, but we might have dynamic IDs
                // We use controlDevice generic method
               await apiClient.controlDevice(id, isOn ? 'off' : 'on');
            }
        } catch (err: any) {
             console.error("Control failed:", err);
             setError("Error al cambiar estado");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
            <Box
                sx={{
                    mb: 2,
                    p: 1.5,
                    borderRadius: '50%',
                    bgcolor: isOn ? '#22c55e' : 'action.selected',
                    color: isOn ? 'white' : 'text.disabled',
                    transition: 'all 0.3s ease',
                    display: 'flex',
                }}
            >
                {loading ? (
                    <CircularProgress size={24} color="inherit" />
                ) : (
                    React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement, { size: 24 }) : icon
                )}
            </Box>

            <Typography variant="body1" fontWeight="600" gutterBottom>
                {name}
            </Typography>

            <MuiSwitch
                checked={isOn}
                onChange={handleToggle}
                disabled={loading}
                color="success"
            />

            <Snackbar
                open={!!error}
                autoHideDuration={2000}
                onClose={() => setError(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert severity="error">{error}</Alert>
            </Snackbar>
        </Box>
    );
};

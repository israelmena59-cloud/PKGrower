import React, { useState, useEffect } from 'react';
import { Box, Paper, Typography, Skeleton } from '@mui/material';
import { VideoOff } from 'lucide-react';
// apiClient unused for now as we construct URL manually
// import { apiClient } from '../../api/client';

interface CameraViewProps {
  online: boolean;
}

export const CameraView: React.FC<CameraViewProps> = ({ online }) => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [error, setError] = useState(false);

  // Auto-refresh image every 2 seconds to simulate low-FPS video
  useEffect(() => {
    if (!online) return;

    const interval = setInterval(() => {
      setRefreshKey(k => k + 1);
    }, 2000);

    return () => clearInterval(interval);
  }, [online]);

  useEffect(() => {
    if (!online) return;

    // In a real scenario, this would be a snapshot URL from the backend
    // For now, we point to the mock snapshot endpoint or placeholder
    // The query param prevents browser caching
    const url = `${(window as any).__API_BASE_URL__ || 'http://localhost:3000'}/api/camera/snapshot?t=${Date.now()}`;

    // Preload image to avoid flickering
    const img = new Image();
    img.src = url;
    img.onload = () => {
      setImageUrl(url);
      setError(false);
    };
    img.onerror = () => {
      // If snapshot fails, maybe use a placeholder or keep previous
      setError(true);
    };

  }, [refreshKey, online]);

  if (!online) {
    return (
      <Paper
        sx={{
          width: '100%',
          aspectRatio: '16/9',
          bgcolor: '#000',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#666'
        }}
      >
        <VideoOff size={48} />
        <Typography variant="body2" sx={{ mt: 1 }}>Cámara desconectada</Typography>
      </Paper>
    );
  }

  return (
    <Box sx={{ position: 'relative', width: '100%' }}>
      <Paper
        elevation={2}
        sx={{
          width: '100%',
          aspectRatio: '16/9',
          overflow: 'hidden',
          bgcolor: '#000',
          position: 'relative'
        }}
      >
        {imageUrl && !error ? (
          <img
            src={imageUrl}
            alt="Camera Live View"
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : (
          <Box sx={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
             {error ? (
                <Typography color="error">Error al cargar imagen</Typography>
             ) : (
                <Skeleton variant="rectangular" width="100%" height="100%" animation="wave" sx={{ bgcolor: 'grey.900' }} />
             )}
          </Box>
        )}

        {/* Live Indicator */}
        <Box
          sx={{
            position: 'absolute',
            top: 10,
            left: 10,
            bgcolor: 'rgba(0,0,0,0.6)',
            color: 'red',
            px: 1,
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 0.5
          }}
        >
          <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'red' }} />
          <Typography variant="caption" sx={{ fontWeight: 'bold' }}>EN VIVO</Typography>
        </Box>
      </Paper>
    </Box>
  );
};

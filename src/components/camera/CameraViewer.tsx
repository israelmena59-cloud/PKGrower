import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  CardActions,
  Switch,
  FormControlLabel,
  Grid,
  Divider,
} from '@mui/material';
import {
  Camera,
  RefreshCw,
  Maximize2,
  Moon,
  Sun,
  Sparkles,
} from 'lucide-react';
import { apiClient } from '../../api/client';

const CameraViewer: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [snapshot, setSnapshot] = useState<string | null>(null);
  const [streamUrl, setStreamUrl] = useState<string | null>(null);
  const [cameraInfo, setCameraInfo] = useState<any>(null);
  const [nightVision, setNightVision] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);

  // Cargar información de la cámara
  useEffect(() => {
    fetchCameraInfo();
  }, []);

  const fetchCameraInfo = async () => {
    try {
      setLoading(true);
      setError(null);

      // Obtener información
      const infoResponse = await apiClient.get('/camera/info');
      setCameraInfo(infoResponse.data);

      // Obtener snapshot
      const snapshotResponse = await apiClient.get('/camera/snapshot');
      setSnapshot(snapshotResponse.data.snapshotUrl);

      // Obtener stream
      const streamResponse = await apiClient.get('/camera/stream');
      setStreamUrl(streamResponse.data.streamUrl);
    } catch (err: any) {
      setError(err.message || 'Error al cargar información de la cámara');
    } finally {
      setLoading(false);
    }
  };

  const handleRefreshSnapshot = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/camera/snapshot');
      setSnapshot(response.data.snapshotUrl);
    } catch (err: any) {
      setError('Error al actualizar snapshot');
    } finally {
      setLoading(false);
    }
  };

  const handleNightVisionToggle = async (enabled: boolean) => {
    try {
      setLoading(true);
      await apiClient.post('/camera/night-vision', { enabled });
      setNightVision(enabled);
    } catch (err: any) {
      setError('Error al cambiar night vision');
    } finally {
      setLoading(false);
    }
  };

  const handleFullscreen = () => {
    const element = document.getElementById('camera-viewer');
    if (element?.requestFullscreen) {
      element.requestFullscreen();
      setFullscreen(true);
    }
  };

  // --- VISUAL DIAGNOSIS STATE ---
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);

  const handleDiagnose = async () => {
    if (!snapshot) return;
    setAnalyzing(true);
    setAnalysisResult(null);
    setShowAnalysis(true);

    try {
        // Convert snapshot URL (blob/base64) to Blob
        const res = await fetch(snapshot);
        const blob = await res.blob();

        const formData = new FormData();
        formData.append('image', blob, 'snapshot.jpg');

        // Call Backend
        const apiRes = await apiClient.post('/ai/analyze-image', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });

        setAnalysisResult(apiRes.data.analysis);
    } catch (e: any) {
        setAnalysisResult("Error al analizar la imagen: " + (e.response?.data?.error || e.message));
    } finally {
        setAnalyzing(false);
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Camera size={32} />
        Visualización de Cámara
      </Typography>

      {/* RESULT DIALOG (Glassmorphic) */}
      {showAnalysis && (
        <Box sx={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            bgcolor: 'rgba(0,0,0,0.6)', zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center', p: 2
        }}>
            <Box className="glass-panel" sx={{
                width: '100%', maxWidth: 600, maxHeight: '80vh', overflowY: 'auto',
                bgcolor: 'var(--glass-bg)', backdropFilter: 'var(--backdrop-blur)',
                border: 'var(--glass-border)', boxShadow: 'var(--glass-shadow)',
                borderRadius: 'var(--squircle-radius)', p: 4, position: 'relative'
            }}>
                <Button
                    onClick={() => setShowAnalysis(false)}
                    sx={{ position: 'absolute', top: 10, right: 10, minWidth: 30, color: 'white' }}
                >
                    X
                </Button>

                <Typography variant="h5" sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1, color: '#a5f3fc' }}>
                    <Sparkles className="animate-spin-slow" /> Diagnóstico Visual
                </Typography>

                <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)', mb: 3 }} />

                {analyzing ? (
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 4 }}>
                        <CircularProgress size={60} sx={{ color: '#a5f3fc', mb: 2 }} />
                        <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.7)' }}>
                            Gemini Vision analizando cultivo...
                        </Typography>
                    </Box>
                ) : (
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-line', lineHeight: 1.6, color: 'white' }}>
                        {analysisResult}
                    </Typography>
                )}

                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                    <Button variant="contained" onClick={() => setShowAnalysis(false)}>Cerrar</Button>
                </Box>
            </Box>
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {cameraInfo && (
        <Alert severity={cameraInfo.status === 'online' ? 'success' : 'warning'} sx={{ mb: 2 }}>
          Cámara: <strong>{cameraInfo.name}</strong> - Estado: <strong>{cameraInfo.status}</strong>
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Panel principal de video */}
        <Grid item xs={12} md={8}>
          <Paper
            id="camera-viewer"
            sx={{
              bgcolor: '#000',
              aspectRatio: '16/9',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden',
              borderRadius: 2,
            }}
          >
            {loading && !snapshot ? (
              <CircularProgress />
            ) : snapshot ? (
              <Box
                component="img"
                src={snapshot}
                alt="Cámara Xiaomi"
                sx={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            ) : (
              <Typography color="gray">No hay snapshot disponible</Typography>
            )}

            {/* Overlay con info */}
            <Box
              sx={{
                position: 'absolute',
                bottom: 0,
                left: 0,
                right: 0,
                bgcolor: 'rgba(0,0,0,0.7)',
                color: '#fff',
                p: 1,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <Typography variant="body2">
                {cameraInfo?.name} • {new Date().toLocaleTimeString()}
              </Typography>
              {nightVision && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: 'rgba(255,0,0,0.5)', px: 1, borderRadius: 1 }}>
                  <Moon size={16} />
                  <Typography variant="caption">Night Vision</Typography>
                </Box>
              )}
            </Box>
          </Paper>

          {/* Controles principales */}
          <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
            <Button
              variant="contained"
              startIcon={<RefreshCw size={20} />}
              onClick={handleRefreshSnapshot}
              disabled={loading}
              fullWidth
            >
              Actualizar Snapshot
            </Button>
            <Button
              variant="contained"
              color="secondary"
              startIcon={<Sparkles size={20} />}
              onClick={handleDiagnose}
              disabled={loading || !snapshot}
              fullWidth
              sx={{
                  background: 'linear-gradient(45deg, #7c3aed 30%, #2563eb 90%)',
                  boxShadow: '0 3px 5px 2px rgba(124, 58, 237, .3)',
                  color: 'white',
                  fontWeight: 'bold'
              }}
            >
              Diagnosticar (AI Vision)
            </Button>
            <Button
              variant="outlined"
              startIcon={<Maximize2 size={20} />}
              onClick={handleFullscreen}
              fullWidth
            >
              Pantalla Completa
            </Button>
          </Box>
        </Grid>

        {/* Panel de controles */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Controles
              </Typography>
              <Divider sx={{ mb: 2 }} />

              {cameraInfo && (
                <>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" color="textSecondary">
                      Información de la Cámara
                    </Typography>
                    <Box sx={{ mt: 1, bgcolor: '#f5f5f5', p: 1.5, borderRadius: 1 }}>
                      <Typography variant="body2">
                        <strong>Modelo:</strong> {cameraInfo.model}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Resolución:</strong> {cameraInfo.resolution}
                      </Typography>
                      <Typography variant="body2">
                        <strong>FPS:</strong> {cameraInfo.framerate}
                      </Typography>
                      <Typography variant="body2">
                        <strong>Bitrate:</strong> {cameraInfo.bitrate} kbps
                      </Typography>
                      <Typography variant="body2">
                        <strong>Estado:</strong> {cameraInfo.status}
                      </Typography>
                    </Box>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  {/* Night Vision Toggle */}
                  <FormControlLabel
                    control={
                      <Switch
                        checked={nightVision}
                        onChange={(e) => handleNightVisionToggle(e.target.checked)}
                        disabled={loading}
                      />
                    }
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {nightVision ? <Moon size={20} /> : <Sun size={20} />}
                        Night Vision
                      </Box>
                    }
                  />
                </>
              )}

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" color="textSecondary" sx={{ mb: 1 }}>
                Stream de Video
              </Typography>
              {streamUrl ? (
                <>
                  <Paper sx={{ p: 1, bgcolor: '#f5f5f5', mb: 1 }}>
                    <Typography variant="caption" sx={{ wordBreak: 'break-all', fontFamily: 'monospace' }}>
                      {streamUrl}
                    </Typography>
                  </Paper>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                    Protocolo: {streamUrl.startsWith('rtsp') ? 'RTSP' : 'HTTP Motion JPEG'}
                  </Typography>
                  <Button
                    variant="outlined"
                    size="small"
                    fullWidth
                    onClick={() => window.open(streamUrl)}
                  >
                    Abrir Stream
                  </Button>
                </>
              ) : (
                <Alert severity="info" size="small">
                  Stream no disponible
                </Alert>
              )}
            </CardContent>

            <CardActions>
              <Button size="small" onClick={fetchCameraInfo} disabled={loading}>
                Actualizar Todo
              </Button>
            </CardActions>
          </Card>

          {/* Panel de grabación */}
          <Card sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Grabación
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                Control de grabación de video
              </Typography>
            </CardContent>
            <CardActions sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                size="small"
                color="success"
                onClick={() => apiClient.recordCameraStart()}
              >
                Iniciar
              </Button>
              <Button
                variant="contained"
                size="small"
                color="error"
                onClick={() => apiClient.recordCameraStop()}
              >
                Detener
              </Button>
            </CardActions>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default CameraViewer;

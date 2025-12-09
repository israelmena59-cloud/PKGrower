// src/components/camera/CameraControl.tsx
import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Button,
  Stack,
  Typography,
  CircularProgress,
  Alert,
  Divider,
  Paper,
} from '@mui/material'
import { Camera, Video, Pause, Image as ImageIcon } from 'lucide-react'
import { apiClient, CameraStatus } from '../../api/client'
import { CameraView } from './CameraView'

export const CameraControl: React.FC = () => {
  const [cameraStatus, setCameraStatus] = useState<CameraStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)

  // Cargar estado de cámara al montar
  useEffect(() => {
    fetchCameraStatus()
  }, [])

  // Timer para grabación
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isRecording) {
      interval = setInterval(() => {
        setRecordingTime((prev) => prev + 1)
      }, 1000)
    }
    return () => clearInterval(interval)
  }, [isRecording])

  const fetchCameraStatus = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const status = await apiClient.getCameraStatus()
      setCameraStatus(status)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      setError(`No se pudo obtener el estado de la cámara: ${message}`)
      console.error('Camera status error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleStartRecording = async () => {
    try {
      setError(null)
      setIsRecording(true)
      setRecordingTime(0)
      const result = await apiClient.recordCameraStart(300) // 5 minutos máximo
      setSuccessMessage(`${result.message}`)
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      setError(`Error al iniciar grabación: ${message}`)
      setIsRecording(false)
      console.error('Recording start error:', err)
    }
  }

  const handleStopRecording = async () => {
    try {
      setError(null)
      setIsRecording(false)
      const result = await apiClient.recordCameraStop()
      setSuccessMessage(`${result.message}. Video guardado.`)
      setRecordingTime(0)
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      setError(`Error al detener grabación: ${message}`)
      console.error('Recording stop error:', err)
    }
  }

  const handleCapturePhoto = async () => {
    try {
      setError(null)
      setIsLoading(true)
      const result = await apiClient.capturePhoto()
      setSuccessMessage(`${result.message}. Foto guardada.`)
      setTimeout(() => setSuccessMessage(null), 3000)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      setError(`Error al capturar foto: ${message}`)
      console.error('Photo capture error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const formatRecordingTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }

  return (
    <Card
      sx={{
        boxShadow: 3,
        borderRadius: 2,
        bgcolor: 'background.paper',
        mb: 3,
      }}
    >
      <CardHeader
        avatar={<Camera size={32} style={{ color: '#1976d2' }} />}
        title="Cámara Xiaomi Mijia"
        subheader="Control de cámara, fotos y videos"
        titleTypographyProps={{ variant: 'h6', fontWeight: 600 }}
      />
      <Divider />

      <CardContent>
        {/* Estado de conexión */}
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress />
          </Box>
        ) : cameraStatus ? (
          <>
            {/* Alert de estado */}
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {successMessage && <Alert severity="success" sx={{ mb: 2 }}>{successMessage}</Alert>}

            {/* Vista de Cámara */}
            <Box sx={{ mb: 2 }}>
                <CameraView online={cameraStatus.power} />
            </Box>

            {/* Estado actual */}
            <Paper
              elevation={0}
              sx={{
                p: 2,
                mb: 2,
                bgcolor: cameraStatus.power ? '#e8f5e9' : '#ffebee',
                border: '1px solid',
                borderColor: cameraStatus.power ? '#4caf50' : '#ef5350',
                borderRadius: 1,
              }}
            >
              <Stack direction="row" spacing={2} alignItems="center">
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    borderRadius: '50%',
                    bgcolor: cameraStatus.power ? '#4caf50' : '#ef5350',
                  }}
                />
                <Typography variant="body2">
                  Estado: <strong>{cameraStatus.power ? 'Encendida' : 'Apagada'}</strong>
                </Typography>
              </Stack>
            </Paper>

            {/* Sección de grabación */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
                📹 Grabación de Video
              </Typography>

              {isRecording && (
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    mb: 2,
                    bgcolor: '#fff3e0',
                    border: '2px solid #ff9800',
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                  }}
                >
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      bgcolor: '#ff5722',
                      animation: 'pulse 1s infinite',
                      '@keyframes pulse': {
                        '0%': { opacity: 1 },
                        '50%': { opacity: 0.5 },
                        '100%': { opacity: 1 },
                      },
                    }}
                  />
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    Grabando: {formatRecordingTime(recordingTime)}
                  </Typography>
                </Paper>
              )}

              <Stack direction="row" spacing={2}>
                <Button
                  variant={isRecording ? 'contained' : 'outlined'}
                  color={isRecording ? 'error' : 'primary'}
                  startIcon={isRecording ? <Pause size={20} /> : <Video size={20} />}
                  onClick={isRecording ? handleStopRecording : handleStartRecording}
                  fullWidth
                  disabled={isLoading || !cameraStatus.power}
                >
                  {isRecording ? 'Detener Grabación' : 'Iniciar Grabación'}
                </Button>
              </Stack>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Sección de fotos */}
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
                📷 Captura de Fotos
              </Typography>

              <Stack direction="row" spacing={2}>
                <Button
                  variant="outlined"
                  color="primary"
                  startIcon={<ImageIcon size={20} />}
                  onClick={handleCapturePhoto}
                  fullWidth
                  disabled={isLoading || !cameraStatus.power}
                >
                  Capturar Foto
                </Button>
              </Stack>
            </Box>

            {/* Información adicional */}
            <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid #e0e0e0' }}>
              <Typography variant="caption" color="textSecondary">
                ℹ️ Las fotos y videos se guardarán en la tarjeta SD de la cámara. Los tiempos de grabación están limitados por la capacidad de almacenamiento.
              </Typography>
            </Box>
          </>
        ) : (
          <Alert severity="warning">
            No se pudo conectar con la cámara. Verifica que esté encendida y correctamente configurada.
          </Alert>
        )}

        {/* Botón de actualizar estado */}
        <Box sx={{ mt: 2 }}>
          <Button
            size="small"
            variant="text"
            onClick={fetchCameraStatus}
            disabled={isLoading}
          >
            Actualizar Estado
          </Button>
        </Box>
      </CardContent>
    </Card>
  )
}

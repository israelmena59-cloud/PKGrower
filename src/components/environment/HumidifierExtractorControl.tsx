// src/components/environment/HumidifierExtractorControl.tsx
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
  Slider,
  Switch,
  FormControlLabel,
  Paper,
  Grid,
} from '@mui/material'
import { Cloud, Wind } from 'lucide-react'
import { apiClient, HumidifierStatus } from '../../api/client'

export const HumidifierExtractorControl: React.FC = () => {
  const [humidifierStatus, setHumidifierStatus] = useState<HumidifierStatus | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [autoMode, setAutoMode] = useState(true)
  const [targetHumidity, setTargetHumidity] = useState(65)
  const [isUpdating, setIsUpdating] = useState(false)

  // Cargar estado al montar
  useEffect(() => {
    fetchHumidifierStatus()
  }, [])

  const fetchHumidifierStatus = async () => {
    try {
      setIsLoading(true)
      setError(null)
      const status = await apiClient.getHumidifierStatus()
      setHumidifierStatus(status)
      setTargetHumidity(status.targetHumidity || 65)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      setError(`No se pudo obtener el estado del humidificador: ${message}`)
      console.error('Humidifier status error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleApplyControl = async () => {
    try {
      setError(null)
      setIsUpdating(true)
      const result = await apiClient.controlHumidifierExtractor(targetHumidity, autoMode)

      const statusText = `Humedad objetivo: ${targetHumidity}%${
        result.humidifierAction === 'on' ? ' | Humidificador: ENCENDIDO' : ''
      }${result.extractorAction === 'on' ? ' | Extractor: ENCENDIDO' : ''}`

      setSuccessMessage(`Configuración actualizada. ${statusText}`)
      setTimeout(() => setSuccessMessage(null), 4000)

      // Actualizar estado
      setTimeout(fetchHumidifierStatus, 500)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      setError(`Error al aplicar control: ${message}`)
      console.error('Control error:', err)
    } finally {
      setIsUpdating(false)
    }
  }

  const handleAutoModeToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
    setAutoMode(event.target.checked)
  }

  const handleTargetHumidityChange = (_event: Event, newValue: number | number[]) => {
    setTargetHumidity(newValue as number)
  }

  // Determinar si el humidificador o extractor deberían estar activos
  const shouldHumidifierBeOn = humidifierStatus && autoMode && humidifierStatus.humidity !== null && humidifierStatus.humidity < targetHumidity
  const shouldExtractorBeOn = humidifierStatus && autoMode && humidifierStatus.humidity !== null && humidifierStatus.humidity > targetHumidity

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
        avatar={<Cloud size={32} style={{ color: '#2196f3' }} />}
        title="Control de Humedad"
        subheader="Humidificador + Extractor coordinados"
        titleTypographyProps={{ variant: 'h6', fontWeight: 600 }}
      />
      <Divider />

      <CardContent>
        {/* Estados de carga */}
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </Box>
        ) : humidifierStatus ? (
          <>
            {/* Alertas */}
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {successMessage && <Alert severity="success" sx={{ mb: 2 }}>{successMessage}</Alert>}

            {/* Valores actuales */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6}>
                <Paper elevation={0} sx={{ p: 2, bgcolor: '#e3f2fd', borderRadius: 1 }}>
                  <Typography variant="caption" color="textSecondary">
                    Humedad Actual
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#1976d2', mt: 0.5 }}>
                    {humidifierStatus.humidity !== null ? `${humidifierStatus.humidity}%` : 'N/A'}
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Temperatura: {humidifierStatus.temperature !== null ? `${humidifierStatus.temperature}°C` : 'N/A'}
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} sm={6}>
                <Paper elevation={0} sx={{ p: 2, bgcolor: '#fff3e0', borderRadius: 1 }}>
                  <Typography variant="caption" color="textSecondary">
                    Humedad Objetivo
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: '#f57c00', mt: 0.5 }}>
                    {targetHumidity}%
                  </Typography>
                  <Typography variant="caption" color="textSecondary">
                    Modo: {autoMode ? 'Automático' : 'Manual'}
                  </Typography>
                </Paper>
              </Grid>
            </Grid>

            <Divider sx={{ my: 2 }} />

            {/* Selector de humedad objetivo */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                Ajustar Humedad Objetivo
              </Typography>
              <Slider
                value={targetHumidity}
                onChange={handleTargetHumidityChange}
                min={30}
                max={90}
                step={1}
                marks={[
                  { value: 30, label: '30%' },
                  { value: 65, label: '65%' },
                  { value: 90, label: '90%' },
                ]}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `${value}%`}
                sx={{
                  '& .MuiSlider-markLabel': {
                    fontSize: '0.75rem',
                  },
                }}
              />
              <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                💡 Rango recomendado para plantas: 55-75%
              </Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Modo automático */}
            <Box sx={{ mb: 3 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={autoMode}
                    onChange={handleAutoModeToggle}
                    color="primary"
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Modo Automático
                    </Typography>
                    <Typography variant="caption" color="textSecondary">
                      El sistema controlará automáticamente humidificador y extractor
                    </Typography>
                  </Box>
                }
              />
            </Box>

            {/* Estado automático */}
            {autoMode && humidifierStatus.humidity !== null && (
              <Stack spacing={1.5} sx={{ mb: 3 }}>
                {/* Estado Humidificador */}
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    bgcolor: shouldHumidifierBeOn ? '#e8f5e9' : '#f5f5f5',
                    border: '1px solid',
                    borderColor: shouldHumidifierBeOn ? '#4caf50' : '#e0e0e0',
                    borderRadius: 1,
                  }}
                >
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Cloud size={24} style={{ color: shouldHumidifierBeOn ? '#4caf50' : '#9e9e9e' }} />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Humidificador
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {shouldHumidifierBeOn ? 'Activo: Aumentando humedad' : 'Inactivo: Humedad suficiente'}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        bgcolor: shouldHumidifierBeOn ? '#4caf50' : '#e0e0e0',
                      }}
                    />
                  </Stack>
                </Paper>

                {/* Estado Extractor */}
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    bgcolor: shouldExtractorBeOn ? '#e8f5e9' : '#f5f5f5',
                    border: '1px solid',
                    borderColor: shouldExtractorBeOn ? '#4caf50' : '#e0e0e0',
                    borderRadius: 1,
                  }}
                >
                  <Stack direction="row" spacing={2} alignItems="center">
                    <Wind size={24} style={{ color: shouldExtractorBeOn ? '#4caf50' : '#9e9e9e' }} />
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Extractor
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {shouldExtractorBeOn ? 'Activo: Reduciendo humedad' : 'Inactivo: Humedad controlada'}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        width: 12,
                        height: 12,
                        borderRadius: '50%',
                        bgcolor: shouldExtractorBeOn ? '#4caf50' : '#e0e0e0',
                      }}
                    />
                  </Stack>
                </Paper>
              </Stack>
            )}

            {/* Botón aplicar */}
            <Stack direction="row" spacing={2}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleApplyControl}
                fullWidth
                disabled={isUpdating || isLoading}
              >
                {isUpdating ? 'Aplicando...' : 'Aplicar Configuración'}
              </Button>
              <Button
                variant="outlined"
                color="primary"
                onClick={fetchHumidifierStatus}
                disabled={isLoading || isUpdating}
              >
                Actualizar
              </Button>
            </Stack>

            {/* Información */}
            <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #e0e0e0' }}>
              <Typography variant="caption" color="textSecondary">
                ℹ️ <strong>Lógica automática:</strong> Si humedad &lt; objetivo → Humidificador ON. Si humedad &gt; objetivo → Extractor ON.
              </Typography>
            </Box>
          </>
        ) : (
          <Alert severity="warning">
            No se pudo conectar con el humidificador. Verifica que esté encendido y correctamente configurado.
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}

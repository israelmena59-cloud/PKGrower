import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Grid,
  Paper,
  Typography,
  CircularProgress,
  Alert,
  Divider,
  Button,
} from '@mui/material'
import { Droplets, Thermometer, RefreshCw } from 'lucide-react'
import { apiClient, SoilSensor } from '../../api/client'

export const SoilSensorsGrid: React.FC = () => {
  const [soilSensors, setSoilSensors] = useState<SoilSensor[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSoilSensors()
    const interval = setInterval(fetchSoilSensors, 30000) // Actualizar cada 30s
    return () => clearInterval(interval)
  }, [])

  const fetchSoilSensors = async () => {
    try {
        setLoading(true);
        setError(null)
        const sensors = await apiClient.getSoilSensors()
        setSoilSensors(sensors)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error desconocido'
      setError(`Error al cargar sensores: ${message}`)
    } finally {
        setLoading(false);
    }
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
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: 1, borderColor: 'divider' }}>
          <Box>
            <Typography variant="h6" fontWeight="bold">Sensores de Sustrato</Typography>
            <Typography variant="caption" color="text.secondary">Temperatura y humedad del suelo</Typography>
          </Box>
          <Button startIcon={<RefreshCw size={16} className={loading ? "animate-spin" : ""} />} onClick={fetchSoilSensors} size="small" disabled={loading}>
            Actualizar
          </Button>
      </Box>

      <CardContent>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {soilSensors.length === 0 && !loading && !error && (
            <Alert severity="info" sx={{ mb: 2 }}>
                No hay datos de sensores disponibles.
            </Alert>
        )}

        {loading && soilSensors.length === 0 && (
             <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>
        )}

        <Grid container spacing={3}>
          {soilSensors.map((sensor, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Paper
                elevation={2}
                sx={{
                  p: 2,
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'divider',
                  borderRadius: 3,
                  textAlign: 'center',
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 4,
                    borderColor: 'primary.main'
                  }
                }}
              >
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom sx={{ mb: 2 }}>
                  {sensor.sensor}
                </Typography>

                <Box sx={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                  <Box>
                    <Box sx={{ color: 'error.main', mb: 0.5, display: 'flex', justifyContent: 'center' }}>
                         <Thermometer size={24} />
                    </Box>
                    <Typography variant="h5" fontWeight="bold">
                      {sensor.temperature != null ? sensor.temperature.toFixed(1) : '--'}°C
                    </Typography>
                    <Typography variant="caption" color="text.secondary">Temp</Typography>
                  </Box>

                  <Divider orientation="vertical" flexItem variant="middle" />

                  <Box>
                    <Box sx={{ color: 'primary.main', mb: 0.5, display: 'flex', justifyContent: 'center' }}>
                         <Droplets size={24} />
                    </Box>
                    <Typography variant="h5" fontWeight="bold">
                      {sensor.humidity != null ? sensor.humidity.toFixed(0) : '--'}%
                    </Typography>
                    <Typography variant="caption" color="text.secondary">Humedad</Typography>
                  </Box>
                </Box>

                <Box sx={{ mt: 2, pt: 1, borderTop: '1px dashed', borderColor: 'divider' }}>
                     <Typography variant="caption" color="text.disabled">
                        Act: {sensor.lastUpdate ? new Date(sensor.lastUpdate).toLocaleTimeString() : '--:--'}
                    </Typography>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  )
}

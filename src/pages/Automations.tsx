// src/pages/Automations.tsx
import React from 'react'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'

const Automations: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 2 }}>Automatizaciones</Typography>
      <Paper sx={{ p: 3, borderRadius: 2 }}>
        <Typography variant="h6" sx={{ mb: 1 }}>Crear Nueva Automatización</Typography>
        <Typography color="text.secondary">
          Aquí podrás crear reglas para automatizar tus dispositivos. (Ej: SI la humedad es menor a 60%, ENTONCES encender humidificador).
        </Typography>
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="body1" color="text.secondary">Esta sección está en desarrollo.</Typography>
        </Box>
      </Paper>
    </Box>
  )
}

export default Automations

/**
 * CultivoSettingsTab - Crop stage and lighting schedule configuration
 */

import React from 'react';
import { Box, TextField, Button, Alert, Grid, Divider, Typography } from '@mui/material';
import { CropSteeringSettings } from '../../context/CropSteeringContext';

interface LightingSettings {
  onTime: string;
  offTime: string;
  mode: string;
}

interface CultivoSettingsTabProps {
  cropSettings: CropSteeringSettings;
  lightingSettings: LightingSettings;
  onCropChange: (update: Partial<CropSteeringSettings>) => void;
  onLightingChange: (settings: LightingSettings) => void;
}

const CultivoSettingsTab: React.FC<CultivoSettingsTabProps> = ({
  cropSettings,
  lightingSettings,
  onCropChange,
  onLightingChange
}) => {
  return (
    <Box sx={{ p: 3, maxWidth: 600 }}>
      <Typography variant="h6" gutterBottom>🌱 Etapa de Crecimiento</Typography>
      <Alert severity="info" sx={{ mb: 3 }}>
        Selecciona la etapa actual de tu cultivo para ver los rangos ideales de temperatura, humedad y VPD en los widgets.
      </Alert>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={6}>
          <TextField
            label="Fecha Inicio (Vegetativo)"
            type="date"
            fullWidth
            value={cropSettings.growStartDate || ''}
            onChange={e => onCropChange({ growStartDate: e.target.value })}
            InputLabelProps={{ shrink: true }}
            helperText="Día 0 de Vegetativo"
          />
        </Grid>
        <Grid item xs={6}>
          <TextField
            label="Fecha Flip (Floración)"
            type="date"
            fullWidth
            value={cropSettings.flipDate || ''}
            onChange={e => onCropChange({ flipDate: e.target.value })}
            InputLabelProps={{ shrink: true }}
            helperText="Inicio ciclo 12/12"
          />
        </Grid>
      </Grid>

      <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
        {['veg', 'flower', 'none'].map(stage => (
          <Button
            key={stage}
            variant={cropSettings.currentStage?.startsWith(stage) ? 'contained' : 'outlined'}
            onClick={() => onCropChange({ currentStage: (stage === 'veg' ? 'veg_early' : stage === 'flower' ? 'flower_early' : 'veg_early') as any })}
            sx={{ flex: 1, py: 1.5 }}
            color={stage === 'veg' ? 'success' : stage === 'flower' ? 'secondary' : 'inherit'}
          >
            {stage === 'veg' ? '🌿 Vegetación' : stage === 'flower' ? '🌸 Floración' : '❌ Sin Etapa'}
          </Button>
        ))}
      </Box>

      <Divider sx={{ my: 3 }} />

      <Typography variant="h6" gutterBottom>🌞 Fotoperiodo (Ciclo de Luz)</Typography>
      <Alert severity="info" sx={{ mb: 3 }}>
        Configura el horario de encendido y apagado de las luces para visualizar el ciclo Día/Noche en las gráficas.
      </Alert>

      <Grid container spacing={3}>
        <Grid item xs={6}>
          <TextField
            label="Hora Encendido (Lights On)"
            type="time"
            fullWidth
            value={lightingSettings.onTime}
            onChange={e => onLightingChange({ ...lightingSettings, onTime: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
        <Grid item xs={6}>
          <TextField
            label="Hora Apagado (Lights Off)"
            type="time"
            fullWidth
            value={lightingSettings.offTime}
            onChange={e => onLightingChange({ ...lightingSettings, offTime: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />
        </Grid>
      </Grid>

      <Divider sx={{ my: 3 }} />

      <Typography variant="h6" gutterBottom>💧 Parámetros de Riego</Typography>
      <Grid container spacing={3}>
        <Grid item xs={6}>
          <TextField
            label="Tamaño Maceta (L)"
            type="number"
            fullWidth
            value={cropSettings.potSizeLiters || 11}
            onChange={e => onCropChange({ potSizeLiters: parseFloat(e.target.value) || 11 })}
            helperText="Litros de sustrato"
          />
        </Grid>
        <Grid item xs={6}>
          <TextField
            label="Caudal Bomba (ml/min)"
            type="number"
            fullWidth
            value={cropSettings.pumpRateMlPerMin || 60}
            onChange={e => onCropChange({ pumpRateMlPerMin: parseFloat(e.target.value) || 60 })}
            helperText="Velocidad de entrega"
          />
        </Grid>
      </Grid>
    </Box>
  );
};

export default CultivoSettingsTab;

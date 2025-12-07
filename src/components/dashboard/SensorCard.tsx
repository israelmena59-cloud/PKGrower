// src/components/dashboard/SensorCard.tsx
import React from 'react';
import Box from '@mui/material/Box'
import Avatar from '@mui/material/Avatar'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'

interface SensorCardProps {
  icon: React.ReactNode;
  name: string;
  value: string | number;
  unit: string;
  className?: string;
}

const SensorCard: React.FC<SensorCardProps> = ({ icon, name, value, unit }) => {
  return (
    <Paper elevation={1} sx={{ display: 'flex', alignItems: 'center', p: 2 }}>
      <Avatar sx={{ bgcolor: 'background.default', mr: 2 }}>{icon}</Avatar>
      <Box>
        <Typography variant="subtitle2" color="text.secondary">{name}</Typography>
        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
          {value} <Typography component="span" variant="subtitle1" sx={{ ml: 1 }}>{unit}</Typography>
        </Typography>
      </Box>
    </Paper>
  )
}

export default SensorCard;
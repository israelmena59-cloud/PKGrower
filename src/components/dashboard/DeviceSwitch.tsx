// src/components/dashboard/DeviceSwitch.tsx
import React from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import Paper from '@mui/material/Paper'
import FormControlLabel from '@mui/material/FormControlLabel'
import MuiSwitch from '@mui/material/Switch'

interface DeviceSwitchProps {
  icon: React.ReactNode
  name: string
  isOn: boolean
  onToggle: () => void
}

const DeviceSwitch: React.FC<DeviceSwitchProps> = ({ icon, name, isOn, onToggle }) => {
  return (
    <Paper elevation={1} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 2 }}>
      <Box sx={{ mb: 1 }}>{icon}</Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1, textAlign: 'center' }}>{name}</Typography>
      <FormControlLabel
        control={<MuiSwitch checked={isOn} onChange={onToggle} />}
        label=""
      />
    </Paper>
  )
}

export default DeviceSwitch
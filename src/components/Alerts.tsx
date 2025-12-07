// src/components/Alerts.tsx
import React from 'react'
import MuiAlert from '@mui/material/Alert'
import Stack from '@mui/material/Stack'
import IconButton from '@mui/material/IconButton'
import CloseIcon from '@mui/icons-material/Close'

export interface Alert {
  id: number
  message: string
  type: 'info' | 'warning' | 'error'
}

interface AlertsProps {
  alerts: Alert[]
  onDismiss: (id: number) => void
}

const Alerts: React.FC<AlertsProps> = ({ alerts, onDismiss }) => {
  if (alerts.length === 0) return null

  return (
    <Stack spacing={1} sx={{ position: 'fixed', top: 16, right: 16, width: 320, zIndex: 1400 }}>
      {alerts.map(alert => (
        <MuiAlert
          key={alert.id}
          severity={alert.type === 'error' ? 'error' : alert.type === 'warning' ? 'warning' : 'info'}
          action={
            <IconButton aria-label="close" color="inherit" size="small" onClick={() => onDismiss(alert.id)}>
              <CloseIcon fontSize="inherit" />
            </IconButton>
          }
        >
          {alert.message}
        </MuiAlert>
      ))}
    </Stack>
  )
}

export default Alerts

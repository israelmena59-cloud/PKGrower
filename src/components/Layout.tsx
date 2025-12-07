// src/components/Layout.tsx
import React, { useState, useEffect } from 'react';
import Alerts, { Alert } from './Alerts';
import { Button } from '@/components/ui/button';
import Box from '@mui/material/Box'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'

// Define the type for the pages
export type Page = 'dashboard' | 'automations' | 'ai_assistant' | 'calendar' | 'devices' | 'settings';

interface LayoutProps {
  children: React.ReactNode;
  onNavigate: (page: Page) => void;
  activePage: Page;
}

const NavLink: React.FC<{
  page: Page;
  activePage: Page;
  onNavigate: (page: Page) => void;
  children: React.ReactNode;
}> = ({ page, activePage, onNavigate, children }) => {
  const isActive = page === activePage;
  return (
    <ListItem disablePadding>
      <Button
        variant={isActive ? 'secondary' : 'ghost'}
        onClick={() => onNavigate(page)}
        sx={{ justifyContent: 'flex-start', width: '100%' }}
      >
        {children}
      </Button>
    </ListItem>
  )
}

const Layout: React.FC<LayoutProps> = ({ children, onNavigate, activePage }) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  // Simulate adding an alert
  useEffect(() => {
    const timer = setTimeout(() => {
      addAlert({
        id: Date.now(),
        message: 'La temperatura ha superado el umbral recomendado.',
        type: 'warning',
      });
    }, 5000); // Add a warning after 5 seconds

    return () => clearTimeout(timer);
  }, []);
  
  const addAlert = (alert: Alert) => {
    setAlerts(prev => [...prev, alert]);
  };

  const dismissAlert = (id: number) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  };


  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      <Alerts alerts={alerts} onDismiss={dismissAlert} />

      <Box component="aside" sx={{ width: 256, bgcolor: 'background.paper', p: 2, boxShadow: 1, display: 'flex', flexDirection: 'column' }}>
        <Typography variant="h5" align="center" sx={{ mb: 2 }}>PKGrower</Typography>
        <Divider sx={{ mb: 2 }} />
        <nav>
          <List>
            <NavLink page="dashboard" activePage={activePage} onNavigate={onNavigate}>Dashboard</NavLink>
            <NavLink page="automations" activePage={activePage} onNavigate={onNavigate}>Automatizaciones</NavLink>
            <NavLink page="ai_assistant" activePage={activePage} onNavigate={onNavigate}>Asistente IA</NavLink>
            <NavLink page="calendar" activePage={activePage} onNavigate={onNavigate}>Calendario</NavLink>
          </List>
        </nav>
        <Box sx={{ mt: 'auto' }}>
          <List>
            <NavLink page="devices" activePage={activePage} onNavigate={onNavigate}>Dispositivos</NavLink>
            <NavLink page="settings" activePage={activePage} onNavigate={onNavigate}>Configuración</NavLink>
          </List>
        </Box>
      </Box>

      <Box component="main" sx={{ flex: 1, p: 3, overflow: 'auto' }}>
        {children}
      </Box>
    </Box>
  )
};

export default Layout;
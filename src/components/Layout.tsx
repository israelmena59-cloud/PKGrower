
// src/components/Layout.tsx
import React, { useState, useEffect } from 'react';
import RoomSelector from './navigation/RoomSelector';
import LiveStatusIndicator from './navigation/LiveStatusIndicator';
import Alerts, { Alert } from './Alerts';
import { Box, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Typography, Divider, GlobalStyles, Fade, IconButton, Tooltip, useMediaQuery, Drawer, AppBar, Toolbar } from '@mui/material';
import { LayoutDashboard, Zap, Droplets, Wind, Bot, Calendar, Settings, Camera, Cpu, Sun, Moon, Menu as MenuIcon, Leaf, Beaker } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useCropSteering } from '../context/CropSteeringContext';

const TimelineBadge = () => {
    const { daysVeg, daysFlower, daysIntoGrow, settings } = useCropSteering();
    const isFlower = !!settings.flipDate;

    return (
        <Box sx={{
            mt: 2,
            p: 1.5,
            borderRadius: '12px',
            background: isFlower
                ? 'linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(168, 85, 247, 0.1) 100%)'
                : 'linear-gradient(135deg, rgba(34, 197, 94, 0.2) 0%, rgba(34, 197, 94, 0.1) 100%)',
            border: isFlower ? '1px solid rgba(168, 85, 247, 0.3)' : '1px solid rgba(34, 197, 94, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
        }}>
            <Box>
                <Typography variant="caption" sx={{ color: isFlower ? '#e9d5ff' : '#dcfce7', fontWeight: 'bold', display: 'block' }}>
                    {isFlower ? '🌸 FLORACIÓN' : '🌿 VEGETATIVO'}
                </Typography>
                <Typography variant="body2" fontWeight="bold" sx={{ color: isFlower ? '#c084fc' : '#4ade80' }}>
                    {isFlower ? `Día ${daysFlower}` : `Día ${daysVeg}`}
                </Typography>
            </Box>
            <Box sx={{ textAlign: 'right' }}>
                 <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>Total</Typography>
                 <Typography variant="caption" fontWeight="bold">{daysIntoGrow} días</Typography>
            </Box>
        </Box>
    );
};

// Define the type for the pages
export type Page = 'dashboard' | 'lighting' | 'irrigation' | 'environment' | 'cropsteering' | 'nutrients' | 'ai_assistant' | 'calendar' | 'devices' | 'camera' | 'settings';

interface LayoutProps {
  children: React.ReactNode;
  onNavigate: (page: Page) => void;
  activePage: Page;
}

const Layout: React.FC<LayoutProps> = ({ children, onNavigate, activePage }) => {
  // Responsive Logic
  const { mode, toggleTheme } = useTheme();
  const isMobile = useMediaQuery('(max-width:960px)'); // MD breakpoint
  const [mobileOpen, setMobileOpen] = useState(false);
  const [alerts, setAlerts] = useState<Alert[]>([]);

  useEffect(() => {
    // Welcome alert
    const timer = setTimeout(() => {
      addAlert({
        id: Date.now(),
        message: 'Bienvenido a PKGrower 3.0 - Sistema "Symbiosis"',
        type: 'info',
      });
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  const addAlert = (alert: Alert) => {
    setAlerts(prev => [...prev, alert]);
  };

  const dismissAlert = (id: number) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  };

  const NavItem = ({ page, icon, label }: { page: Page, icon: React.ReactNode, label: string }) => {
    const isSelected = activePage === page;
    const isDark = mode === 'dark';

    return (
        <ListItem disablePadding sx={{ mb: 0.5, position: 'relative' }}>
          {/* Active Indicator Bar */}
          {isSelected && (
            <Box sx={{
              position: 'absolute',
              left: 0,
              top: '50%',
              transform: 'translateY(-50%)',
              width: 4,
              height: '60%',
              borderRadius: '0 4px 4px 0',
              background: 'linear-gradient(180deg, #22c55e, #16a34a)',
              boxShadow: '0 0 12px rgba(34, 197, 94, 0.5)'
            }} />
          )}
          <ListItemButton
            selected={isSelected}
            onClick={() => {
                onNavigate(page);
                if (isMobile) setMobileOpen(false);
            }}
            sx={{
              borderRadius: '12px',
              mx: 1.5,
              py: 1.2,
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              bgcolor: isSelected
                ? (isDark ? 'rgba(34, 197, 94, 0.15)' : 'rgba(34, 197, 94, 0.1)')
                : 'transparent',
              border: isSelected ? '1px solid rgba(34, 197, 94, 0.2)' : '1px solid transparent',
              '&:hover': {
                  bgcolor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)',
                  transform: 'translateX(4px)'
              },
            }}
          >
            <ListItemIcon sx={{
                minWidth: 36,
                color: isSelected ? '#22c55e' : (isDark ? 'rgba(255,255,255,0.5)' : 'text.secondary'),
                filter: isSelected ? 'drop-shadow(0 0 6px rgba(34, 197, 94, 0.4))' : 'none'
            }}>
              {icon}
            </ListItemIcon>
            <ListItemText
                primary={label}
                primaryTypographyProps={{
                    fontWeight: isSelected ? 600 : 500,
                    color: isSelected ? (isDark ? '#22c55e' : '#15803d') : (isDark ? 'rgba(255,255,255,0.7)' : 'text.secondary'),
                    fontSize: '0.9rem'
                }}
            />
          </ListItemButton>
        </ListItem>
    );
  };

  const SidebarContent = (
      <>
        <Box sx={{ p: 4, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box
                    component="img"
                    src="/logo.png"
                    alt="PKGrower Logo"
                    sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '12px',
                        boxShadow: '0 0 15px rgba(34, 197, 94, 0.4)',
                        objectFit: 'contain'
                    }}
                />
                <Box>
                    <Typography variant="h6" fontWeight="800" sx={{ color: mode === 'dark' ? 'white' : 'text.primary', letterSpacing: 0.5 }}>PKGrower</Typography>
                    <Typography variant="caption" sx={{ color: mode === 'dark' ? 'rgba(255,255,255,0.5)' : 'text.secondary', letterSpacing: 1 }}>SYMBIOSIS OS</Typography>
                </Box>
            </Box>

            {!isMobile && (
                <Tooltip title={mode === 'dark' ? 'Cambiar a Modo Claro' : 'Cambiar a Modo Oscuro'}>
                    <IconButton onClick={toggleTheme} size="small" sx={{ color: mode === 'dark' ? 'white' : 'text.primary' }}>
                        {mode === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                    </IconButton>
                </Tooltip>
            )}
        </Box>

        <Box sx={{ flex: 1, overflowY: 'auto', py: 2 }}>
            {/* Room Selector */}
            <Box sx={{ px: 3, mb: 3 }}>
                <RoomSelector />
                {/* Timeline Badge */}
                <TimelineBadge />
                {/* Live Status Indicator */}
                <Box sx={{ mt: 2 }}>
                    <LiveStatusIndicator />
                </Box>
            </Box>

            {/* MAIN SECTIONS - Consolidated */}
            <Typography variant="caption" sx={{ px: 4, mb: 1, display: 'block', fontWeight: 'bold', color: mode === 'dark' ? 'rgba(255,255,255,0.4)' : 'text.disabled', letterSpacing: 1 }}>PRINCIPAL</Typography>
            <List component="nav">
                <NavItem page="dashboard" icon={<LayoutDashboard size={20} />} label="Inicio" />
                <NavItem page="cropsteering" icon={<Leaf size={20} />} label="Cultivo" />
                <NavItem page="irrigation" icon={<Droplets size={20} />} label="Riego" />
                <NavItem page="environment" icon={<Wind size={20} />} label="Ambiente" />
                <NavItem page="nutrients" icon={<Beaker size={20} />} label="Nutrientes" />
                <NavItem page="lighting" icon={<Zap size={20} />} label="Iluminación" />
                <NavItem page="calendar" icon={<Calendar size={20} />} label="Gestión" />
                <NavItem page="devices" icon={<Cpu size={20} />} label="Dispositivos" />
            </List>

            <Divider sx={{ my: 2, borderColor: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)', mx: 3 }} />

            <Typography variant="caption" sx={{ px: 4, mb: 1, display: 'block', fontWeight: 'bold', color: mode === 'dark' ? 'rgba(255,255,255,0.4)' : 'text.disabled', letterSpacing: 1 }}>SISTEMA</Typography>
            <List component="nav">
                <NavItem page="ai_assistant" icon={<Bot size={20} />} label="Copiloto IA" />
                <NavItem page="camera" icon={<Camera size={20} />} label="Visión" />
                <NavItem page="settings" icon={<Settings size={20} />} label="Configuración" />
            </List>
        </Box>
      </>
  );

  return (
    <Box sx={{ display: 'flex', height: '100vh', overflow: 'hidden', position: 'relative' }}>

      {/* GLOBAL ANIMATED BACKGROUND - DYNAMIC */}
      <GlobalStyles styles={{
        '@keyframes floating': {
            '0%': { transform: 'translate(0, 0) rotate(0deg)' },
            '50%': { transform: 'translate(20px, 40px) rotate(5deg)' },
            '100%': { transform: 'translate(0, 0) rotate(0deg)' },
        },
        '@keyframes gradient': {
            '0%': { backgroundPosition: '0% 50%' },
            '50%': { backgroundPosition: '100% 50%' },
            '100%': { backgroundPosition: '0% 50%' },
        },
        body: {
            background: mode === 'dark'
                ? 'linear-gradient(-45deg, #0f172a, #111827, #064e3b, #1e1b4b)'
                : 'linear-gradient(-45deg, #f0f9ff, #ecfccb, #e0f2fe, #dbeafe)',
            backgroundSize: '400% 400%',
            animation: 'gradient 30s ease infinite',
            overflow: 'hidden'
        }
      }} />

      <Alerts alerts={alerts} onDismiss={dismissAlert} />

      {/* MOBILE APP BAR */}
      {isMobile && (
          <AppBar position="fixed" elevation={0} sx={{ bgcolor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)', top: 0, left: 0, right: 0, zIndex: 1200 }}>
              <Toolbar>
                  <IconButton
                      color="inherit"
                      aria-label="open drawer"
                      edge="start"
                      onClick={handleDrawerToggle}
                      sx={{ mr: 2 }}
                  >
                      <MenuIcon />
                  </IconButton>
                  <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
                      PKGrower
                  </Typography>
                  <IconButton onClick={toggleTheme} color="inherit">
                      {mode === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
                  </IconButton>
              </Toolbar>
          </AppBar>
      )}

      {/* RESPONSIVE NAVIGATION */}
      <Box
        component="nav"
        sx={{ width: { md: 300 }, flexShrink: { md: 0 } }}
        aria-label="mailbox folders"
      >
          {/* Mobile Drawer */}
          {isMobile ? (
              <Drawer
                  variant="temporary"
                  open={mobileOpen}
                  onClose={handleDrawerToggle}
                  ModalProps={{ keepMounted: true }} // Better open performance on mobile.
                  sx={{
                      '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 280, bgcolor: mode === 'dark' ? '#0f172a' : '#fff' },
                  }}
              >
                  {SidebarContent}
              </Drawer>
          ) : (
              /* Desktop Persistent Sidebar (Liquid Floating Island) */
              <Box
                component="aside"
                sx={{
                    width: 280,
                    m: 3,
                    height: 'calc(100vh - 48px)',
                    borderRadius: 'var(--squircle-radius)',
                    bgcolor: 'var(--glass-bg)',
                    backdropFilter: 'var(--backdrop-blur)',
                    border: 'var(--glass-border)',
                    boxShadow: 'var(--glass-shadow)',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden',
                    transition: 'all 0.5s cubic-bezier(0.25, 1, 0.5, 1)',
                    position: 'relative',
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0, left: 0, right: 0, height: '200px',
                        background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, transparent 100%)',
                        pointerEvents: 'none'
                    }
                }}
              >
                  {SidebarContent}
              </Box>
          )}
      </Box>

      {/* MAIN CONTENT AREA */}
      <Box component="main" sx={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden', position: 'relative', pt: isMobile ? 8 : 0 }}>

        {/* Dynamic Glowing Orbs Background (Only in Dark Mode for effect, or subtle in Light) */}
        {mode === 'dark' && (
            <>
                <Box sx={{
                    position: 'absolute', width: '600px', height: '600px', borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(34,197,94,0.15) 0%, rgba(0,0,0,0) 70%)',
                    top: '-20%', left: '10%', filter: 'blur(60px)',
                    animation: 'floating 10s ease-in-out infinite'
                }} />
                <Box sx={{
                    position: 'absolute', width: '500px', height: '500px', borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(168,85,247,0.15) 0%, rgba(0,0,0,0) 70%)',
                    bottom: '-10%', right: '10%', filter: 'blur(60px)',
                    animation: 'floating 14s ease-in-out infinite reverse'
                }} />
            </>
        )}

        <Box sx={{ flex: 1, overflow: 'auto', p: isMobile ? 2 : 3, position: 'relative', zIndex: 1 }}>
            <Fade in={true} timeout={500}>
                <Box>
                    {children}
                </Box>
            </Fade>
        </Box>
      </Box>
    </Box>
  )
};

export default Layout;

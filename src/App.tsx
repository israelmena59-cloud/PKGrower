import { useState, Suspense, lazy } from 'react';
import Layout, { Page } from './components/Layout';
import DebugOverlay from './components/DebugOverlay';
import { ThemeProvider } from './context/ThemeContext';
import { CropSteeringProvider } from './context/CropSteeringContext';
import { Box, CircularProgress } from '@mui/material';
import { ErrorBoundary } from './components/ErrorBoundary';

// Lazy Load Pages
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Lighting = lazy(() => import('./pages/Lighting'));
const Irrigation = lazy(() => import('./pages/Irrigation'));
const Environment = lazy(() => import('./pages/Environment'));
const AIAssistant = lazy(() => import('./pages/AIAssistant'));
const Calendar = lazy(() => import('./pages/Calendar'));
const Devices = lazy(() => import('./pages/Devices'));
const Camera = lazy(() => import('./pages/Camera'));
const Settings = lazy(() => import('./pages/Settings'));
const CropSteering = lazy(() => import('./pages/CropSteering'));

function AppContent() {
  const [activePage, setActivePage] = useState<Page>('dashboard');

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <Dashboard />;
      case 'lighting': return <Lighting />;
      case 'irrigation': return <Irrigation />;
      case 'environment': return <Environment />;
      case 'cropsteering': return <CropSteering />;
      case 'ai_assistant': return <AIAssistant />;
      case 'calendar': return <Calendar />;
      case 'devices': return <Devices />;
      case 'camera': return <Camera />;
      case 'settings': return <Settings />;
      default: return <div>Pagina no encontrada</div>;
    }
  };

  return (
    <Layout activePage={activePage} onNavigate={setActivePage}>
      <ErrorBoundary>
        <Suspense fallback={
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', minHeight: 400 }}>
            <CircularProgress color="secondary" />
          </Box>
        }>
          {renderPage()}
        </Suspense>
      </ErrorBoundary>
    </Layout>
  );
}

function App() {
  return (
    <ThemeProvider>
      <CropSteeringProvider>
        <DebugOverlay />
        <AppContent />
      </CropSteeringProvider>
    </ThemeProvider>
  );
}

export default App;


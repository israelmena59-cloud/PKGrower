// src/App.tsx
import { useState } from 'react';
import Layout, { Page } from './components/Layout';
import Dashboard from './pages/Dashboard';
import Lighting from './pages/Lighting';
import Irrigation from './pages/Irrigation';
import Environment from './pages/Environment';
import AIAssistant from './pages/AIAssistant';
import Calendar from './pages/Calendar';
import Devices from './pages/Devices';
import Camera from './pages/Camera';
import Settings from './pages/Settings';
import { ThemeProvider } from './context/ThemeContext';

function AppContent() {
  const [activePage, setActivePage] = useState<Page>('dashboard');

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard />;
      case 'lighting':
        return <Lighting />;
      case 'irrigation':
        return <Irrigation />;
      case 'environment':
        return <Environment />;
      case 'ai_assistant':
        return <AIAssistant />;
      case 'calendar':
        return <Calendar />;
      case 'devices':
        return <Devices />;
      case 'camera':
        return <Camera />;
      case 'settings':
        return <Settings />;
      default:
        return <div>Pagina no encontrada</div>;
    }
  };

  return (
    <Layout activePage={activePage} onNavigate={setActivePage}>
      {renderPage()}
    </Layout>
  );
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

export default App;

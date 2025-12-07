// src/App.tsx
import { useState } from 'react';
import Layout, { Page } from './components/Layout';
import Dashboard from './pages/Dashboard';
import Automations from './pages/Automations';
import AIAssistant from './pages/AIAssistant';
// Import other pages as they are created

function App() {
  const [activePage, setActivePage] = useState<Page>('dashboard');

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':
        return <Dashboard />;
      case 'automations':
        return <Automations />;
      case 'ai_assistant':
        return <AIAssistant />;
      // Add other cases here for other pages
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

export default App;

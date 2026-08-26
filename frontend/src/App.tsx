import { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar, { type NavTab } from './components/Sidebar';
import GeneratorPage from './pages/GeneratorPage';
import DashboardPage from './pages/DashboardPage';
import SettingsPage from './pages/SettingsPage';
import StudentsPage from './pages/StudentsPage';

function AppContent() {
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-slate-50 flex font-sans text-slate-800">
        <Sidebar activeTab={activeTab} onSelectTab={setActiveTab} />

        <main className="flex-1 flex flex-col h-screen overflow-hidden">
          <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-7xl mx-auto">
              {activeTab === 'generator' && <GeneratorPage />}
              {activeTab === 'dashboard' && <DashboardPage />}
              {activeTab === 'students' && <StudentsPage />}
              {activeTab === 'settings' && <SettingsPage />}
            </div>
          </div>
        </main>
      </div>
    </ProtectedRoute>
  );
}

export function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;

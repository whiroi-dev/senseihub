import { useAuth } from '../context/useAuth';

export type NavTab = 'generator' | 'dashboard' | 'settings' | 'students';

interface NavbarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const Navbar = ({ activeTab, onSelectTab }: NavbarProps) => {
  const { user, logout } = useAuth();

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-red-700 text-white rounded-lg flex items-center justify-center text-xl font-bold shadow border border-amber-400">
              🥋
            </div>
            <div>
              <span className="font-bold text-gray-900 text-lg leading-tight block">
                Kenshi-kai
              </span>
              <span className="text-xs text-gray-500 font-medium hidden sm:block">
                Gerador de Certificados
              </span>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex space-x-1 sm:space-x-2">
            <button
              onClick={() => onSelectTab('generator')}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'generator'
                  ? 'bg-red-700 text-white shadow-sm'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span>📜</span>
              <span>Emissão</span>
            </button>
            <button
              onClick={() => onSelectTab('dashboard')}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'dashboard'
                  ? 'bg-red-700 text-white shadow-sm'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span>📊</span>
              <span>Dashboard</span>
            </button>
            <button
              onClick={() => onSelectTab('students')}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'students'
                  ? 'bg-red-700 text-white shadow-sm'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span>👥</span>
              <span>Alunos</span>
            </button>
            <button
              onClick={() => onSelectTab('settings')}
              className={`px-3 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer flex items-center space-x-1.5 ${
                activeTab === 'settings'
                  ? 'bg-red-700 text-white shadow-sm'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
            >
              <span>⚙️</span>
              <span>Logo & Config</span>
            </button>
          </nav>

          {/* Profile and Logout */}
          <div className="flex items-center space-x-3">
            {user && (
              <div className="hidden md:flex flex-col text-right">
                <span className="text-sm font-bold text-gray-800">
                  {user.name}
                </span>
                <span className="text-xs text-gray-500">
                  {user.email}
                </span>
              </div>
            )}
            <button
              onClick={logout}
              title="Encerrar sessão"
              className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-semibold text-gray-700 bg-white hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-colors shadow-sm cursor-pointer"
            >
              <span className="mr-1">🚪</span>
              Sair
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;

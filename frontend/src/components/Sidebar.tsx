import { useAuth } from '../context/useAuth';

export type NavTab = 'generator' | 'dashboard' | 'settings' | 'students';

interface SidebarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const Sidebar = ({ activeTab, onSelectTab }: SidebarProps) => {
  const { user, logout } = useAuth();

  const tabs = [
    { id: 'dashboard', icon: '📊', label: 'Painel Geral' },
    { id: 'students', icon: '👥', label: 'Gestão de Alunos' },
    { id: 'generator', icon: '📜', label: 'Emissão de Diplomas' },
    { id: 'settings', icon: '⚙️', label: 'Configurações' },
  ] as const;

  return (
    <aside className="w-72 bg-slate-900 min-h-screen flex flex-col shadow-2xl text-slate-300">
      <div className="h-20 flex items-center px-6 border-b border-slate-800 bg-slate-950/50">
        <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-800 text-white rounded-lg flex items-center justify-center text-xl font-bold shadow-lg border border-red-500/30">
          拳
        </div>
        <div className="ml-3">
          <span className="font-bold text-white text-lg tracking-wide block">
            Kenshi-kai
          </span>
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">
            Gestão de Dojo
          </span>
        </div>
      </div>

      <div className="flex-1 py-8 px-4 space-y-2">
        <div className="px-3 mb-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Menu Principal
        </div>
        <nav className="space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id as NavTab)}
              className={`w-full flex items-center px-4 py-3 rounded-xl transition-all duration-200 cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-red-600/10 text-red-500 border border-red-500/20 shadow-inner'
                  : 'hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span className="text-xl mr-3 opacity-90">{tab.icon}</span>
              <span className="font-medium text-sm">{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="p-4 border-t border-slate-800 bg-slate-950/30">
        {user && (
          <div className="flex items-center px-3 py-3 mb-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold uppercase">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="ml-3 flex-1 overflow-hidden">
              <p className="text-sm font-semibold text-white truncate">{user.name}</p>
              <p className="text-xs text-slate-400 truncate">{user.email}</p>
            </div>
          </div>
        )}
        <button
          onClick={logout}
          className="w-full flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-semibold text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-colors cursor-pointer border border-transparent hover:border-red-500/20"
        >
          <span className="mr-2">🚪</span> Encerrar Sessão
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;

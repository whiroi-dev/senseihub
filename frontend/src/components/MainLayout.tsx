import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useMemo } from 'react';

type Role = 'ADMIN' | 'PROFESSOR' | 'ALUNO';

const getUserRole = (): Role | null => {
  const token = localStorage.getItem('jwt_token');
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.role as Role;
  } catch {
    return null;
  }
};

export const MainLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const role = getUserRole();

  const handleLogout = () => {
    localStorage.removeItem('jwt_token');
    navigate('/login');
  };

  const navItems = useMemo(() => {
    const items = [
      { name: 'Alunos', path: '/alunos', icon: '🥋', allowedRoles: ['ADMIN', 'PROFESSOR'] },
      { name: 'Graduações', path: '/graduacoes', icon: '⭐', allowedRoles: ['ADMIN'] },
      { name: 'Frequência', path: '/frequencia', icon: '📅', allowedRoles: ['ADMIN', 'PROFESSOR'] },
      { name: 'Certificados', path: '/certificados', icon: '🏅', allowedRoles: ['ADMIN', 'PROFESSOR'] },
      { name: 'Configurações', path: '/configuracoes', icon: '⚙️', allowedRoles: ['ADMIN'] },
      { name: 'Meu Perfil', path: '/meu-perfil', icon: '👤', allowedRoles: ['ADMIN', 'PROFESSOR', 'ALUNO'] },
    ];
    // Filtra os itens do menu baseando-se no papel do usuário
    return items.filter(item => role && item.allowedRoles.includes(role));
  }, [role]);

  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 font-sans">
      
      {/* Sidebar Lateral */}
      <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col shadow-2xl">
        <div className="p-6 border-b border-slate-800 flex items-center gap-3">
          <div className="w-8 h-8 bg-red-600 rounded-full flex items-center justify-center font-bold">
            S
          </div>
          <h1 className="text-xl font-bold tracking-wider uppercase text-slate-200">
            SenseiHub
          </h1>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
                  isActive 
                    ? 'bg-red-600/10 text-red-500 border border-red-500/20' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                }`}
              >
                <span>{item.icon}</span>
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-red-400 hover:bg-red-900/10 rounded-lg transition-colors"
          >
            <span>🚪</span>
            <span className="font-medium">Sair do Sistema</span>
          </button>
        </div>
      </aside>

      {/* Conteúdo Dinâmico */}
      <main className="flex-1 flex flex-col overflow-hidden bg-slate-900">
        <header className="h-16 border-b border-slate-800 flex items-center px-8 bg-slate-900/50 backdrop-blur-sm">
          <h2 className="text-lg font-semibold text-slate-300">Painel de Controle</h2>
        </header>
        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-7xl mx-auto">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

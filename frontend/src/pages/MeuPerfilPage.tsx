

type Role = 'ADMIN' | 'PROFESSOR' | 'ALUNO';

interface JwtPayload {
  userId: string;
  role: Role;
}

const getJwtData = (): JwtPayload | null => {
  const token = localStorage.getItem('jwt_token');
  if (!token) return null;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload as JwtPayload;
  } catch {
    return null;
  }
};

export const MeuPerfilPage = () => {
  const data = getJwtData();

  return (
    <div className="bg-slate-950 p-8 rounded-xl border border-slate-800 shadow-xl max-w-2xl text-slate-100">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center font-bold text-3xl shadow-lg">
          🥋
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bem-vindo ao SenseiHub</h1>
          <p className="text-slate-400">Sistema Enterprise de Gestão e Certificação</p>
        </div>
      </div>
      
      <div className="space-y-4 bg-slate-900 p-6 rounded-lg border border-slate-800">
        <div>
          <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Nível de Acesso (Role)</span>
          <span className="inline-block bg-red-900/40 text-red-400 px-3 py-1 rounded-full text-sm font-bold border border-red-800/50">
            {data?.role || 'DESCONHECIDO'}
          </span>
        </div>
        
        <div>
          <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">ID do Usuário</span>
          <code className="text-slate-300 font-mono text-sm bg-slate-800 px-3 py-1.5 rounded block">
            {data?.userId || 'N/A'}
          </code>
        </div>
      </div>
    </div>
  );
};

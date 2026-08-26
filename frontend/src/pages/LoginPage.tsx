import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../services/api';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    
    try {
      const response = await api.post('/auth/login', { email, password });
      localStorage.setItem('jwt_token', response.data.token);
      navigate('/');
    } catch (err: any) {
      // Exibe detalhes completos do erro para ajudar a debugar
      const backendError = err.response?.data?.error;
      const status = err.response?.status;
      const url = err.config?.baseURL + err.config?.url;
      
      setError(
        backendError || 
        `Erro de Conexão. Status: ${status || 'Nenhum'}. URL: ${url}. Detalhe: ${err.message}`
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-slate-950 p-8 rounded-xl border border-slate-800 shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center font-bold text-2xl text-white mx-auto mb-4 shadow-lg shadow-red-600/20">
            S
          </div>
          <h1 className="text-2xl font-bold text-slate-100 uppercase tracking-widest">SenseiHub</h1>
          <p className="text-slate-400 mt-2">Faça login para acessar o sistema</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-900/50 border border-red-500 text-red-200 rounded-lg text-sm text-center break-words">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">E-mail de Acesso</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-slate-200 px-4 py-3 rounded-lg focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
              placeholder="admin@senseihub.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-400 mb-2">Senha</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 text-slate-200 px-4 py-3 rounded-lg focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500 transition-colors"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold py-3 rounded-lg transition-colors shadow-lg shadow-red-600/20"
          >
            {isLoading ? 'Autenticando...' : 'Entrar no Sistema'}
          </button>
        </form>
      </div>
    </div>
  );
};

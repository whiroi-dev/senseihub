import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { MainLayout } from '../components/MainLayout';
import { AlunosPage } from '../pages/AlunosPage';
import { GraduacoesPage } from '../pages/GraduacoesPage';
import { CertificadosPage } from '../pages/CertificadosPage';
import { FrequenciaPage } from '../pages/FrequenciaPage';
import { LoginPage } from '../pages/LoginPage';
import { MeuPerfilPage } from '../pages/MeuPerfilPage';
import { ConfiguracoesPage } from '../pages/ConfiguracoesPage';

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

const ProtectedRoute = ({ allowedRoles }: { allowedRoles?: Role[] }) => {
  const token = localStorage.getItem('jwt_token');
  const role = getUserRole();

  if (!token || !role) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(role)) return <Navigate to="/unauthorized" replace />;

  return <Outlet />;
};

export const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/unauthorized" element={<div className="min-h-screen bg-slate-900 flex items-center justify-center text-red-500 font-bold text-2xl">Acesso Negado 403</div>} />

        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            
            <Route path="/meu-perfil" element={<MeuPerfilPage />} />
            <Route path="/" element={<Navigate to="/meu-perfil" replace />} />

            <Route element={<ProtectedRoute allowedRoles={['ADMIN', 'PROFESSOR']} />}>
              <Route path="/alunos" element={<AlunosPage />} />
              <Route path="/certificados" element={<CertificadosPage />} />
              <Route path="/frequencia" element={<FrequenciaPage />} />
            </Route>

            <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
              <Route path="/graduacoes" element={<GraduacoesPage />} />
              <Route path="/configuracoes" element={<ConfiguracoesPage />} />
            </Route>

          </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

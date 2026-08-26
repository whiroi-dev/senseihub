import React, { useEffect, useState } from 'react';
import { dashboardApi, ApiError } from '../services/api';
import type { DashboardStats } from '../types';

export const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    dashboardApi.getStats()
      .then((data) => {
        if (isMounted) {
          setStats(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error('Error fetching dashboard stats:', err);
          setError(err instanceof ApiError ? err.message : 'Não foi possível carregar as métricas.');
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const fetchStats = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await dashboardApi.getStats();
      setStats(data);
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      const msg = err instanceof ApiError ? err.message : 'Não foi possível carregar as métricas.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };


  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return isNaN(d.getTime()) ? dateStr : d.toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-4 border-b border-gray-200 gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <span>📊</span> Painel de Estatísticas
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Visão consolidada de graduações, alunos e distribuição de faixas.
          </p>
        </div>
        <button
          onClick={fetchStats}
          disabled={isLoading}
          className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded-xl text-sm font-semibold text-gray-700 hover:bg-gray-50 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
        >
          <span className={`mr-2 ${isLoading ? 'animate-spin' : ''}`}>🔄</span>
          Atualizar Dados
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>❌</span>
            <span>{error}</span>
          </div>
          <button
            onClick={fetchStats}
            className="text-xs font-bold underline hover:text-red-900 cursor-pointer"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {isLoading && !stats ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-white rounded-2xl p-6 border border-gray-100 shadow-sm animate-pulse flex flex-col justify-between">
              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
              <div className="h-8 bg-gray-200 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : stats ? (
        <>
          {/* KPI Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-500">Total de Certificados</span>
                <span className="p-2.5 bg-red-50 text-red-600 rounded-xl text-lg font-bold">📜</span>
              </div>
              <p className="text-3xl font-extrabold text-gray-900 mt-4">
                {stats.totalCertificates}
              </p>
              <p className="text-xs text-gray-400 mt-1">Documentos oficiais emitidos</p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-500">Total de Alunos</span>
                <span className="p-2.5 bg-blue-50 text-blue-600 rounded-xl text-lg font-bold">🥋</span>
              </div>
              <p className="text-3xl font-extrabold text-gray-900 mt-4">
                {stats.totalStudents}
              </p>
              <p className="text-xs text-gray-400 mt-1">Praticantes cadastrados</p>
            </div>

            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-gray-500">Graduações Distintas</span>
                <span className="p-2.5 bg-amber-50 text-amber-600 rounded-xl text-lg font-bold">🏆</span>
              </div>
              <p className="text-3xl font-extrabold text-gray-900 mt-4">
                {stats.rankDistribution?.length || 0}
              </p>
              <p className="text-xs text-gray-400 mt-1">Níveis de faixas representados</p>
            </div>
          </div>

          {/* Belt Distribution Visualization */}
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <span>🥋</span> Distribuição por Faixas de Karatê
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Proporção de praticantes por graduação
                </p>
              </div>
            </div>

            {stats.rankDistribution && stats.rankDistribution.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {stats.rankDistribution.map((item) => {
                  const percentage = stats.totalStudents > 0
                    ? Math.round((item.count / stats.totalStudents) * 100)
                    : 0;
                  return (
                    <div
                      key={item.rank}
                      className="p-4 rounded-xl border border-gray-200 bg-gray-50/50 hover:bg-gray-50 transition-colors flex flex-col justify-between space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2.5">
                          <span
                            className="w-4 h-4 rounded-full border border-gray-300 shadow-xs inline-block shrink-0"
                            style={{ backgroundColor: item.color }}
                          />
                          <span className="font-semibold text-sm text-gray-800 line-clamp-1">
                            {item.rank}
                          </span>
                        </div>
                        <span className="text-xs font-bold px-2 py-0.5 bg-white border border-gray-200 rounded-md text-gray-700">
                          {item.count} {item.count === 1 ? 'aluno' : 'alunos'}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: item.color === '#F3F4F6' ? '#9CA3AF' : item.color,
                            }}
                          />
                        </div>
                        <div className="text-right text-[10px] font-medium text-gray-400">
                          {percentage}% do total
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-10 text-gray-400 text-sm">
                Nenhum aluno registrado até o momento.
              </div>
            )}
          </div>

          {/* Recent Certificates History */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-6 pb-4 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <span>⏱️</span> Histórico de Emissões Recentes
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Últimos certificados gerados pelo sistema
              </p>
            </div>

            {stats.recentCertificates && stats.recentCertificates.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50 text-xs uppercase font-semibold text-gray-500 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-3.5">ID</th>
                      <th className="px-6 py-3.5">Aluno</th>
                      <th className="px-6 py-3.5">Graduação</th>
                      <th className="px-6 py-3.5">Associação</th>
                      <th className="px-6 py-3.5">Data de Emissão</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {stats.recentCertificates.map((cert) => (
                      <tr key={cert.id} className="hover:bg-gray-50/80 transition-colors">
                        <td className="px-6 py-4 font-mono text-xs text-gray-400">#{cert.id}</td>
                        <td className="px-6 py-4 font-semibold text-gray-900">{cert.studentName}</td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-100">
                            {cert.rank}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-gray-600">{cert.associationName}</td>
                        <td className="px-6 py-4 text-xs text-gray-500">{formatDate(cert.issueDate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400 text-sm">
                Nenhum certificado emitido recentemente.
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
};

export default DashboardPage;

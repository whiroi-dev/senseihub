import { useState, useEffect } from 'react';
import { studentApi } from '../services/api';
import type { StudentRecord } from '../services/api';
import { ranksList, type RankKey } from '../types';

const StudentsPage = () => {
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentRank, setNewStudentRank] = useState<RankKey>(ranksList[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedStudent, setSelectedStudent] = useState<StudentRecord | null>(null);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const data = await studentApi.list();
      setStudents(data);
    } catch (err) {
      setError('Erro ao carregar lista de alunos.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;
    
    setIsSubmitting(true);
    try {
      await studentApi.create({ name: newStudentName.trim(), rank: newStudentRank });
      setIsModalOpen(false);
      setNewStudentName('');
      setNewStudentRank(ranksList[0]);
      await loadStudents();
    } catch (err) {
      console.error(err);
      alert('Erro ao cadastrar aluno.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR');
  };

  const getRankColor = (rank: string) => {
    const r = rank.toLowerCase();
    if (r.includes('branca')) return 'bg-slate-200 text-slate-800 border-slate-300';
    if (r.includes('amarela')) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (r.includes('laranja')) return 'bg-orange-100 text-orange-800 border-orange-300';
    if (r.includes('azul')) return 'bg-blue-100 text-blue-800 border-blue-300';
    if (r.includes('verde')) return 'bg-green-100 text-green-800 border-green-300';
    if (r.includes('roxa')) return 'bg-purple-100 text-purple-800 border-purple-300';
    if (r.includes('marrom')) return 'bg-amber-800 text-white border-amber-900';
    if (r.includes('preta')) return 'bg-slate-900 text-white border-black';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fade-in pb-10 flex h-[calc(100vh-6rem)] flex-col relative">
      
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-200 gap-4 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Gestão de Alunos</h2>
          <p className="text-slate-500 mt-1">Acervo central de karatecas e histórico de graduações.</p>
        </div>
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              🔍
            </span>
            <input 
              type="text" 
              placeholder="Buscar aluno..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none text-sm"
            />
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-slate-900 text-white px-5 py-2 rounded-xl font-medium hover:bg-slate-800 transition-colors shadow-sm cursor-pointer whitespace-nowrap"
          >
            + Novo Aluno
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 flex justify-between items-center shrink-0">
          <p>{error}</p>
          <button onClick={loadStudents} className="font-semibold underline">Tentar novamente</button>
        </div>
      )}

      {/* Main Table Content */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm flex-1 overflow-hidden flex flex-col relative">
        
        {loading ? (
          <div className="flex justify-center items-center h-64 flex-1">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-red-600"></div>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-3xl mb-4">🥋</div>
            <h3 className="text-lg font-bold text-slate-800">Nenhum aluno encontrado</h3>
            <p className="text-slate-500 mt-1">Não há alunos que correspondam à sua busca.</p>
          </div>
        ) : (
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase tracking-wider font-semibold text-slate-500">
                  <th className="px-6 py-4">Nome do Aluno</th>
                  <th className="px-6 py-4">Faixa Atual</th>
                  <th className="px-6 py-4 text-center">Certificados</th>
                  <th className="px-6 py-4">Data de Cadastro</th>
                  <th className="px-6 py-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStudents.map((student) => (
                  <tr 
                    key={student.id} 
                    onClick={() => setSelectedStudent(student)}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-9 h-9 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold mr-3 border border-slate-300 shrink-0">
                          {student.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-slate-800 group-hover:text-red-700 transition-colors">
                          {student.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${getRankColor(student.rank)}`}>
                        {student.rank}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-block px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold">
                        {student.certificates.length}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {formatDate(student.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="text-sm font-medium text-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                        Ver Histórico →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* Slide-over Panel */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setSelectedStudent(null)} />
          <div className="absolute inset-y-0 right-0 max-w-md w-full flex">
            <div className="w-full h-full bg-white shadow-2xl flex flex-col animate-slide-left">
              
              {/* Header */}
              <div className="px-6 py-6 border-b border-slate-100 flex justify-between items-start bg-slate-50">
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-xl font-bold border-2 border-red-200">
                    {selectedStudent.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-800">{selectedStudent.name}</h2>
                    <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] uppercase tracking-wider font-bold border ${getRankColor(selectedStudent.rank)}`}>
                      {selectedStudent.rank}
                    </span>
                  </div>
                </div>
                <button onClick={() => setSelectedStudent(null)} className="text-slate-400 hover:text-slate-600 p-2 rounded-full hover:bg-slate-200 transition-colors">
                  ✕
                </button>
              </div>

              {/* Body / Timeline */}
              <div className="flex-1 overflow-y-auto p-6">
                <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6">Linha do Tempo de Certificados</h3>
                
                {selectedStudent.certificates.length === 0 ? (
                  <div className="text-center py-10 bg-slate-50 rounded-xl border border-slate-100 border-dashed">
                    <p className="text-slate-500 text-sm">Nenhum certificado emitido para este aluno.</p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {selectedStudent.certificates.map((cert, index) => (
                      <div key={cert.id} className="relative pl-6 pb-2">
                        {/* Connecting Line */}
                        {index !== selectedStudent.certificates.length - 1 && (
                          <div className="absolute left-[7px] top-7 bottom-[-24px] w-[2px] bg-slate-200"></div>
                        )}
                        {/* Dot */}
                        <div className="absolute left-0 top-1.5 w-4 h-4 rounded-full border-2 border-white bg-red-500 shadow-sm"></div>
                        
                        {/* Content */}
                        <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">
                              {formatDate(cert.issueDate)}
                            </span>
                            <span className="text-xs text-slate-400 font-mono">#{cert.id}</span>
                          </div>
                          <p className="font-bold text-slate-800 text-sm mt-1">Emissão de Certificado Oficial</p>
                          <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                            <p className="flex items-center"><span className="w-5 text-slate-400">👤</span> <span className="font-medium mr-1">Sensei:</span> {cert.shihanName}</p>
                            <p className="flex items-center"><span className="w-5 text-slate-400">🏛️</span> <span className="font-medium mr-1">Associação:</span> {cert.associationName}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Modal de Cadastro */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-slide-up">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-slate-800">Cadastrar Novo Aluno</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handleCreateStudent} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Nome Completo</label>
                  <input
                    type="text"
                    required
                    value={newStudentName}
                    onChange={(e) => setNewStudentName(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all"
                    placeholder="Ex: João da Silva"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Faixa Atual</label>
                  <select
                    value={newStudentRank}
                    onChange={(e) => setNewStudentRank(e.target.value as RankKey)}
                    className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all bg-white"
                  >
                    {ranksList.map(rank => (
                      <option key={rank} value={rank}>{rank}</option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="mt-8 flex space-x-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 px-4 rounded-xl font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newStudentName.trim()}
                  className="flex-1 py-2.5 px-4 rounded-xl font-medium text-white bg-red-600 hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {isSubmitting ? 'Salvando...' : 'Salvar Aluno'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentsPage;
